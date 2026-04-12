import { useEffect, useRef, useState } from 'react'
import { Float32BufferAttribute, PlaneGeometry } from 'three'
import { hashString } from '../../../../../utils/seededRandom.ts'
import { terrainChunkWorkerPool } from '../workers/terrainWorkerPool.ts'
import type { TerrainShapeParams } from '../utils/terrainNoise.ts'

export type TerrainChunkProps = {
    ix: number
    iz: number
    chunkSize: number
    segments: number
    shape: TerrainShapeParams
    mapSeed: string
    wireframe: boolean
}

/** One terrain tile; heights built on a worker and applied as positions (same layout as PlaneGeometry). */
export function TerrainChunk({
    ix,
    iz,
    chunkSize,
    segments,
    shape,
    mapSeed,
    wireframe,
}: Readonly<TerrainChunkProps>) {
    const [geometry, setGeometry] = useState<PlaneGeometry | null>(null)
    const geometryRef = useRef<PlaneGeometry | null>(null)

    useEffect(() => {
        return () => {
            geometryRef.current?.dispose()
            geometryRef.current = null
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        const seg = Math.max(2, Math.min(320, Math.round(segments)))
        const seedHash = hashString(mapSeed.length > 0 ? mapSeed : 'default')

        terrainChunkWorkerPool
            .request({ ix, iz, chunkSize, segments, shape, seedHash })
            .then((positions) => {
                if (cancelled) {
                    return
                }
                setGeometry((prev) => {
                    prev?.dispose()
                    const geo = new PlaneGeometry(chunkSize, chunkSize, seg, seg)
                    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
                    geo.computeVertexNormals()
                    geometryRef.current = geo
                    return geo
                })
            })
            .catch(() => {
                /* Unmount or worker failure; ignore unless we want a fallback mesh */
            })

        return () => {
            cancelled = true
        }
    }, [ix, iz, chunkSize, segments, shape, mapSeed])

    if (!geometry) {
        return null
    }

    const cx = ix * chunkSize + chunkSize / 2
    const cz = iz * chunkSize + chunkSize / 2

    return (
        <mesh geometry={geometry} position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <meshStandardMaterial
                color="#a6b1e1"
                roughness={0.88}
                metalness={0.06}
                wireframe={wireframe}
            />
        </mesh>
    )
}
