import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';

interface WakeDebugProps {
  positions: Float32Array;
  colors: Float32Array;
}

export function WakeDebug({ positions, colors }: WakeDebugProps) {
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={0.7} />
    </lineSegments>
  );
}
