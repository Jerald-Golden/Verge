import { useMemo } from 'react'
import { InstancedMesh, Matrix4, MeshBasicMaterial, Object3D, SphereGeometry } from 'three'
import type { BufferGeometry, Material } from 'three'
import type { TerrainShapeParams } from '../terrain/terrainNoise.ts'
import { buildVegetationPlacements } from './vegetationPlacement.ts'

type VegetationChunkProps = {
    ix: number
    iz: number
    chunkSize: number
    mapSeed: string
    shape: TerrainShapeParams
    speciesCount: number
    isInDrawRange: boolean
    cameraX: number
    cameraZ: number
    targetX: number
    targetZ: number
    lodStepDistance: number
    showLodHelpers: boolean
    meshesBySpeciesLod: Map<
        string,
        { key: string; geometry: BufferGeometry; material: Material | Material[] }[]
    >
    densityPerKm2: number
    maxSlopeDeg: number
    minHeight: number
    maxHeight: number
}

type BatchedMeshInstances = {
    key: string
    geometry: BufferGeometry
    material: Material | Material[]
    matrices: Matrix4[]
}

const _tmpObject = new Object3D()
const LOD_COLORS = ['#34d399', '#facc15', '#fb923c', '#ef4444']

function chooseLod(distanceFromCamera: number, lodStepDistance: number): number {
    const step = Math.max(1, lodStepDistance)
    return Math.max(0, Math.min(3, Math.floor(distanceFromCamera / step)))
}

function getDistanceToSegment2D(
    px: number,
    pz: number,
    ax: number,
    az: number,
    bx: number,
    bz: number,
): number {
    const abx = bx - ax
    const abz = bz - az
    const apx = px - ax
    const apz = pz - az
    const abLenSq = abx * abx + abz * abz
    if (abLenSq < 1e-8) {
        return Math.hypot(apx, apz)
    }
    const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq))
    const qx = ax + abx * t
    const qz = az + abz * t
    return Math.hypot(px - qx, pz - qz)
}

function getViewportDistance2D(
    px: number,
    pz: number,
    ax: number,
    az: number,
    bx: number,
    bz: number,
): number {
    const camDistance = Math.hypot(px - ax, pz - az)
    const targetDistance = Math.hypot(px - bx, pz - bz)
    const segmentDistance = getDistanceToSegment2D(px, pz, ax, az, bx, bz)
    return Math.min(camDistance, targetDistance, segmentDistance)
}

function Instances({
    geometry,
    material,
    matrices,
}: Readonly<{ geometry: BufferGeometry; material: Material | Material[]; matrices: Matrix4[] }>) {
    if (matrices.length === 0) {
        return null
    }

    return (
        <instancedMesh
            args={[geometry, material, matrices.length]}
            castShadow
            receiveShadow
            ref={(mesh) => {
                if (!mesh) {
                    return
                }
                for (let i = 0; i < matrices.length; i++) {
                    mesh.setMatrixAt(i, matrices[i])
                }
                mesh.instanceMatrix.needsUpdate = true
                const instanced = mesh as InstancedMesh
                instanced.frustumCulled = true
            }}
        />
    )
}

function LodHelperInstances({ lod, matrices }: Readonly<{ lod: number; matrices: Matrix4[] }>) {
    const helperGeometry = useMemo(() => new SphereGeometry(0.9, 6, 6), [])
    const helperMaterial = useMemo(() => {
        return new MeshBasicMaterial({
            color: LOD_COLORS[Math.max(0, Math.min(3, lod))],
            depthTest: false,
            transparent: true,
            opacity: 0.92,
        })
    }, [lod])

    if (matrices.length === 0) {
        return null
    }

    return (
        <instancedMesh
            args={[helperGeometry, helperMaterial, matrices.length]}
            renderOrder={1000}
            ref={(mesh) => {
                if (!mesh) {
                    return
                }
                for (let i = 0; i < matrices.length; i++) {
                    mesh.setMatrixAt(i, matrices[i])
                }
                mesh.instanceMatrix.needsUpdate = true
                mesh.frustumCulled = true
            }}
        />
    )
}

