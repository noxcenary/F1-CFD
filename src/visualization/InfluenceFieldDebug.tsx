import { useMemo } from 'react';
import { SphereGeometry, MeshBasicMaterial, BufferGeometry, Float32BufferAttribute, Matrix4 } from 'three';
import type { InfluenceSource, InfluenceField } from '../types';
import { sampleVelocity } from '../systems/influenceField';

const SOURCE_COLORS: Record<string, string> = {
  'Front Wing': '#ff6644',
  'Front Wheel L': '#ffaa44',
  'Front Wheel R': '#ffaa44',
  'Sidepod L': '#ffcc44',
  'Sidepod R': '#ffcc44',
  'Rear Wheel L': '#44ffaa',
  'Rear Wheel R': '#44ffaa',
  'Diffuser': '#8844ff',
  'Rear Wing': '#44ff66',
};

function getColor(type: string): string {
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (type.startsWith(key)) return color;
  }
  return '#888888';
}

function SourceMarker({ source }: { source: InfluenceSource }) {
  const sphereGeo = useMemo(() => new SphereGeometry(0.04, 12, 8), []);
  const sphereMat = useMemo(
    () => new MeshBasicMaterial({ color: getColor(source.sourceType) }),
    [source.sourceType]
  );

  const [px, py, pz] = source.position;
  const [dx, dy, dz] = source.direction;
  const dLen = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const arrowEnd: [number, number, number] = [
    px + (dx / dLen) * 0.15,
    py + (dy / dLen) * 0.15,
    pz + (dz / dLen) * 0.15,
  ];

  const arrowGeo = useMemo(() => {
    const verts = new Float32Array([px, py, pz, arrowEnd[0], arrowEnd[1], arrowEnd[2]]);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(verts, 3));
    return g;
  }, [px, py, pz, arrowEnd]);

  return (
    <group>
      <mesh geometry={sphereGeo} material={sphereMat} position={[px, py, pz]} />
      <lineSegments geometry={arrowGeo}>
        <lineBasicMaterial color={getColor(source.sourceType)} transparent opacity={0.8} />
      </lineSegments>
    </group>
  );
}

function InfluenceEllipsoid({ source }: { source: InfluenceSource }) {
  const wireframeGeo = useMemo(() => new SphereGeometry(1, 16, 12), []);
  const wireframeMat = useMemo(
    () => new MeshBasicMaterial({
      color: getColor(source.sourceType),
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    }),
    [source.sourceType]
  );

  const matrix = useMemo(() => {
    const f = source.orientation.forward;
    const r = source.orientation.right;
    const u = source.orientation.up;
    const [px, py, pz] = source.position;
    const fwdR = source.forwardRadius;
    const latR = source.lateralRadius;
    const vertR = source.verticalRadius;

    const m = new Matrix4();
    m.set(
      fwdR * f[0], latR * r[0], vertR * u[0], px,
      fwdR * f[1], latR * r[1], vertR * u[1], py,
      fwdR * f[2], latR * r[2], vertR * u[2], pz,
      0, 0, 0, 1,
    );
    return m;
  }, [source]);

  return (
    <mesh geometry={wireframeGeo} material={wireframeMat} matrix={matrix} matrixAutoUpdate={false} />
  );
}

function GridArrowSample({ source, freestream }: { source: InfluenceSource; freestream: [number, number, number] }) {
  const [cx, cy, cz] = source.position;
  const r = source.forwardRadius * 0.6;
  const steps = 4;
  const half = Math.floor(steps / 2);

  const lines = useMemo(() => {
    const verts: number[] = [];
    for (let ix = -half; ix <= half; ix++) {
      for (let iz = -half; iz <= half; iz++) {
        const pt: [number, number, number] = [
          cx + ix * (r / half),
          cy,
          cz + iz * (r / half),
        ];
        const v = sampleVelocity(pt, [source], freestream);
        const vLen = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
        const scale = 0.08;
        verts.push(
          pt[0], pt[1], pt[2],
          pt[0] + (v[0] / vLen) * scale,
          pt[1] + (v[1] / vLen) * scale,
          pt[2] + (v[2] / vLen) * scale,
        );
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(verts, 3));
    return g;
  }, [cx, cy, cz, r, half, source, freestream]);

  return (
    <lineSegments geometry={lines}>
      <lineBasicMaterial color={getColor(source.sourceType)} transparent opacity={0.35} />
    </lineSegments>
  );
}

interface InfluenceFieldDebugProps {
  field: InfluenceField;
}

export function InfluenceFieldDebug({ field }: InfluenceFieldDebugProps) {
  return (
    <group>
      {field.sources.map((source, i) => (
        <group key={i}>
          <SourceMarker source={source} />
          <InfluenceEllipsoid source={source} />
          <GridArrowSample source={source} freestream={field.freestream} />
        </group>
      ))}
    </group>
  );
}
