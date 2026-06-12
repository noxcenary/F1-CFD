import { useRef, useEffect, useState, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Mesh, Box3, Vector3, BufferGeometry, Float32BufferAttribute } from 'three';
import type { Object3D, Group } from 'three';
import { analyzeModel } from '../utils/modelAnalysis';
import { createImprovedAeroShell } from '../systems/aeroShell';
import { detectCarCoordinateSystem } from '../systems/carCoordinateSystem';
import { buildAeroReferenceFrame } from '../systems/aeroReferenceFrame';
import { buildSeedingWalls, generateSeedPoints } from '../systems/seedingWallSystem';
import { buildInfluenceField, sampleVelocity } from '../systems/influenceField';
import { buildCurvedStreamlines } from '../systems/curvedStreamlines';
import type { CurvedStreamlineVertices } from '../systems/curvedStreamlines';
import { buildWakes, getWakeSeeds } from '../systems/wakes';
import { SeedingWalls } from './SeedingWalls';
import { SeedPointsDebug } from './SeedPointsDebug';
import { StreamlineDebug } from './StreamlineDebug';
import { InfluenceFieldDebug } from './InfluenceFieldDebug';
import { CurvedStreamlineDebug } from './CurvedStreamlineDebug';
import { WakeDebug } from './WakeDebug';
import { AeroFrameDebug } from '../debug/AeroFrameDebug';
import type { ModelAnalysisReport, DebugSettings, AeroShellStats, SeedingWallSystem, SeedPoint, InfluenceField } from '../types';
import { DEFAULT_SEEDING_WALL_CONFIG, DEFAULT_SEED_DENSITY, DEFAULT_STREAMLINE_CONFIG } from '../types';

interface F1CarProps {
  onAnalysis: (report: ModelAnalysisReport) => void;
  onMeshCount: (count: number) => void;
  onShellStats: (stats: AeroShellStats) => void;
  debug: DebugSettings;
}

function CoordSystemAxes({ model }: { model: Object3D }) {
  const coord = useMemo(() => detectCarCoordinateSystem(model), [model]);
  const o = coord.origin;
  const len = coord.dimensions.carLength * 0.4;

  const arrowStyle = useMemo(() => [
    { dir: coord.axes.forward, color: '#44ff44' },
    { dir: coord.axes.right, color: '#ff4444' },
    { dir: coord.axes.up, color: '#4488ff' },
  ], [coord]);

  return (
    <group>
      {arrowStyle.map(({ dir, color }) => {
        const d = new Vector3(dir[0], dir[1], dir[2]);
        if (d.length() === 0) return null;
        return (
          <arrowHelper
            key={color}
            args={[d.clone().normalize(), new Vector3(o[0], o[1], o[2]), len, color, len * 0.15, len * 0.08]}
          />
        );
      })}
    </group>
  );
}

function buildOrientedBoxEdges(
  center: [number, number, number],
  size: [number, number, number],
  orientation: { forward: [number, number, number]; right: [number, number, number]; up: [number, number, number] }
): Float32Array {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size;
  const f = orientation.forward;
  const r = orientation.right;
  const u = orientation.up;

  const hx = sx / 2, hy = sy / 2, hz = sz / 2;

  const signs: [number, number, number][] = [
    [-1, -1, -1], [ 1, -1, -1], [ 1,  1, -1], [-1,  1, -1],
    [-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1],
  ];

  function corner(s: [number, number, number]): [number, number, number] {
    return [
      cx + s[0] * hx * f[0] + s[1] * hy * r[0] + s[2] * hz * u[0],
      cy + s[0] * hx * f[1] + s[1] * hy * r[1] + s[2] * hz * u[1],
      cz + s[0] * hx * f[2] + s[1] * hy * r[2] + s[2] * hz * u[2],
    ];
  }

  const pts = signs.map(corner);
  const out: number[] = [];

  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  for (const [a, b] of edges) {
    out.push(pts[a][0], pts[a][1], pts[a][2], pts[b][0], pts[b][1], pts[b][2]);
  }

  return new Float32Array(out);
}

