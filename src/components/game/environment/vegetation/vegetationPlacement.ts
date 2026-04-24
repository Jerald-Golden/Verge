import { createNoise2D } from 'simplex-noise'
import { hashString, mulberry32 } from '../../../../utils/seededRandom.ts'
import type { TerrainShapeParams } from '../terrain/terrainNoise.ts'
import { sampleTerrainHeight } from '../terrain/terrainNoise.ts'

export type VegetationPlacementConfig = {
    ix: number
    iz: number
    chunkSize: number
    mapSeed: string
    shape: TerrainShapeParams
    speciesCount: number
    densityPerKm2: number
    maxSlopeDeg: number
    minHeight: number
    maxHeight: number
}

export type VegetationInstance = {
    x: number
    y: number
    z: number
    rotationY: number
    scale: number
    speciesIndex: number
}

const MAX_CACHE_ENTRIES = 600
const placementCache = new Map<string, VegetationInstance[]>()

function getCacheKey(config: VegetationPlacementConfig): string {
    const {
        ix,
        iz,
        chunkSize,
        mapSeed,
        speciesCount,
        densityPerKm2,
        maxSlopeDeg,
        minHeight,
        maxHeight,
        shape,
    } = config
    return [
        mapSeed,
        ix,
        iz,
        chunkSize,
        speciesCount,
        densityPerKm2,
        maxSlopeDeg,
        minHeight,
        maxHeight,
        shape.amplitude,
        shape.detail,
        shape.lacunarity,
        shape.macroWavelengthM,
        shape.octaves,
        shape.persistence,
    ].join(':')
}

function getSlopeDeg(
    noise2D: (x: number, y: number) => number,
    x: number,
    z: number,
    shape: TerrainShapeParams,
): number {
    const delta = 2
    const hL = sampleTerrainHeight(noise2D, x - delta, z, shape)
    const hR = sampleTerrainHeight(noise2D, x + delta, z, shape)
    const hD = sampleTerrainHeight(noise2D, x, z - delta, shape)
    const hU = sampleTerrainHeight(noise2D, x, z + delta, shape)
    const dx = (hR - hL) / (2 * delta)
    const dz = (hU - hD) / (2 * delta)
    const gradient = Math.hypot(dx, dz)
    return Math.atan(gradient) * (180 / Math.PI)
}

function getSpeciesScale(speciesIndex: number): { min: number; max: number } {
    const band = speciesIndex % 4
    if (band === 0) {
        return { min: 1.1, max: 1.35 }
    }
    if (band === 1) {
        return { min: 0.95, max: 1.15 }
    }
    if (band === 2) {
        return { min: 0.72, max: 0.95 }
    }
    return { min: 0.5, max: 0.72 }
}

export function buildVegetationPlacements(config: VegetationPlacementConfig): VegetationInstance[] {
    const cacheKey = getCacheKey(config)
    const cached = placementCache.get(cacheKey)
    if (cached) {
        return cached
    }

    const {
        ix,
        iz,
        chunkSize,
        mapSeed,
        shape,
        speciesCount,
        densityPerKm2,
        maxSlopeDeg,
        minHeight,
        maxHeight,
    } = config
    if (speciesCount <= 0 || densityPerKm2 <= 0) {
        return []
    }

    const seedHash = hashString(mapSeed.length > 0 ? mapSeed : 'default')
    const chunkHash = hashString(`${seedHash}:${ix}:${iz}:vegetation`)
    const rng = mulberry32(chunkHash)
    const noise2D = createNoise2D(mulberry32(seedHash))
    const areaKm2 = (chunkSize * chunkSize) / 1_000_000
    const targetCount = Math.max(0, Math.round(areaKm2 * densityPerKm2))
    const tries = Math.max(16, targetCount * 3)

    const out: VegetationInstance[] = []
    const minX = ix * chunkSize
    const minZ = iz * chunkSize
    for (let i = 0; i < tries && out.length < targetCount; i++) {
        const x = minX + rng() * chunkSize
        const z = minZ + rng() * chunkSize
        const y = sampleTerrainHeight(noise2D, x, z, shape)
        if (y < minHeight || y > maxHeight) {
            continue
        }

        const slopeDeg = getSlopeDeg(noise2D, x, z, shape)
        if (slopeDeg > maxSlopeDeg) {
            continue
        }

        const biome = noise2D(x / 1400 + 17.3, z / 1400 - 8.1) * 0.5 + 0.5
        const patch = noise2D(x / 260 - 4.2, z / 260 + 1.6) * 0.5 + 0.5
        const densityMask = biome * 0.7 + patch * 0.3
        if (rng() > densityMask) {
            continue
        }

        const speciesNoise = noise2D(x / 500 + 80, z / 500 - 120) * 0.5 + 0.5
        const speciesIndex = Math.min(speciesCount - 1, Math.floor(speciesNoise * speciesCount))
        const scaleRange = getSpeciesScale(speciesIndex)
        out.push({
            x,
            y,
            z,
            rotationY: rng() * Math.PI * 2,
            scale: scaleRange.min + (scaleRange.max - scaleRange.min) * rng(),
            speciesIndex,
        })
    }

    placementCache.set(cacheKey, out)
    if (placementCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = placementCache.keys().next().value
        if (oldestKey) {
            placementCache.delete(oldestKey)
        }
    }

    return out
}
