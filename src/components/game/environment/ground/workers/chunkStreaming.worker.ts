/// <reference lib="webworker" />

import { computeViewDirectedTiles, tileSetSignature } from '../functions/chunkStreamingMath.ts'
import type { ChunkStreamingWorkerRequest, ChunkStreamingWorkerResponse } from './chunkStreamingProtocol.ts'

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope

workerScope.onmessage = (e: MessageEvent<ChunkStreamingWorkerRequest>) => {
    const { id, px, pz, chunkSize, r, fx, fz } = e.data
    try {
        const tiles = computeViewDirectedTiles(px, pz, chunkSize, r, fx, fz)
        const sig = tileSetSignature(tiles)
        const msg: ChunkStreamingWorkerResponse = { id, sig, tiles }
        workerScope.postMessage(msg)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const msg: ChunkStreamingWorkerResponse = { id, error: message }
        workerScope.postMessage(msg)
    }
}
