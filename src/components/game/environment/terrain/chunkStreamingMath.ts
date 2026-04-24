export type ChunkTile = { ix: number; iz: number }

/**
 * Tiles in an axis-aligned search region, filtered by a view-aligned window in XZ:
 * more extent along look direction (ahead), less behind, full lateral span = `gridRadius` (`r`).
 */
export function computeViewDirectedTiles(
    camX: number,
    camZ: number,
    chunkSize: number,
    r: number,
    forwardX: number,
    forwardZ: number,
): ChunkTile[] {
    const baseIx = Math.floor(camX / chunkSize)
    const baseIz = Math.floor(camZ / chunkSize)

    const len = Math.hypot(forwardX, forwardZ) || 1
    const fx = forwardX / len
    const fz = forwardZ / len
    const rx = -fz
    const rz = fx

    const rFwd = r + Math.max(1, Math.floor(r * 0.45))
    const rBack = Math.max(1, r - Math.floor(r * 0.35))
    const rSide = r

    const rMax = r + rFwd + 2
    const candidates: { ix: number; iz: number; along: number; distSq: number }[] = []
    const seen = new Set<string>()

    for (let di = -rMax; di <= rMax; di++) {
        for (let dj = -rMax; dj <= rMax; dj++) {
            const ix = baseIx + di
            const iz = baseIz + dj
            const key = `${ix},${iz}`
            if (seen.has(key)) {
                continue
            }

            const wx = (ix + 0.5) * chunkSize
            const wz = (iz + 0.5) * chunkSize
            const vx = wx - camX
            const vz = wz - camZ
            const along = (vx * fx + vz * fz) / chunkSize
            const across = (vx * rx + vz * rz) / chunkSize

            if (along < -rBack || along > rFwd || Math.abs(across) > rSide) {
                continue
            }

            seen.add(key)
            candidates.push({ ix, iz, along, distSq: vx * vx + vz * vz })
        }
    }

    candidates.sort((a, b) => {
        if (b.along !== a.along) {
            return b.along - a.along
        }
        return a.distSq - b.distSq
    })

    return candidates.map(({ ix, iz }) => ({ ix, iz }))
}

export function tileSetSignature(tiles: ChunkTile[]): string {
    if (tiles.length === 0) {
        return ''
    }
    const parts = tiles.map((t) => `${t.ix},${t.iz}`)
    parts.sort()
    return parts.join('|')
}
