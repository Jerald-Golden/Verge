import { Cache, type PlaneGeometry } from 'three'
import type { TerrainShapeParams } from '../utils/terrainNoise.ts'

/** Isolated from URL-based loader keys (`FileLoader`, etc.). */
const CACHE_PREFIX = 'verge/terrain/'

function cacheKeyForTerrain(key: string): string {
    return CACHE_PREFIX + key
}

/** Same segment clamp as worker / mesh (`terrainChunkMath` / `TerrainChunk`). */
function clampSegments(segments: number): number {
    return Math.max(2, Math.min(320, Math.round(segments)))
}

/**
 * Stable key for cold-cache lookup; rounded floats avoid unbounded Leva key space.
 */
export function buildTerrainChunkKey(
    seedHash: number,
    chunkSize: number,
    segments: number,
    shape: TerrainShapeParams,
    ix: number,
    iz: number,
): string {
    const seg = clampSegments(segments)
    const parts = [
        seedHash,
        chunkSize,
        seg,
        Math.round(shape.macroWavelengthM),
        Math.round(shape.detail * 1e4) / 1e4,
        shape.octaves,
        Math.round(shape.persistence * 1e4) / 1e4,
        Math.round(shape.lacunarity * 1e3) / 1e3,
        Math.round(shape.amplitude * 1e2) / 1e2,
        ix,
        iz,
    ]
    return parts.join(':')
}

/**
 * LRU order for cold entries stored in `THREE.Cache` (Cache has no eviction or dispose hooks).
 * Oldest full cache keys are at the front.
 */
const coldKeyOrder: string[] = []
const coldKeyCoords = new Map<string, { ix: number; iz: number }>()

function removeKeyFromOrder(fullKey: string) {
    const i = coldKeyOrder.indexOf(fullKey)
    if (i !== -1) {
        coldKeyOrder.splice(i, 1)
    }
}

function touchKeyOrder(fullKey: string) {
    removeKeyFromOrder(fullKey)
    coldKeyOrder.push(fullKey)
}

function ensureCacheEnabled() {
    Cache.enabled = true
}

function getFarthestCacheIndex(centerIx: number, centerIz: number): number {
    let farthestIndex = -1
    let farthestDistSq = -1
    for (let i = 0; i < coldKeyOrder.length; i += 1) {
        const candidateKey = coldKeyOrder[i]
        const coords = coldKeyCoords.get(candidateKey)
        if (!coords) {
            continue
        }
        const dx = coords.ix - centerIx
        const dz = coords.iz - centerIz
        const distSq = dx * dx + dz * dz
        if (distSq > farthestDistSq) {
            farthestDistSq = distSq
            farthestIndex = i
        }
    }
    return Math.max(farthestIndex, 0)
}

/**
 * Remove and return cold-stored geometry from `THREE.Cache`, or undefined.
 */
export function terrainGeometryCacheTake(logicalKey: string): PlaneGeometry | undefined {
    ensureCacheEnabled()
    const fullKey = cacheKeyForTerrain(logicalKey)
    const g = Cache.get(fullKey) as PlaneGeometry | undefined
    if (g === undefined) {
        return undefined
    }
    Cache.remove(fullKey)
    removeKeyFromOrder(fullKey)
    coldKeyCoords.delete(fullKey)
    return g
}

/**
 * Store geometry in `THREE.Cache` and enforce LRU; evicted entries are `dispose()`d.
 */
export function terrainGeometryCacheRelease(
    logicalKey: string,
    geometry: PlaneGeometry,
    maxEntries: number,
    chunkIx: number,
    chunkIz: number,
    centerIx: number,
    centerIz: number,
) {
    ensureCacheEnabled()
    const fullKey = cacheKeyForTerrain(logicalKey)

    if (maxEntries <= 0) {
        geometry.dispose()
        return
    }

    const existing = Cache.get(fullKey) as PlaneGeometry | undefined
    if (existing !== undefined && existing !== geometry) {
        existing.dispose()
    }
    Cache.remove(fullKey)
    // `Cache.files` is shared with loaders; values are untyped at runtime (we store `PlaneGeometry` only under `CACHE_PREFIX`).
    Cache.add(fullKey, geometry as never)
    touchKeyOrder(fullKey)
    coldKeyCoords.set(fullKey, { ix: chunkIx, iz: chunkIz })

    while (coldKeyOrder.length > maxEntries) {
        const farthestIndex = getFarthestCacheIndex(centerIx, centerIz)
        const [evictFullKey] = coldKeyOrder.splice(farthestIndex, 1)
        if (evictFullKey === undefined) {
            break
        }
        const evicted = Cache.get(evictFullKey) as PlaneGeometry | undefined
        Cache.remove(evictFullKey)
        coldKeyCoords.delete(evictFullKey)
        evicted?.dispose()
    }
}

/** Dispose all terrain entries under `CACHE_PREFIX` in `THREE.Cache` (does not call global `Cache.clear()`). */
export function terrainGeometryCacheClear() {
    const files = Cache.files as Record<string, unknown>
    for (const fullKey of Object.keys(files)) {
        if (!fullKey.startsWith(CACHE_PREFIX)) {
            continue
        }
        const g = files[fullKey]
        Cache.remove(fullKey)
        if (g && typeof (g as PlaneGeometry).dispose === 'function') {
            ;(g as PlaneGeometry).dispose()
        }
        coldKeyCoords.delete(fullKey)
    }
    coldKeyOrder.length = 0
    coldKeyCoords.clear()
}