export function VegetationChunk({
    ix,
    iz,
    chunkSize,
    mapSeed,
    shape,
    speciesCount,
    isInDrawRange,
    cameraX,
    cameraZ,
    targetX,
    targetZ,
    lodStepDistance,
    showLodHelpers,
    meshesBySpeciesLod,
    densityPerKm2,
    maxSlopeDeg,
    minHeight,
    maxHeight,
}: Readonly<VegetationChunkProps>) {
    const placements = useMemo(
        () =>
            buildVegetationPlacements({
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
            }),
        [
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
        ],
    )

    const batches = useMemo<BatchedMeshInstances[]>(() => {
        if (!isInDrawRange) {
            return []
        }
        const bucketMap = new Map<string, BatchedMeshInstances>()
        for (const placement of placements) {
            const distanceToCamera = getViewportDistance2D(
                placement.x,
                placement.z,
                cameraX,
                cameraZ,
                targetX,
                targetZ,
            )
            const lod = chooseLod(distanceToCamera, lodStepDistance)
            const meshRefs = meshesBySpeciesLod.get(`${placement.speciesIndex}:${lod}`)
            if (!meshRefs || meshRefs.length === 0) {
                continue
            }

            _tmpObject.position.set(placement.x, placement.y, placement.z)
            _tmpObject.rotation.set(0, placement.rotationY, 0)
            _tmpObject.scale.setScalar(placement.scale)
            _tmpObject.updateMatrix()
            const matrix = _tmpObject.matrix.clone()

            for (const meshRef of meshRefs) {
                let bucket = bucketMap.get(meshRef.key)
                if (!bucket) {
                    bucket = {
                        key: meshRef.key,
                        geometry: meshRef.geometry,
                        material: meshRef.material,
                        matrices: [],
                    }
                    bucketMap.set(meshRef.key, bucket)
                }
                bucket.matrices.push(matrix)
            }
        }
        return Array.from(bucketMap.values())
    }, [
        placements,
        isInDrawRange,
        cameraX,
        cameraZ,
        targetX,
        targetZ,
        lodStepDistance,
        meshesBySpeciesLod,
    ])

    const helperMatricesByLod = useMemo(() => {
        if (!showLodHelpers || !isInDrawRange) {
            return [[], [], [], []] as Matrix4[][]
        }
        const matricesByLod: Matrix4[][] = [[], [], [], []]
        for (const placement of placements) {
            const distanceToCamera = getViewportDistance2D(
                placement.x,
                placement.z,
                cameraX,
                cameraZ,
                targetX,
                targetZ,
            )
            const lod = chooseLod(distanceToCamera, lodStepDistance)
            _tmpObject.position.set(placement.x, placement.y + 4, placement.z)
            _tmpObject.rotation.set(0, 0, 0)
            _tmpObject.scale.setScalar(1)
            _tmpObject.updateMatrix()
            matricesByLod[lod].push(_tmpObject.matrix.clone())
        }
        return matricesByLod
    }, [
        showLodHelpers,
        isInDrawRange,
        placements,
        cameraX,
        cameraZ,
        targetX,
        targetZ,
        lodStepDistance,
    ])

    if (batches.length === 0) {
        return null
    }

    return (
        <group>
            {batches.map((batch) => (
                <Instances
                    key={batch.key}
                    geometry={batch.geometry}
                    material={batch.material}
                    matrices={batch.matrices}
                />
            ))}
            {showLodHelpers
                ? helperMatricesByLod.map((matrices, lod) => (
                      <LodHelperInstances key={`lod-helper-${lod}`} lod={lod} matrices={matrices} />
                  ))
                : null}
        </group>
    )
}
