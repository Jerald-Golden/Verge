import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { Suspense } from 'react'
import { Controls } from './controls/Controls.tsx'
import { Ground } from './environment/ground/Ground.tsx'
import { Entities } from './entities/Entities.tsx'
import { Stats } from '@react-three/drei'

export type GameProps = {
    mapSeed?: string
}

/** R3F host. World scale: 1 Three.js unit = 1 meter (`src/game/worldUnits.ts`). */
export function Game({ mapSeed = 'default' }: Readonly<GameProps>) {

    return (
        <>
            <div className="game" aria-hidden>
                <Suspense fallback={null}>
                    <Canvas
                        camera={{
                            position: [22, 28, 92],
                            fov: 58,
                            near: 1,
                            far: 400_000,
                        }}
                        gl={{
                            alpha: true,
                            antialias: true,
                            logarithmicDepthBuffer: true,
                        }}
                        style={{ width: '100%', height: '100%', display: 'block' }}
                        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
                    >
                        <Controls />
                        <ambientLight intensity={0.65} />
                        <directionalLight position={[280, 420, 260]} intensity={1.02} />
                        <Ground mapSeed={mapSeed} />
                        <Entities />
                        <Stats />
                    </Canvas>
                </Suspense>
            </div>
            {import.meta.env.DEV ? <Leva /> : null}
        </>
    )
}
