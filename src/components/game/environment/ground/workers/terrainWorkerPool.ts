import type { TerrainChunkJobPayload, TerrainChunkWorkerResponse } from './terrainWorkerProtocol.ts'

const POOL_SIZE =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? Math.min(4, Math.max(1, navigator.hardwareConcurrency))
        : 2

type Pending = {
    resolve: (positions: Float32Array) => void
    reject: (err: Error) => void
}

type QueuedJob = TerrainChunkJobPayload & { id: number }

function enqueueByPriority(queue: QueuedJob[], job: QueuedJob) {
    let i = 0
    while (
        i < queue.length &&
        (queue[i].priority < job.priority ||
            (queue[i].priority === job.priority && queue[i].id < job.id))
    ) {
        i++
    }
    queue.splice(i, 0, job)
}

function createWorker(): Worker {
    return new Worker(new URL('./terrainChunk.worker.ts', import.meta.url).href, {
        type: 'module',
    })
}

/**
 * Pool of workers + queue: chunk mesh generation runs off the main thread; stale results are ignored by callers via cancellation.
 */
export class TerrainChunkWorkerPool {
    private readonly workers: Worker[] = []
    private readonly idle: Worker[] = []
    private readonly pending = new Map<number, Pending>()
    private readonly busyJobId = new Map<Worker, number>()
    private readonly queue: QueuedJob[] = []
    private nextId = 0

    constructor() {
        for (let i = 0; i < POOL_SIZE; i++) {
            const w = this.attachHandlers(createWorker())
            this.workers.push(w)
            this.idle.push(w)
        }
    }

    private attachHandlers(worker: Worker): Worker {
        worker.onmessage = (ev: MessageEvent<TerrainChunkWorkerResponse>) => this.onMessage(worker, ev)
        worker.onerror = (ev) => this.onError(worker, ev)
        return worker
    }

    request(payload: TerrainChunkJobPayload): Promise<Float32Array> {
        const id = ++this.nextId
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject })
            const job: QueuedJob = { id, ...payload }
            const worker = this.idle.pop()
            if (worker) {
                this.dispatch(worker, job)
            } else {
                enqueueByPriority(this.queue, job)
            }
        })
    }

    private dispatch(worker: Worker, job: QueuedJob) {
        this.busyJobId.set(worker, job.id)
        worker.postMessage(job)
    }

    private finishWorker(worker: Worker) {
        this.busyJobId.delete(worker)
        const next = this.queue.shift()
        if (next) {
            this.dispatch(worker, next)
        } else {
            this.idle.push(worker)
        }
    }

    private onMessage(worker: Worker, ev: MessageEvent<TerrainChunkWorkerResponse>) {
        const data = ev.data
        const id = data.id
        const job = this.pending.get(id)
        if (!job) {
            this.finishWorker(worker)
            return
        }
        this.pending.delete(id)

        if ('error' in data) {
            job.reject(new Error(data.error))
        } else {
            job.resolve(data.positions)
        }

        this.finishWorker(worker)
    }

    private onError(worker: Worker, ev: ErrorEvent) {
        console.error('[TerrainChunkWorker]', ev.message)
        const id = this.busyJobId.get(worker)
        this.busyJobId.delete(worker)
        if (id !== undefined) {
            const job = this.pending.get(id)
            if (job) {
                this.pending.delete(id)
                job.reject(new Error(ev.message || 'Worker error'))
            }
        }

        try {
            worker.terminate()
        } catch {
            /* ignore */
        }

        const idx = this.workers.indexOf(worker)
        const replacement = this.attachHandlers(createWorker())
        if (idx !== -1) {
            this.workers[idx] = replacement
        }

        const next = this.queue.shift()
        if (next) {
            this.dispatch(replacement, next)
        } else {
            this.idle.push(replacement)
        }
    }
}

export const terrainChunkWorkerPool = new TerrainChunkWorkerPool()
