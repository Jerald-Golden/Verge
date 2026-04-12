export function Entities() {
    return (
        <mesh rotation={[0.4, 0.65, 0]}>
            <boxGeometry args={[1.25, 1.25, 1.25]} />
            <meshStandardMaterial color="#8b7ab8" metalness={0.22} roughness={0.42} />
        </mesh>
    )
}