function AeroFrameVisualization({ frame }: { frame: NonNullable<ReturnType<typeof buildAeroReferenceFrame>> }) {
  const regionEntries = useMemo(() => {
    const list: { region: typeof frame.noseRegion; color: string }[] = [
      { region: frame.noseRegion, color: '#ff4488' },
      { region: frame.frontWingRegion, color: '#ff6644' },
      { region: frame.frontWheelLeft, color: '#ffaa44' },
      { region: frame.frontWheelRight, color: '#ffaa44' },
      { region: frame.sidepodLeft, color: '#ffcc44' },
      { region: frame.sidepodRight, color: '#ffcc44' },
      { region: frame.floorRegion, color: '#44aaff' },
      { region: frame.rearWheelLeft, color: '#44ffaa' },
      { region: frame.rearWheelRight, color: '#44ffaa' },
      { region: frame.diffuserRegion, color: '#8844ff' },
      { region: frame.rearWingRegion, color: '#44ff66' },
    ];
    return list;
  }, [frame]);

  return (
    <group>
      {regionEntries.map(({ region, color }) => {
        const edges = buildOrientedBoxEdges(region.center, region.size, region.orientation);
        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute(edges, 3));

        return (
          <lineSegments key={region.name} geometry={geo}>
            <lineBasicMaterial color={color} transparent opacity={0.7} />
          </lineSegments>
        );
      })}

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              frame.nose[0], frame.nose[1], frame.nose[2],
              frame.tail[0], frame.tail[1], frame.tail[2],
            ]), 3]}
          />
        </bufferGeometry>
        <lineDashedMaterial color="#ffffff" dashSize={2} gapSize={2} transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

