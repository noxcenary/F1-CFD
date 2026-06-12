import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { SeedPoint, StreamlineConfig } from '../types';
import { buildStreamlines } from '../systems/streamlines';

interface StreamlineDebugProps {
  seedPoints: SeedPoint[];
  config: StreamlineConfig;
}

export function StreamlineDebug({ seedPoints, config }: StreamlineDebugProps) {
  const geo = useMemo(() => {
    const { positions, colors } = buildStreamlines(seedPoints, config);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return g;
  }, [seedPoints, config]);

  if (seedPoints.length === 0) return null;

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={0.6} />
    </lineSegments>
  );
}
