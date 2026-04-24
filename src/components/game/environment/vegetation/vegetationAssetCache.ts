import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import type { BufferGeometry, Material, Mesh } from 'three'
import { treeView } from '../../../../assets/models/vegetation/tree.ts'
import vegetationGlbUrl from '../../../../assets/models/vegetation/vegetation.glb'

export type VegetationMeshRef = {
    key: string
    speciesIndex: number
    lod: number
    geometry: BufferGeometry
    material: Material | Material[]
}

export type VegetationAssets = {
    meshes: VegetationMeshRef[]
    speciesCount: number
}

let vegetationAssetsPromise: Promise<VegetationAssets> | null = null
const DRACO_DECODER_PATHS = ['https://www.gstatic.com/draco/v1/decoders/']

function asMesh(value: unknown): Mesh | null {
    if (!value || typeof value !== 'object') {
        return null
    }
    const candidate = value as Mesh
    if (!('isMesh' in candidate) || !candidate.isMesh) {
        return null
    }
    return candidate
}

function collectVegetationMeshes(allMeshes: Mesh[]): VegetationMeshRef[] {
    const meshes: VegetationMeshRef[] = []
    for (let speciesIndex = 0; speciesIndex < treeView.length; speciesIndex++) {
        const species = treeView[speciesIndex]
        for (let lod = 0; lod < species.children.length; lod++) {
            const name = species.children[lod]
            for (let i = 0; i < allMeshes.length; i++) {
                const mesh = allMeshes[i]
                if (!mesh.name.startsWith(name)) {
                    continue
                }
                meshes.push({
                    key: `${species.name}:${lod}:${mesh.name}:${i}`,
                    speciesIndex,
                    lod,
                    geometry: mesh.geometry,
                    material: mesh.material,
                })
            }
        }
    }
    return meshes
}

function hasSpeciesLodMatch(
    meshes: VegetationMeshRef[],
    speciesIndex: number,
    lod: number,
    expectedPrefix: string,
): boolean {
    return meshes.some(
        (m) => m.speciesIndex === speciesIndex && m.lod === lod && m.key.includes(expectedPrefix),
    )
}

function validateVegetationMeshes(meshes: VegetationMeshRef[]): void {
    for (let speciesIndex = 0; speciesIndex < treeView.length; speciesIndex++) {
        const species = treeView[speciesIndex]
        for (let lod = 0; lod < species.children.length; lod++) {
            const expectedPrefix = species.children[lod]
            if (hasSpeciesLodMatch(meshes, speciesIndex, lod, expectedPrefix)) {
                continue
            }
            throw new Error(`Missing vegetation mesh for ${expectedPrefix}`)
        }
    }
}

function loadVegetationAssetsWithDecoderPath(decoderPath: string): Promise<VegetationAssets> {
    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(decoderPath)
    loader.setDRACOLoader(dracoLoader)

    return new Promise<VegetationAssets>((resolve, reject) => {
        loader.load(
            vegetationGlbUrl,
            (gltf) => {
                const allMeshes: Mesh[] = []
                gltf.scene.traverse((obj) => {
                    const mesh = asMesh(obj)
                    if (mesh) {
                        allMeshes.push(mesh)
                    }
                })

                const meshes = collectVegetationMeshes(allMeshes)
                try {
                    validateVegetationMeshes(meshes)
                } catch (error) {
                    dracoLoader.dispose()
                    reject(error)
                    return
                }

                resolve({
                    meshes,
                    speciesCount: treeView.length,
                })
                dracoLoader.dispose()
            },
            undefined,
            (error) => {
                dracoLoader.dispose()
                reject(error)
            },
        )
    })
}

async function loadVegetationAssets(): Promise<VegetationAssets> {
    let lastError: unknown = null
    for (const decoderPath of DRACO_DECODER_PATHS) {
        try {
            return await loadVegetationAssetsWithDecoderPath(decoderPath)
        } catch (error) {
            lastError = error
        }
    }
    throw lastError ?? new Error('Failed to load vegetation assets')
}

export function getVegetationAssets(): Promise<VegetationAssets> {
    if (!vegetationAssetsPromise) {
        vegetationAssetsPromise = loadVegetationAssets().catch((error) => {
            vegetationAssetsPromise = null
            throw error
        })
    }
    return vegetationAssetsPromise
}
