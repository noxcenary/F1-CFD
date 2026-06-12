import type { Object3D, Mesh } from 'three';
import type { ModelAnalysisReport } from '../types';
import { computeModelDimensions, computeBoundingBox, computeBoundingSphereRadius } from './modelDimensions';

export function analyzeModel(object: Object3D): ModelAnalysisReport {
  let nodeCount = 0;
  let meshCount = 0;
  const materials = new Set<string>();
  let estimatedPolyCount = 0;

  object.traverse((child) => {
    nodeCount++;
    if ((child as Mesh).isMesh) {
      meshCount++;
      const mesh = child as Mesh;
      if (mesh.geometry) {
        const index = mesh.geometry.index;
        if (index) {
          estimatedPolyCount += index.count / 3;
        } else if (mesh.geometry.attributes.position) {
          estimatedPolyCount += mesh.geometry.attributes.position.count / 3;
        }
      }
      if (mesh.material) {
        const materials_arr = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials_arr) {
          materials.add(mat.uuid);
        }
      }
    }
  });

  const dimensions = computeModelDimensions(object);
  const boundingBox = computeBoundingBox(object);
  const boundingSphereRadius = computeBoundingSphereRadius(object);

  return {
    nodeCount,
    meshCount,
    materialCount: materials.size,
    boundingBox,
    boundingSphereRadius,
    estimatedPolyCount: Math.round(estimatedPolyCount),
    dimensions,
  };
}
