import { useMemo } from 'react';

export function Ground() {
  const gridConfig = useMemo(
    () => ({
      args: [50, 50, 50, 50] as [number, number, number, number],
      position: [0, 0, 0] as [number, number, number],
    }),
    []
  );

  return (
    <group>
      <gridHelper args={gridConfig.args} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
