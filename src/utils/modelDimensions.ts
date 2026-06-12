import { Box3, Sphere, Vector3 } from 'three';
import type { Object3D, Mesh } from 'three';
import type { ModelDimensions, BoundingBox } from '../types';

export function computeModelDimensions(object: Object3D): ModelDimensions {
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const wheelbase = estimateWheelbase(object, box);

  return {
    overallLength: size.z,
    overallWidth: size.x,
    overallHeight: size.y,
    wheelbase,
    center: [center.x, center.y, center.z],
  };
}

export function computeBoundingBox(object: Object3D): BoundingBox {
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());

  return {
    width: size.x,
    height: size.y,
    depth: size.z,
  };
}

export function computeBoundingSphereRadius(object: Object3D): number {
  const sphere = new Sphere();
  const box = new Box3().setFromObject(object);
  sphere.setFromPoints([
    new Vector3(box.min.x, box.min.y, box.min.z),
    new Vector3(box.max.x, box.max.y, box.max.z),
  ]);
  return sphere.radius;
}

function estimateWheelbase(object: Object3D, bounds: Box3): number {
  const wheels: number[] = [];
  object.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const name = child.name.toLowerCase();
      if (name.includes('wheel') || name.includes('tire') || name.includes('tyre') || name.includes('rim')) {
        wheels.push(child.position.z);
      }
    }
  });

  if (wheels.length >= 2) {
    wheels.sort((a, b) => a - b);
    const frontAxle = wheels[wheels.length - 1];
    const rearAxle = wheels[0];
    return Math.abs(frontAxle - rearAxle);
  }

  const size = bounds.getSize(new Vector3());
  return size.z * 0.6;
}
