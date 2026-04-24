import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { useControls } from 'leva'
import type { ChunkTile } from '../terrain/chunkStreamingMath.ts'
import type { TerrainShapeParams } from '../terrain/terrainNoise.ts'
import { getVegetationAssets } from './vegetationAssetCache.ts'
import type { VegetationAssets } from './vegetationAssetCache.ts'
import { VegetationChunk } from './VegetationChunk.tsx'
import { Vector3 } from 'three'
import type { BufferGeometry, Material } from 'three'

type VegetationLayerProps = {
    mapSeed: string
    chunkSize: number
    shape: TerrainShapeParams
    tiles: ChunkTile[]
}

type SharedMeshRef = { key: string; geometry: BufferGeometry; material: Material | Material[] }
const RETRY_BASE_DELAY_MS = 600
const _tmpTarget = new Vector3()
const _tmpForward = new Vector3()

type ViewSample = {
    camX: number
    camZ: number
    targetX: number
    targetZ: number
}

function getDistanceToSegment2D(
    px: number,
    pz: number,
    ax: number,
    az: number,
    bx: number,
    bz: number,
): number {
    const abx = bx - ax
    const abz = bz - az
    const apx = px - ax
    const apz = pz - az
    const abLenSq = abx * abx + abz * abz
    if (abLenSq < 1e-8) {
        return Math.hypot(apx, apz)
    }
    const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq))
    const qx = ax + abx * t
    const qz = az + abz * t
    return Math.hypot(px - qx, pz - qz)
}

function getViewportDistance2D(px: number, pz: number, view: ViewSample): number {
    const camDistance = Math.hypot(px - view.camX, pz - view.camZ)
    const targetDistance = Math.hypot(px - view.targetX, pz - view.targetZ)
    const segmentDistance = getDistanceToSegment2D(
        px,
        pz,
        view.camX,
        view.camZ,
        view.targetX,
        view.targetZ,
    )
    return Math.min(camDistance, targetDistance, segmentDistance)
}

