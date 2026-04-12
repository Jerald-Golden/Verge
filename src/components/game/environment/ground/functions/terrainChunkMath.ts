import { createNoise2D } from 'simplex-noise'
import { mulberry32 } from '../../../../../utils/seededRandom.ts'
import type { TerrainShapeParams } from '../utils/terrainNoise.ts'
import { sampleTerrainHeight } from '../utils/terrainNoise.ts'

/**
 * Vertex layout matches `THREE.PlaneGeometry(width, height, seg, seg)`:
 * Three stores each vertex as `(x, -y, 0)` with `y = iy * segment_height - height_half` (see three.js PlaneGeometry).
 * Height noise must use the same world XZ mapping as the old `getX` / `getY` loop: worldZ = cz + y (since buffer Y is -y).
 */
export function buildChunkPositionsFloat32(
    ix: number,
    iz: number,
    chunkSize: number,
    segments: number,
    shape: TerrainShapeParams,
    seedHash: number,
): Float32Array {
    const seg = Math.max(2, Math.min(320, Math.round(segments)))
    const noise2D = createNoise2D(mulberry32(seedHash))
    const cx = ix * chunkSize + chunkSize / 2
    const cz = iz * chunkSize + chunkSize / 2

    const sw = chunkSize / seg
    const sh = chunkSize / seg
    const count = (seg + 1) * (seg + 1)
    const out = new Float32Array(count * 3)

    let idx = 0
    for (let iy = 0; iy <= seg; iy++) {
        const yGrid = iy * sh - chunkSize / 2
        for (let jx = 0; jx <= seg; jx++) {
            const lx = jx * sw - chunkSize / 2
            const worldX = cx + lx
            const worldZ = cz + yGrid
            const h = sampleTerrainHeight(noise2D, worldX, worldZ, shape)
            out[idx++] = lx
            out[idx++] = -yGrid
            out[idx++] = h
        }
    }

    return out
}
