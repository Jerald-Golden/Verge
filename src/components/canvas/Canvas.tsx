import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'

function Scene() {
    return (
        <>
            <ambientLight intensity={0.65} />
            <directionalLight position={[5, 6, 4]} intensity={1.15} />
            <mesh rotation={[0.4, 0.65, 0]}>
                <boxGeometry args={[1.25, 1.25, 1.25]} />
                <meshStandardMaterial color="#8b7ab8" metalness={0.22} roughness={0.42} />
            </mesh>
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.55} />
        </>
    )
}

/** Full-bleed R3F layer; mount inside a positioned parent with `pointer-events: none` when UI sits on top. */
export function VergeCanvas() {
    return (
        <Suspense fallback={null}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{ alpha: true, antialias: true }}
                style={{ width: '100%', height: '100%', display: 'block' }}
                onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
            >
                <Scene />
            </Canvas>
        </Suspense>
    )
}