export function VegetationLayer({
    mapSeed,
    chunkSize,
    shape,
    tiles,
}: Readonly<VegetationLayerProps>) {
    const camera = useThree((state) => state.camera)
    const controls = useThree((state) => state.controls)
    const initialView = useMemo<ViewSample>(() => {
        camera.getWorldDirection(_tmpForward)
        const fallbackDistance = Math.max(30, chunkSize * 0.2)
        return {
            camX: camera.position.x,
            camZ: camera.position.z,
            targetX: camera.position.x + _tmpForward.x * fallbackDistance,
            targetZ: camera.position.z + _tmpForward.z * fallbackDistance,
        }
    }, [camera, chunkSize])
    const [assets, setAssets] = useState<VegetationAssets | null>(null)
    const [loadAttempt, setLoadAttempt] = useState(0)
    const [loadViewSample, setLoadViewSample] = useState<ViewSample>(initialView)
    const [lodViewSample, setLodViewSample] = useState<ViewSample>(initialView)

    const scheduleRetry = (attempt: number) => {
        globalThis.setTimeout(
            () => {
                setLoadAttempt((value) => value + 1)
            },
            RETRY_BASE_DELAY_MS + attempt * 400,
        )
    }

    const vegetation = useControls(
        'Vegetation',
        {
            enabled: true,
            showLodHelpers: false,
            densityPerKm2: { value: 1250, min: 100, max: 6000, step: 25 },
            maxSlopeDeg: { value: 28, min: 4, max: 50, step: 1 },
            minHeight: { value: -120, min: -500, max: 500, step: 1 },
            maxHeight: { value: 220, min: -500, max: 500, step: 1 },
            loadDistance: { value: 650, min: 100, max: 4000, step: 10 },
            drawDistance: { value: 420, min: 50, max: 4000, step: 10 },
            loadChangeDistance: { value: 10, min: 1, max: 200, step: 1 },
            lodUpdateDistance: { value: 2, min: 0.25, max: 100, step: 0.25 },
            lodStepDistance: { value: 50, min: 1, max: 200, step: 1 },
            maxLoadRetries: { value: 3, min: 0, max: 10, step: 1 },
        },
        { collapsed: true },
    )

    useEffect(() => {
        let mounted = true
        getVegetationAssets()
            .then((loaded) => {
                if (mounted) {
                    setAssets(loaded)
                }
            })
            .catch(() => {
                if (mounted) {
                    if (loadAttempt < vegetation.maxLoadRetries) {
                        scheduleRetry(loadAttempt)
                    }
                }
            })
        return () => {
            mounted = false
        }
    }, [loadAttempt, vegetation.maxLoadRetries])

    useFrame(() => {
        let targetX: number
        let targetZ: number
        if (controls && typeof controls === 'object' && 'getTarget' in controls) {
            ;(controls as { getTarget: (out: Vector3) => Vector3 }).getTarget(_tmpTarget)
            targetX = _tmpTarget.x
            targetZ = _tmpTarget.z
        } else {
            camera.getWorldDirection(_tmpForward)
            const fallbackDistance = Math.max(30, chunkSize * 0.2)
            targetX = camera.position.x + _tmpForward.x * fallbackDistance
            targetZ = camera.position.z + _tmpForward.z * fallbackDistance
        }

        const dCamLoadX = camera.position.x - loadViewSample.camX
        const dCamLoadZ = camera.position.z - loadViewSample.camZ
        const dTargetLoadX = targetX - loadViewSample.targetX
        const dTargetLoadZ = targetZ - loadViewSample.targetZ
        const loadChanged =
            dCamLoadX * dCamLoadX + dCamLoadZ * dCamLoadZ >= vegetation.loadChangeDistance ** 2 ||
            dTargetLoadX * dTargetLoadX + dTargetLoadZ * dTargetLoadZ >=
                vegetation.loadChangeDistance ** 2
        if (loadChanged) {
            setLoadViewSample({
                camX: camera.position.x,
                camZ: camera.position.z,
                targetX,
                targetZ,
            })
        }

        const dCamLodX = camera.position.x - lodViewSample.camX
        const dCamLodZ = camera.position.z - lodViewSample.camZ
        const dTargetLodX = targetX - lodViewSample.targetX
        const dTargetLodZ = targetZ - lodViewSample.targetZ
        const lodChanged =
            dCamLodX * dCamLodX + dCamLodZ * dCamLodZ >= vegetation.lodUpdateDistance ** 2 ||
            dTargetLodX * dTargetLodX + dTargetLodZ * dTargetLodZ >=
                vegetation.lodUpdateDistance ** 2
        if (lodChanged) {
            setLodViewSample({
                camX: camera.position.x,
                camZ: camera.position.z,
                targetX,
                targetZ,
            })
        }
    })

    const meshesBySpeciesLod = useMemo<Map<string, SharedMeshRef[]>>(() => {
        if (!assets) {
            return new Map()
        }
        const map = new Map<string, SharedMeshRef[]>()
        for (const mesh of assets.meshes) {
            const key = `${mesh.speciesIndex}:${mesh.lod}`
            const arr = map.get(key)
            const entry = {
                key: mesh.key,
                geometry: mesh.geometry,
                material: mesh.material,
            }
            if (arr) {
                arr.push(entry)
            } else {
                map.set(key, [entry])
            }
        }
        return map
    }, [assets])

    const visibleTiles = useMemo(() => {
        if (!vegetation.enabled || !assets) {
            return []
        }
        return tiles
            .map((tile) => {
                const cx = tile.ix * chunkSize + chunkSize / 2
                const cz = tile.iz * chunkSize + chunkSize / 2
                const distance = getViewportDistance2D(cx, cz, loadViewSample)
                const chunkRadius = Math.sqrt(2) * chunkSize * 0.5
                const isInLoadRange = distance - chunkRadius <= vegetation.loadDistance
                const isInDrawRange = distance - chunkRadius <= vegetation.drawDistance
                return {
                    ...tile,
                    isInLoadRange,
                    isInDrawRange,
                }
            })
            .filter((tile) => tile.isInLoadRange)
    }, [
        assets,
        tiles,
        vegetation.enabled,
        vegetation.loadDistance,
        vegetation.drawDistance,
        chunkSize,
        loadViewSample,
    ])

    if (!assets || !vegetation.enabled) {
        return null
    }

    return (
        <group>
            {visibleTiles.map((tile) => (
                <VegetationChunk
                    key={`veg:${tile.ix},${tile.iz}`}
                    ix={tile.ix}
                    iz={tile.iz}
                    chunkSize={chunkSize}
                    mapSeed={mapSeed}
                    shape={shape}
                    isInDrawRange={tile.isInDrawRange}
                    cameraX={lodViewSample.camX}
                    cameraZ={lodViewSample.camZ}
                    targetX={lodViewSample.targetX}
                    targetZ={lodViewSample.targetZ}
                    lodStepDistance={vegetation.lodStepDistance}
                    meshesBySpeciesLod={meshesBySpeciesLod}
                    speciesCount={assets.speciesCount}
                    showLodHelpers={vegetation.showLodHelpers}
                    densityPerKm2={vegetation.densityPerKm2}
                    maxSlopeDeg={vegetation.maxSlopeDeg}
                    minHeight={Math.min(vegetation.minHeight, vegetation.maxHeight)}
                    maxHeight={Math.max(vegetation.minHeight, vegetation.maxHeight)}
                />
            ))}
        </group>
    )
}
