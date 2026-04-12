import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Rolldown (Vite 8+) — stable vendor chunks for caching. Higher `priority` matches first.
const sep = String.raw`[/\\]`
const nm = `node_modules${sep}`

const reactVendor = new RegExp(
    `${nm}(?:react${sep}|react-dom${sep}|react-router-dom${sep}|scheduler${sep})`,
)
const rapierVendor = new RegExp(
    `${nm}(?:@react-three${sep}rapier|@dimforge${sep})`,
)
const threeCoreVendor = new RegExp(`${nm}three${sep}`)
const r3fVendor = new RegExp(`${nm}@react-three${sep}(?!rapier${sep})`)
const levaVendor = new RegExp(`${nm}leva${sep}`)
const stateVendor = new RegExp(`${nm}(?:zustand|immer)${sep}`)

// Peers of `three` / `@react-three/drei` (keep the 3D dependency graph together).
const threeSatellite = new RegExp(
    String.raw`${nm}(?:camera-controls|detect-gpu|maath|meshline|stats\.js|three-mesh-bvh|three-stdlib|troika-)`,
)

export default defineConfig({
    plugins: [react()],
    build: {
        chunkSizeWarningLimit: 1024,
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        { name: 'rapier', test: rapierVendor, priority: 70 },
                        { name: 'three', test: threeCoreVendor, priority: 60 },
                        { name: 'r3f', test: r3fVendor, priority: 55 },
                        { name: 'three-satellite', test: threeSatellite, priority: 50 },
                        { name: 'react', test: reactVendor, priority: 40 },
                        { name: 'leva', test: levaVendor, priority: 30 },
                        { name: 'state', test: stateVendor, priority: 30 },
                        { name: 'vendor', test: /node_modules/, priority: 10 },
                    ],
                },
            },
        },
    },
})
