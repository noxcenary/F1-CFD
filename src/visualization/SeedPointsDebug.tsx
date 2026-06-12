import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { SeedPoint } from '../types';

interface SeedPointsDebugProps {
  seedPoints: SeedPoint[];
}

const WALL_COLORS = [
  '#ff4444', '#ff8844', '#ffcc44', '#44ff44', '#44ff88',
  '#44ffcc', '#44aaff', '#4488ff', '#8844ff', '#cc44ff',
  '#ff44aa', '#ff4488', '#ff6666', '#ff9966', '#ffcc66',
  '#66ff66', '#66ff99', '#66ffcc', '#66aaff', '#6699ff',
  '#9966ff', '#cc66ff', '#ff66aa', '#ff6699',
];

function wallColor(id: number): string {
  return WALL_COLORS[id % WALL_COLORS.length];
}

export function SeedPointsDebug({ seedPoints }: SeedPointsDebugProps) {
  const pointsGeo = useMemo(() => {
    const positions = new Float32Array(seedPoints.length * 3);
    const colors = new Float32Array(seedPoints.length * 3);

    for (let i = 0; i < seedPoints.length; i++) {
      const sp = seedPoints[i];
      positions[i * 3] = sp.position[0];
      positions[i * 3 + 1] = sp.position[1];
      positions[i * 3 + 2] = sp.position[2];

      const hex = wallColor(sp.wallId);
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return geo;
  }, [seedPoints]);

  const arrowsGeo = useMemo(() => {
    const arrowLen = 0.06;
    const verts: number[] = [];

    for (const sp of seedPoints) {
      const [x, y, z] = sp.position;
      const [dx, dy, dz] = sp.direction;
      verts.push(x, y, z, x + dx * arrowLen, y + dy * arrowLen, z + dz * arrowLen);
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(verts), 3));
    return geo;
  }, [seedPoints]);

  return (
    <group>
      <points geometry={pointsGeo}>
        <pointsMaterial size={0.025} vertexColors sizeAttenuation />
      </points>
      <lineSegments geometry={arrowsGeo}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}
