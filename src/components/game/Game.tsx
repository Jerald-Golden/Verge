import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Controls } from './controls/Controls.tsx'
import { Environment } from './environment/Environment.tsx'
import { Entities } from './entities/Entities.tsx'

/** R3F scene host; mount inside a positioned parent with `pointer-events: none` when UI sits on top. */
export function Game() {
    return (
        <div className="game" aria-hidden>
            <Suspense fallback={null}>
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 50 }}
                    gl={{ alpha: true, antialias: true }}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
                >
                    <Controls />
                    <Environment />
                    <Entities />
                </Canvas>
            </Suspense>
        </div>
    )
}
