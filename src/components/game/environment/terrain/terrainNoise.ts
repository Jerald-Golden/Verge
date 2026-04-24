export function fbm2d(
    noise: (x: number, y: number) => number,
    x: number,
    z: number,
    octaves: number,
    frequency: number,
    persistence: number,
    lacunarity: number,
): number {
    let amp = 1
    let freq = frequency
    let sum = 0
    let norm = 0
    const o = Math.max(1, Math.min(8, Math.floor(octaves)))
    for (let i = 0; i < o; i++) {
        sum += amp * noise(x * freq, z * freq)
        norm += amp
        amp *= persistence
        freq *= lacunarity
    }
    return norm > 0 ? sum / norm : 0
}

/** FBM in world meters: smooth hills over `macroWavelengthM`-scale, `detail` scales spatial frequency. */
export function fbm2dWorldMeters(
    noise: (x: number, y: number) => number,
    worldX: number,
    worldZ: number,
    macroWavelengthM: number,
    detail: number,
    octaves: number,
    persistence: number,
    lacunarity: number,
): number {
    const w = Math.max(50, macroWavelengthM)
    const nx = worldX / w
    const nz = worldZ / w
    return fbm2d(noise, nx, nz, octaves, detail, persistence, lacunarity)
}

export type TerrainShapeParams = {
    macroWavelengthM: number
    detail: number
    octaves: number
    persistence: number
    lacunarity: number
    amplitude: number
}

export function sampleTerrainHeight(
    noise2D: (x: number, y: number) => number,
    worldX: number,
    worldZ: number,
    p: TerrainShapeParams,
): number {
    return (
        p.amplitude *
        fbm2dWorldMeters(
            noise2D,
            worldX,
            worldZ,
            p.macroWavelengthM,
            p.detail,
            p.octaves,
            p.persistence,
            p.lacunarity,
        )
    )
}
