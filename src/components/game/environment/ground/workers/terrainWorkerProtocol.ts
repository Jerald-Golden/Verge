import type { TerrainShapeParams } from '../utils/terrainNoise.ts'

export type TerrainChunkWorkerRequest = {
    id: number
    /** Lower = run sooner in the mesh worker pool queue (main thread only; worker ignores). */
    priority: number
    ix: number
    iz: number
    chunkSize: number
    segments: number
    shape: TerrainShapeParams
    seedHash: number
}

export type TerrainChunkWorkerResponse =
    | { id: number; positions: Float32Array }
    | { id: number; error: string }

export type TerrainChunkJobPayload = Omit<TerrainChunkWorkerRequest, 'id'>
