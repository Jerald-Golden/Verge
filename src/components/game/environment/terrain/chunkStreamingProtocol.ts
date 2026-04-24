import type { ChunkTile } from './chunkStreamingMath.ts'

export type ChunkStreamingWorkerRequest = {
    id: number
    px: number
    pz: number
    chunkSize: number
    r: number
    fx: number
    fz: number
}

export type ChunkStreamingWorkerResponse =
    | { id: number; sig: string; tiles: ChunkTile[] }
    | { id: number; error: string }
