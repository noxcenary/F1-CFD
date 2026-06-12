import { useRef, useEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';
import type { SeedingWallSystem } from '../types';

interface SeedingWallsProps {
  system: SeedingWallSystem;
}

export function SeedingWalls({ system }: SeedingWallsProps) {
  const meshRef = useRef<InstancedMesh>(null);

  const geo = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const mat = useMemo(() => new MeshBasicMaterial({
    color: '#ff8844',
    transparent: true,
    opacity: system.config.opacity,
    depthWrite: false,
  }), [system.config.opacity]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || system.walls.length === 0) return;

    const dummy = new Object3D();
    const o = system.orientation;
    const fwd = new Vector3(o.forward[0], o.forward[1], o.forward[2]);
    const upVec = new Vector3(o.up[0], o.up[1], o.up[2]);

    system.walls.forEach((w, i) => {
      dummy.position.set(w.position[0], w.position[1], w.position[2]);

      dummy.up.copy(upVec);
      dummy.lookAt(
        w.position[0] + fwd.x,
        w.position[1] + fwd.y,
        w.position[2] + fwd.z,
      );

      dummy.rotateY(w.rotation);

      dummy.scale.set(w.size[2], w.size[1], w.size[0]);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [system]);

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, system.walls.length]} />
  );
}
