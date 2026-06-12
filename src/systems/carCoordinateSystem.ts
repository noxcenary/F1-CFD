import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { CarCoordinateSystem, CarAxis } from '../types';

export function detectCarCoordinateSystem(model: Object3D): CarCoordinateSystem {
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());

  const axes = determineAxes(size);
  const scale = (size.y + size.x + size.z) / 3;

  function dim(axis: [number, number, number]): number {
    return axis[0] !== 0 ? size.x : axis[1] !== 0 ? size.y : size.z;
  }

  const carLength = dim(axes.forward);
  const carWidth = dim(axes.right);
  const carHeight = dim(axes.up);
  const wheelbase = carLength * 0.6;

  return {
    axes,
    origin: [center.x, center.y, center.z],
    scale,
    dimensions: {
      carLength,
      carWidth,
      carHeight,
      wheelbase,
    },
  };
}

function determineAxes(size: Vector3): CarAxis {
  const dimensions = [
    { axis: 'x' as const, value: size.x },
    { axis: 'y' as const, value: size.y },
    { axis: 'z' as const, value: size.z },
  ];

  dimensions.sort((a, b) => b.value - a.value);

  const longAxis = dimensions[0].axis;
  const shortAxis = dimensions[2].axis;
  const midAxis = dimensions[1].axis;

  const forward: [number, number, number] = [0, 0, 0];
  const right: [number, number, number] = [0, 0, 0];
  const up: [number, number, number] = [0, 0, 0];

  forward[longAxis === 'x' ? 0 : longAxis === 'y' ? 1 : 2] = 1;
  right[midAxis === 'x' ? 0 : midAxis === 'y' ? 1 : 2] = 1;
  up[shortAxis === 'x' ? 0 : shortAxis === 'y' ? 1 : 2] = 1;

  return {
    forward,
    backward: [-forward[0], -forward[1], -forward[2]] as [number, number, number],
    up,
    down: [-up[0], -up[1], -up[2]] as [number, number, number],
    right,
    left: [-right[0], -right[1], -right[2]] as [number, number, number],
  };
}

export function localToWorld(
  local: [number, number, number],
  coordSystem: CarCoordinateSystem
): [number, number, number] {
  const f = coordSystem.axes.forward;
  const r = coordSystem.axes.right;
  const u = coordSystem.axes.up;

  return [
    coordSystem.origin[0] + local[0] * f[0] + local[1] * r[0] + local[2] * u[0],
    coordSystem.origin[1] + local[0] * f[1] + local[1] * r[1] + local[2] * u[1],
    coordSystem.origin[2] + local[0] * f[2] + local[1] * r[2] + local[2] * u[2],
  ];
}
