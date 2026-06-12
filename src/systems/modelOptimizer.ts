import { BufferGeometry, Mesh } from 'three';
import type { Object3D, Material } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface OptimizedResult {
  original: Object3D;
  mergedGeometry: BufferGeometry | null;
  mergedMaterial: Material | null;
}

export function optimizeModel(model: Object3D): OptimizedResult {
  const meshes: Mesh[] = [];
  model.traverse((child) => {
    if ((child as Mesh).isMesh) {
      meshes.push(child as Mesh);
    }
  });

  if (meshes.length === 0) {
    return { original: model, mergedGeometry: null, mergedMaterial: null };
  }

  if (meshes.length === 1) {
    const mesh = meshes[0];
    return { original: model, mergedGeometry: mesh.geometry, mergedMaterial: mesh.material as Material };
  }

  const materialMap = new Map<string, { geometry: BufferGeometry; material: Material }>();

  for (const mesh of meshes) {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat) continue;

    const key = mat.uuid;
    if (!materialMap.has(key)) {
      materialMap.set(key, { geometry: new BufferGeometry(), material: mat });
    }

    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    const entry = materialMap.get(key)!;
    entry.geometry = mergeGeometries([entry.geometry, geo])!;
  }

  const entries = Array.from(materialMap.values());

  if (entries.length === 1) {
    return { original: model, mergedGeometry: entries[0].geometry, mergedMaterial: entries[0].material };
  }

  const allGeos = entries.map(e => e.geometry);
  const mergedGeo = mergeGeometries(allGeos);

  return { original: model, mergedGeometry: mergedGeo, mergedMaterial: entries[0].material };
}
