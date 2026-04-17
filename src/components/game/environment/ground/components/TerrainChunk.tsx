import { startTransition, useEffect, useRef, useState } from 'react'
import { BufferGeometry, Float32BufferAttribute, PlaneGeometry } from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'
import { hashString } from '../../../../../utils/seededRandom.ts'
import {
    buildTerrainChunkKey,
    terrainGeometryCacheRelease,
    terrainGeometryCacheTake,
} from '../functions/terrainGeometryCache.ts'
import { terrainChunkWorkerPool } from '../workers/terrainWorkerPool.ts'
import type { TerrainShapeParams } from '../utils/terrainNoise.ts'

/** Detach released terrain geometry from the mesh before LRU cache (avoids dispose-while-attached). */
const PLACEHOLDER_GEOMETRY = new BufferGeometry()

export type TerrainChunkProps = {
    ix: number
    iz: number
    streamCenterIx: number
    streamCenterIz: number
    chunkSize: number
    segments: number
    shape: TerrainShapeParams
    mapSeed: string
    material: MeshStandardMaterial
    geometryCacheMaxEntries: number
    /** Lower = mesh worker runs sooner when the pool is backed up. */
    meshJobPriority: number
}

function disposeOrphanGeometry(
    chunkSize: number,
    seg: number,
    positions: Float32Array,
) {
    const geo = new PlaneGeometry(chunkSize, chunkSize, seg, seg)
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geo.computeVertexNormals()
    geo.dispose()
}

/** One terrain tile; heights from cache or worker; geometry returned to LRU on unmount. */
export function TerrainChunk({
    ix,
    iz,
    streamCenterIx,
    streamCenterIz,
    chunkSize,
    segments,
    shape,
    mapSeed,
    material,
    geometryCacheMaxEntries,
    meshJobPriority,
}: Readonly<TerrainChunkProps>) {
    const [geometry, setGeometry] = useState<PlaneGeometry | null>(null)
    const geometryRef = useRef<PlaneGeometry | null>(null)
    const meshRef = useRef<Mesh | null>(null)
    const meshJobPriorityRef = useRef(meshJobPriority)
    const streamCenterRef = useRef({ ix: streamCenterIx, iz: streamCenterIz })
    meshJobPriorityRef.current = meshJobPriority
    streamCenterRef.current.ix = streamCenterIx
    streamCenterRef.current.iz = streamCenterIz

    useEffect(() => {
        const seg = Math.max(2, Math.min(320, Math.round(segments)))
        const seedHash = hashString(mapSeed.length > 0 ? mapSeed : 'default')
        const effectKey = buildTerrainChunkKey(seedHash, chunkSize, segments, shape, ix, iz)
        let cancelled = false

        const hit = terrainGeometryCacheTake(effectKey)
        if (hit) {
            geometryRef.current = hit
            startTransition(() => {
                setGeometry(hit)
            })
        } else {
            startTransition(() => {
                setGeometry(null)
            })
            terrainChunkWorkerPool
                .request({
                    priority: meshJobPriorityRef.current,
                    ix,
                    iz,
                    chunkSize,
                    segments,
                    shape,
                    seedHash,
                })
                .then((positions) => {
                    if (cancelled) {
                        disposeOrphanGeometry(chunkSize, seg, positions)
                        return
                    }
                    const geo = new PlaneGeometry(chunkSize, chunkSize, seg, seg)
                    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
                    geo.computeVertexNormals()
                    geometryRef.current = geo
                    setGeometry(geo)
                })
                .catch(() => {
                    /* Unmount or worker failure */
                })
        }

        return () => {
            cancelled = true
            const g = geometryRef.current
            geometryRef.current = null
            // Intentionally read ref at cleanup time so we detach the mesh that last rendered this geometry.
            // eslint-disable-next-line react-hooks/exhaustive-deps -- not a missing dep; teardown snapshot
            const meshAtCleanup = meshRef.current
            if (g && meshAtCleanup?.geometry === g) {
                meshAtCleanup.geometry = PLACEHOLDER_GEOMETRY
            }
            if (g) {
                terrainGeometryCacheRelease(
                    effectKey,
                    g,
                    geometryCacheMaxEntries,
                    ix,
                    iz,
                    streamCenterRef.current.ix,
                    streamCenterRef.current.iz,
                )
            }
        }
    }, [ix, iz, chunkSize, segments, shape, mapSeed, geometryCacheMaxEntries])

    if (!geometry) {
        return null
    }

    const cx = ix * chunkSize + chunkSize / 2
    const cz = iz * chunkSize + chunkSize / 2

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            position={[cx, 0, cz]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
        />
    )
}
