import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MeshStandardMaterial, Vector3 } from 'three'
import { TerrainChunk } from './components/TerrainChunk.tsx'
import { computeViewDirectedTiles } from './functions/chunkStreamingMath.ts'
import { terrainGeometryCacheClear } from './functions/terrainGeometryCache.ts'
import type { TerrainShapeParams } from './utils/terrainNoise.ts'
import { createChunkStreamingWorker } from './workers/chunkStreamingWorkerBridge.ts'
import { useControls } from 'leva'

export type GroundTerrainProps = {
    chunkSize: number
    gridRadius: number
    segments: number
    amplitude: number
    macroWavelengthM: number
    detail: number
    octaves: number
    persistence: number
    lacunarity: number
    wireframe: boolean
}

export type GroundProps = {
    mapSeed: string
}

/** Recompute tile set when yaw changes by about this much (radians). */
const VIEW_DIR_DOT_THRESHOLD = Math.cos((10 * Math.PI) / 180)

const _worldDir = new Vector3()

/** Follows the active camera and swaps chunk tiles as the view moves (infinite-style terrain). */
function StreamingTerrain({
    mapSeed,
    chunkSize,
    gridRadius,
    segments,
    amplitude,
    macroWavelengthM,
    detail,
    octaves,
    persistence,
    lacunarity,
    wireframe,
}: Readonly<{ mapSeed: string } & GroundTerrainProps>) {
    const camera = useThree((s) => s.camera)

    const shape: TerrainShapeParams = useMemo(
        () => ({
            macroWavelengthM,
            detail,
            octaves,
            persistence,
            lacunarity,
            amplitude,
        }),
        [macroWavelengthM, detail, octaves, persistence, lacunarity, amplitude],
    )

    const r = Math.max(1, Math.min(12, Math.round(gridRadius)))
    const [tiles, setTiles] = useState(() => computeViewDirectedTiles(0, 0, chunkSize, r, 0, 1))
    const lastStream = useRef({
        ix: 0,
        iz: 0,
        fx: 0,
        fz: 1,
        px: 0,
        pz: 0,
        sig: '',
    })

    const workerApiRef = useRef<ReturnType<typeof createChunkStreamingWorker> | null>(null)
    const lastRequestIdRef = useRef(0)

    useEffect(() => {
        const api = createChunkStreamingWorker((data) => {
            if ('error' in data) {
                return
            }
            if (data.id !== lastRequestIdRef.current) {
                return
            }
            if (data.sig === lastStream.current.sig) {
                return
            }
            lastStream.current.sig = data.sig
            setTiles(data.tiles)
        })
        workerApiRef.current = api

        const px = camera.position.x
        const pz = camera.position.z
        lastStream.current.px = px
        lastStream.current.pz = pz
        lastStream.current.ix = Math.floor(px / chunkSize)
        lastStream.current.iz = Math.floor(pz / chunkSize)

        const id = ++lastRequestIdRef.current
        api.post({
            id,
            px,
            pz,
            chunkSize,
            r,
            fx: lastStream.current.fx,
            fz: lastStream.current.fz,
        })

        return () => {
            workerApiRef.current = null
            api.dispose()
        }
    }, [camera, chunkSize, r])

    useEffect(() => {
        terrainGeometryCacheClear()
    }, [mapSeed, chunkSize, segments, macroWavelengthM, detail, octaves, persistence, lacunarity, amplitude])

    const terrainMaterial = useMemo(
        () =>
            new MeshStandardMaterial({
                color: '#a6b1e1',
                roughness: 0.88,
                metalness: 0.06,
                wireframe,
            }),
        [wireframe],
    )

    useEffect(() => {
        return () => {
            terrainMaterial.dispose()
        }
    }, [terrainMaterial])

    const geometryCacheMaxEntries = useMemo(
        () => Math.min(2500, (2 * (r + Math.ceil(r * 0.5) + 4) + 1) ** 2 * 3),
        [r],
    )

    const postStreamRequest = (px: number, pz: number, fx: number, fz: number) => {
        const api = workerApiRef.current
        if (!api) {
            return
        }
        const id = ++lastRequestIdRef.current
        api.post({ id, px, pz, chunkSize, r, fx, fz })
    }

    useFrame(() => {
        const px = camera.position.x
        const pz = camera.position.z

        camera.getWorldDirection(_worldDir)
        _worldDir.y = 0
        let fx = _worldDir.x
        let fz = _worldDir.z
        if (fx * fx + fz * fz < 1e-10) {
            fx = lastStream.current.fx
            fz = lastStream.current.fz
        } else {
            const n = 1 / Math.hypot(fx, fz)
            fx *= n
            fz *= n
        }

        const ix = Math.floor(px / chunkSize)
        const iz = Math.floor(pz / chunkSize)

        const cellChanged = ix !== lastStream.current.ix || iz !== lastStream.current.iz
        const dirDot = fx * lastStream.current.fx + fz * lastStream.current.fz
        const dirChanged = dirDot < VIEW_DIR_DOT_THRESHOLD
        const moved =
            (px - lastStream.current.px) ** 2 + (pz - lastStream.current.pz) ** 2 >
            (chunkSize * 0.12) ** 2

        if (!cellChanged && !dirChanged && !moved) {
            return
        }

        lastStream.current.ix = ix
        lastStream.current.iz = iz
        lastStream.current.fx = fx
        lastStream.current.fz = fz
        lastStream.current.px = px
        lastStream.current.pz = pz

        postStreamRequest(px, pz, fx, fz)
    })

    return (
        <>
            {tiles.map(({ ix, iz }) => (
                <TerrainChunk
                    key={`${ix},${iz}`}
                    ix={ix}
                    iz={iz}
                    chunkSize={chunkSize}
                    segments={segments}
                    shape={shape}
                    mapSeed={mapSeed}
                    material={terrainMaterial}
                    geometryCacheMaxEntries={geometryCacheMaxEntries}
                />
            ))}
        </>
    )
}

export function Ground({ mapSeed }: Readonly<GroundProps>) {
    const terrain = useControls('Terrain', {
        chunkSize: { value: 750, min: 48, max: 1200, step: 4 },
        gridRadius: { value: 10, min: 1, max: 12, step: 1 },
        segments: { value: 128, min: 8, max: 320, step: 1 },
        amplitude: { value: 120, min: 0, max: 200, step: 0.5 },
        macroWavelengthM: { value: 3704, min: 120, max: 4000, step: 10 },
        detail: { value: 4, min: 0.1, max: 4, step: 0.05 },
        octaves: { value: 7, min: 1, max: 8, step: 1 },
        persistence: { value: 0.05, min: 0.05, max: 0.99, step: 0.01 },
        lacunarity: { value: 2.9, min: 1.05, max: 4.5, step: 0.05 },
        wireframe: false,
    })

    return <StreamingTerrain mapSeed={mapSeed} {...terrain} />
}