export function F1Car({ onAnalysis, onMeshCount, onShellStats, debug }: F1CarProps) {
  const { scene } = useGLTF('/2025_f1_car.glb');
  const groupRef = useRef<Group>(null);
  const sceneAddedRef = useRef(false);
  const [aeroShellGeo, setAeroShellGeo] = useState<BufferGeometry | null>(null);
  const [boundsGeo, setBoundsGeo] = useState<BufferGeometry | null>(null);
  const [aeroFrame, setAeroFrame] = useState<ReturnType<typeof buildAeroReferenceFrame> | null>(null);
  const [seedingWalls, setSeedingWalls] = useState<SeedingWallSystem | null>(null);
  const [seedPoints, setSeedPoints] = useState<SeedPoint[]>([]);
  const [influenceField, setInfluenceField] = useState<InfluenceField | null>(null);
  const [sceneModel, setSceneModel] = useState<Object3D | null>(null);
  const groundOffsetRef = useRef(0);

  useEffect(() => {
    if (!scene || sceneAddedRef.current) return;
    sceneAddedRef.current = true;

    const cloned = scene.clone(true);

    const analysis = analyzeModel(cloned);
    onAnalysis(analysis);

    let mc = 0;
    cloned.traverse((child) => {
      if ((child as Mesh).isMesh) {
        mc++;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    onMeshCount(mc);

    const shellGeo = createImprovedAeroShell(cloned, 48);
    setAeroShellGeo(shellGeo);
    if (shellGeo) {
      const idx = shellGeo.index;
      const triCount = idx ? idx.count / 3 : shellGeo.attributes.position.count / 3;
      onShellStats({ triangleCount: Math.round(triCount), meshCount: 1 });
    } else {
      onShellStats({ triangleCount: 0, meshCount: 0 });
    }

    const frame = buildAeroReferenceFrame(cloned);
    setAeroFrame(frame);

    const sw = buildSeedingWalls(frame.floorRegion, DEFAULT_SEEDING_WALL_CONFIG);
    setSeedingWalls(sw);

    const sp = generateSeedPoints(sw, DEFAULT_SEED_DENSITY);
    setSeedPoints(sp);

    const inf = buildInfluenceField(frame);
    setInfluenceField(inf);

    const f = frame.frontWingRegion.orientation.forward;
    const r = frame.frontWingRegion.orientation.right;
    const u = frame.frontWingRegion.orientation.up;

    console.group('%c[AERO] Orientation Report', 'color: #00ffff; font-weight: bold');
    console.log('Forward:', f);
    console.log('Right:', r);
    console.log('Up:', u);
    console.log('Nose:', frame.nose);
    console.log('Tail:', frame.tail);
    console.groupEnd();

    if (sp.length > 0) {
      const firstSeed = sp[0];
      const vel0 = sampleVelocity(firstSeed.position, inf.sources, inf.freestream);
      const vel0Len = Math.sqrt(vel0[0] * vel0[0] + vel0[1] * vel0[1] + vel0[2] * vel0[2]);
      const stepSize = 0.12;
      const pos1: [number, number, number] = vel0Len > 0.001
        ? [
            firstSeed.position[0] + (vel0[0] / vel0Len) * stepSize,
            firstSeed.position[1] + (vel0[1] / vel0Len) * stepSize,
            firstSeed.position[2] + (vel0[2] / vel0Len) * stepSize,
          ]
        : firstSeed.position;

      const wakeSeeds = getWakeSeeds(frame);
      const firstWake = wakeSeeds.length > 0 ? wakeSeeds[0].position : [0, 0, 0];

      console.group('%c[AERO] Chain Audit', 'color: #ffcc00; font-weight: bold');
      console.log('Forward:', f);
      console.log('SeedWallPosition:', firstSeed.position);
      console.log('SeedLaunchDirection:', firstSeed.direction);
      console.log('FreestreamDirection:', inf.freestream);
      console.log('VelocityStep0:', vel0);
      console.log('PositionStep1:', pos1);
      console.log('WakeEmitterPosition:', firstWake);
      console.groupEnd();
    }

    setSceneModel(cloned);

    const worldBox = new Box3().setFromObject(cloned);
    const minY = worldBox.min.y;
    groundOffsetRef.current = -minY;

    if (groupRef.current) {
      groupRef.current.add(cloned);
      groupRef.current.position.y = groundOffsetRef.current;
    }

    return () => {
      sceneAddedRef.current = false;
      if (groupRef.current) {
        while (groupRef.current.children.length > 0) {
          groupRef.current.remove(groupRef.current.children[0]);
        }
        groupRef.current.position.y = 0;
      }
    };
  }, [scene, onAnalysis, onMeshCount, onShellStats]);

  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of materials) {
            if (mat && 'wireframe' in mat) {
              (mat as { wireframe: boolean }).wireframe = debug.showWireframe;
            }
          }
        }
      }
    });
  }, [debug.showWireframe]);

  useEffect(() => {
    if (!debug.showBounds || !groupRef.current) {
      setBoundsGeo(null);
      return;
    }

    const box = new Box3();
    groupRef.current.traverse((child) => {
      if ((child as Mesh).isMesh) {
        box.expandByObject(child);
      }
    });

    if (box.min.x === Infinity) {
      setBoundsGeo(null);
      return;
    }

    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    const hw = size.x / 2;
    const hh = size.y / 2;
    const hd = size.z / 2;
    const cx = center.x;
    const cy = center.y;
    const cz = center.z;

    const verts = new Float32Array([
      cx - hw, cy - hh, cz - hd,
      cx + hw, cy - hh, cz - hd,
      cx + hw, cy + hh, cz - hd,
      cx - hw, cy + hh, cz - hd,
      cx - hw, cy - hh, cz + hd,
      cx + hw, cy - hh, cz + hd,
      cx + hw, cy + hh, cz + hd,
      cx - hw, cy + hh, cz + hd,
    ]);

    const indices = [
      0, 1, 1, 2, 2, 3, 3, 0,
      4, 5, 5, 6, 6, 7, 7, 4,
      0, 4, 1, 5, 2, 6, 3, 7,
    ];

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    setBoundsGeo(geo);
  }, [debug.showBounds]);

  const curvedStreamlineVertices = useMemo<CurvedStreamlineVertices | null>(() => {
    if (!debug.showCurvedStreamlines || seedPoints.length === 0 || !influenceField) return null;
    return buildCurvedStreamlines(seedPoints, influenceField, {
      steps: debug.curvedStreamlineSteps,
      stepSize: debug.curvedStreamlineStepSize,
    });
  }, [debug.showCurvedStreamlines, debug.curvedStreamlineSteps, debug.curvedStreamlineStepSize, seedPoints, influenceField]);

  const wakeVertices = useMemo<{ positions: Float32Array; colors: Float32Array } | null>(() => {
    if (!debug.showWakes || !aeroFrame || !influenceField) return null;
    return buildWakes(aeroFrame, influenceField);
  }, [debug.showWakes, aeroFrame, influenceField]);

  const wakeEmitterMarkers = useMemo<{ position: [number, number, number]; color: [number, number, number] }[] | null>(() => {
    if (!debug.showWakes || !aeroFrame) return null;
    const seeds = getWakeSeeds(aeroFrame);
    return seeds.map(s => ({ position: s.position, color: s.color }));
  }, [debug.showWakes, aeroFrame]);

  const wallCenterMarkers = useMemo<[number, number, number][] | null>(() => {
    if (!debug.showSeedPoints || !seedingWalls) return null;
    return seedingWalls.walls.map(w => w.position);
  }, [debug.showSeedPoints, seedingWalls]);

  const aeroShellRender = useMemo(() => {
    if (!debug.showAeroShell || !aeroShellGeo) return null;
    const isWireframe = debug.showAeroShellWireframe;
    const wireframeOnly = isWireframe;

    return (
      <mesh geometry={aeroShellGeo} position={[0, 0, 0]}>
        <meshBasicMaterial
          color={wireframeOnly ? '#4488ff' : '#4488ff'}
          transparent={!wireframeOnly}
          opacity={wireframeOnly ? 1 : 0.12}
          wireframe
          side={2}
        />
      </mesh>
    );
  }, [debug.showAeroShell, debug.showAeroShellWireframe, aeroShellGeo]);

  return (
    <group ref={groupRef}>
      {debug.showBounds && boundsGeo && (
        <lineSegments geometry={boundsGeo}>
          <lineBasicMaterial color="#00ff88" transparent opacity={0.6} />
        </lineSegments>
      )}
      {aeroShellRender}
      {debug.showCoordSystem && sceneModel && (
        <CoordSystemAxes model={sceneModel} />
      )}
      {debug.showAeroFrame && aeroFrame && (
        <>
          <AeroFrameVisualization frame={aeroFrame} />
          <AeroFrameDebug
            center={[
              (aeroFrame.nose[0] + aeroFrame.tail[0]) / 2,
              (aeroFrame.nose[1] + aeroFrame.tail[1]) / 2,
              (aeroFrame.nose[2] + aeroFrame.tail[2]) / 2,
            ]}
            forward={aeroFrame.noseRegion.orientation.forward}
            right={aeroFrame.noseRegion.orientation.right}
            up={aeroFrame.noseRegion.orientation.up}
          />
        </>
      )}
      {debug.showSeedingWalls && seedingWalls && (
        <SeedingWalls system={seedingWalls} />
      )}
      {debug.showSeedPoints && seedPoints.length > 0 && (
        <>
          {wallCenterMarkers?.map((pos, i) => (
            <mesh key={`wall-${i}`} position={[pos[0], pos[1], pos[2]]}>
              <sphereGeometry args={[0.025, 8, 6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
            </mesh>
          ))}
          <SeedPointsDebug seedPoints={seedPoints} />
        </>
      )}
      {debug.showStreamlines && seedPoints.length > 0 && (
        <StreamlineDebug seedPoints={seedPoints} config={DEFAULT_STREAMLINE_CONFIG} />
      )}
      {debug.showInfluenceField && influenceField && (
        <InfluenceFieldDebug field={influenceField} />
      )}
      {debug.showCurvedStreamlines && curvedStreamlineVertices && (
        <CurvedStreamlineDebug vertices={curvedStreamlineVertices} />
      )}
      {debug.showWakes && wakeVertices && (
        <>
          {wakeEmitterMarkers?.map((marker, i) => (
            <mesh key={`wake-emitter-${i}`} position={[marker.position[0], marker.position[1], marker.position[2]]}>
              <sphereGeometry args={[0.05, 12, 8]} />
              <meshBasicMaterial color={`rgb(${marker.color[0]*255|0},${marker.color[1]*255|0},${marker.color[2]*255|0})`} />
            </mesh>
          ))}
          <WakeDebug positions={wakeVertices.positions} colors={wakeVertices.colors} />
        </>
      )}
    </group>
  );
}
