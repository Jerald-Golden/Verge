import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { TerrainChunk } from './components/TerrainChunk.tsx'
import type { TerrainShapeParams } from './utils/terrainNoise.ts'
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

function chunkIndices(centerIx: number, centerIz: number, radius: number): { ix: number; iz: number }[] {
    const out: { ix: number; iz: number }[] = []
    for (let di = -radius; di <= radius; di++) {
        for (let dj = -radius; dj <= radius; dj++) {
            out.push({ ix: centerIx + di, iz: centerIz + dj })
        }
    }
    return out
}

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
    const [center, setCenter] = useState({ ix: 0, iz: 0 })
    const lastChunk = useRef({ ix: 0, iz: 0 })

    useFrame(() => {
        const ix = Math.floor(camera.position.x / chunkSize)
        const iz = Math.floor(camera.position.z / chunkSize)
        if (lastChunk.current.ix !== ix || lastChunk.current.iz !== iz) {
            lastChunk.current = { ix, iz }
            setCenter({ ix, iz })
        }
    })

    const tiles = useMemo(
        () => chunkIndices(center.ix, center.iz, r),
        [center.ix, center.iz, r],
    )

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
                    wireframe={wireframe}
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
