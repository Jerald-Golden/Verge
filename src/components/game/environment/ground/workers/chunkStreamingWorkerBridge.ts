import type { ChunkStreamingWorkerRequest, ChunkStreamingWorkerResponse } from './chunkStreamingProtocol.ts'

export function createChunkStreamingWorker(
    onMessage: (data: ChunkStreamingWorkerResponse) => void,
): {
    post: (req: ChunkStreamingWorkerRequest) => void
    dispose: () => void
} {
    const w = new Worker(new URL('./chunkStreaming.worker.ts', import.meta.url).href, {
        type: 'module',
    })
    w.onmessage = (ev: MessageEvent<ChunkStreamingWorkerResponse>) => {
        onMessage(ev.data)
    }
    w.onerror = (ev) => {
        console.error('[ChunkStreamingWorker]', ev.message)
    }
    return {
        post: (req) => {
            w.postMessage(req)
        },
        dispose: () => {
            w.terminate()
        },
    }
}
