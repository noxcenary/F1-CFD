import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { CurvedStreamlineVertices } from '../systems/curvedStreamlines';

interface CurvedStreamlineDebugProps {
  vertices: CurvedStreamlineVertices;
}

export function CurvedStreamlineDebug({ vertices }: CurvedStreamlineDebugProps) {
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(vertices.positions, 3));
    g.setAttribute('color', new Float32BufferAttribute(vertices.colors, 3));
    return g;
  }, [vertices]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={0.6} />
    </lineSegments>
  );
}
