/** djb2-style hash → unsigned 32-bit (non-zero). */
export function hashString(s: string): number {
    let h = 5381 >>> 0
    for (let i = 0; i < s.length; i++) {
        h = (((h << 5) + h) ^ (s.codePointAt(i) ?? 0)) >>> 0
    }
    return h === 0 ? 1 : h
}

/** PRNG in [0, 1); same seed ⇒ same sequence (for `simplex-noise` init). */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
