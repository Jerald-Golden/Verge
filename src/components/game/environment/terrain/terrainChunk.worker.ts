/// <reference lib="webworker" />

import { buildChunkPositionsFloat32 } from './terrainChunkMath.ts'
import type {
    TerrainChunkWorkerRequest,
    TerrainChunkWorkerResponse,
} from './terrainWorkerProtocol.ts'

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope

workerScope.onmessage = (e: MessageEvent<TerrainChunkWorkerRequest>) => {
    const { id, ix, iz, chunkSize, segments, shape, seedHash } = e.data
    try {
        const positions = buildChunkPositionsFloat32(ix, iz, chunkSize, segments, shape, seedHash)
        const msg: TerrainChunkWorkerResponse = { id, positions }
        workerScope.postMessage(msg, [positions.buffer])
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const msg: TerrainChunkWorkerResponse = { id, error: message }
        workerScope.postMessage(msg)
    }
}
