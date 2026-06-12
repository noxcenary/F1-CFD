import type { AeroReferenceFrame, InfluenceField } from '../types';
import { sampleVelocity } from './influenceField';

const WAKE_STEPS = 40;
const WAKE_STEP_SIZE = 0.12;
const ZERO_THRESHOLD = 0.001;

const WAKE_COLORS: Record<string, [number, number, number]> = {
  'Front Wing Tip': [1.0, 0.4, 0.27],
  'Front Wheel': [1.0, 0.67, 0.27],
  'Diffuser': [0.53, 0.27, 1.0],
  'Rear Wing Tip': [0.27, 1.0, 0.4],
};

interface WakeEmitterConfig {
  initialStrength: number;
  decayFactor: number;
  expansionRate: number;
  strandCount: number;
  coreStrength?: number;
  coreDecayFactor?: number;
  vortexRadius?: number;
  vortexRate?: number;
  vortexVerticalAspect?: number;
  strandWeights?: number[];
}

const WAKE_EMITTER_CONFIGS: Record<string, WakeEmitterConfig> = {
  'Front Wing Tip': {
    initialStrength: 1.0, decayFactor: 0.95, expansionRate: 0.003, strandCount: 5,
    coreStrength: 1.5, coreDecayFactor: 0.97,
    vortexRadius: 0.10, vortexRate: 0.3, vortexVerticalAspect: 0.6,
    strandWeights: [1.0, 0.75, 1.5, 0.75, 1.0],
  },
  'Front Wheel': {
    initialStrength: 0.8, decayFactor: 0.93, expansionRate: 0.012, strandCount: 3,
    coreStrength: 1.2, coreDecayFactor: 0.95,
  },
  'Diffuser': {
    initialStrength: 0.9, decayFactor: 0.94, expansionRate: 0.008, strandCount: 3,
    coreStrength: 1.3, coreDecayFactor: 0.96,
  },
  'Rear Wing Tip': {
    initialStrength: 1.0, decayFactor: 0.96, expansionRate: 0.003, strandCount: 5,
    coreStrength: 1.5, coreDecayFactor: 0.98,
    vortexRadius: 0.12, vortexRate: 0.25, vortexVerticalAspect: 0.5,
    strandWeights: [1.0, 0.75, 1.5, 0.75, 1.0],
  },
};

const DEFAULT_WAKE_CONFIG: WakeEmitterConfig = {
  initialStrength: 0.7, decayFactor: 0.95, expansionRate: 0.008, strandCount: 3,
};

function getWakeColor(type: string): [number, number, number] {
  for (const [key, color] of Object.entries(WAKE_COLORS)) {
    if (type.startsWith(key)) return color;
  }
  return [0.5, 0.5, 0.5];
}

function getWakeConfig(typeKey: string): WakeEmitterConfig {
  for (const [key, config] of Object.entries(WAKE_EMITTER_CONFIGS)) {
    if (typeKey.startsWith(key)) return config;
  }
  return DEFAULT_WAKE_CONFIG;
}

interface WakeSeedData {
  position: [number, number, number];
  color: [number, number, number];
  configKey: string;
}

function trailingEdgePos(
  region: {
    center: [number, number, number];
    size: [number, number, number];
    orientation: { forward: [number, number, number]; right: [number, number, number] };
  },
  latFrac: number,
): [number, number, number] {
  const fwd = region.orientation.forward;
  const right = region.orientation.right;
  const halfFwd = region.size[0] / 2;
  const halfLat = region.size[1] / 2;
  const [cx, cy, cz] = region.center;
  return [
    cx - halfFwd * fwd[0] + latFrac * halfLat * right[0],
    cy - halfFwd * fwd[1] + latFrac * halfLat * right[1],
    cz - halfFwd * fwd[2] + latFrac * halfLat * right[2],
  ];
}

export function getWakeSeeds(frame: AeroReferenceFrame): WakeSeedData[] {
  const seeds: WakeSeedData[] = [];
  const fwd = frame.frontWingRegion.orientation.forward;
  const startOffset = 0.05;

  function emit(
    region: {
      center: [number, number, number];
      size: [number, number, number];
      orientation: { forward: [number, number, number]; right: [number, number, number] };
    },
    latFrac: number,
    configKey: string,
  ) {
    const pos = trailingEdgePos(region, latFrac);
    seeds.push({
      position: [
        pos[0] - startOffset * fwd[0],
        pos[1] - startOffset * fwd[1],
        pos[2] - startOffset * fwd[2],
      ],
      color: getWakeColor(configKey),
      configKey,
    });
  }

  emit(frame.frontWingRegion, -0.9, 'Front Wing Tip');
  emit(frame.frontWingRegion, 0.9, 'Front Wing Tip');
  emit(frame.frontWheelLeft, 0, 'Front Wheel');
  emit(frame.frontWheelRight, 0, 'Front Wheel');
  emit(frame.diffuserRegion, -0.5, 'Diffuser');
  emit(frame.diffuserRegion, 0.5, 'Diffuser');
  emit(frame.rearWingRegion, -0.9, 'Rear Wing Tip');
  emit(frame.rearWingRegion, 0.9, 'Rear Wing Tip');

  return seeds;
}

export function buildWakes(
  frame: AeroReferenceFrame,
  field: InfluenceField,
): { positions: Float32Array; colors: Float32Array } {
  const seeds = getWakeSeeds(frame);
  const { sources, freestream } = field;
  const right = frame.frontWingRegion.orientation.right;
  const up = frame.frontWingRegion.orientation.up;

  const paths: { points: [number, number, number][]; configKey: string; baseColor: [number, number, number] }[] = [];

  for (const seed of seeds) {
    const points: [number, number, number][] = [];
    let cx = seed.position[0];
    let cy = seed.position[1];
    let cz = seed.position[2];

    for (let s = 0; s < WAKE_STEPS; s++) {
      const v = sampleVelocity([cx, cy, cz], sources, freestream);
      const vLen = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (vLen < ZERO_THRESHOLD) break;

      points.push([cx, cy, cz]);

      const invLen = 1 / vLen;
      cx += v[0] * invLen * WAKE_STEP_SIZE;
      cy += v[1] * invLen * WAKE_STEP_SIZE;
      cz += v[2] * invLen * WAKE_STEP_SIZE;
    }

    paths.push({ points, configKey: seed.configKey, baseColor: seed.color });
  }

  let totalVerts = 0;
  for (const path of paths) {
    const config = getWakeConfig(path.configKey);
    if (path.points.length > 0) {
      totalVerts += config.strandCount * path.points.length * 2;
    }
  }

  const positions = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);

  let idx = 0;
  for (const path of paths) {
    const config = getWakeConfig(path.configKey);
    const stepCount = path.points.length;
    if (stepCount === 0) continue;

    const strandOffsets: number[] = [];
    for (let i = 0; i < config.strandCount; i++) {
      if (config.strandCount === 1) {
        strandOffsets.push(0);
      } else {
        strandOffsets.push((i / (config.strandCount - 1)) * 2 - 1);
      }
    }

    for (let s = 0; s < stepCount; s++) {
      const expansion = s * config.expansionRate;

      for (let si = 0; si < config.strandCount; si++) {
        const isCenter = config.strandCount === 1 || si === Math.floor(config.strandCount / 2);

        const strandInitStrength = (isCenter && config.coreStrength)
          ? config.initialStrength * config.coreStrength
          : config.initialStrength;
        const strandDecay = (isCenter && config.coreDecayFactor)
          ? config.coreDecayFactor
          : config.decayFactor;
        const strandRemaining = strandInitStrength * Math.pow(strandDecay, s);
        const intensity = Math.max(0, Math.min(1, strandRemaining / strandInitStrength));

        const strandIntensity = config.strandWeights
          ? config.strandWeights[si] ?? 1.0
          : isCenter
            ? 1.0
            : 0.5;
        const finalIntensity = intensity * strandIntensity;

        const fadedColor: [number, number, number] = [
          path.baseColor[0] * finalIntensity,
          path.baseColor[1] * finalIntensity,
          path.baseColor[2] * finalIntensity,
        ];

        let latOffset: number;
        let vertOffset: number;

        if (config.vortexRadius && !isCenter) {
          const angle = s * (config.vortexRate ?? 0.3);
          const sideSign = strandOffsets[si] > 0 ? 1 : -1;
          const aspect = config.vortexVerticalAspect ?? 0.6;
          latOffset = config.vortexRadius * Math.cos(angle) * sideSign + strandOffsets[si] * expansion;
          vertOffset = config.vortexRadius * aspect * Math.sin(angle) * sideSign;
        } else if (!isCenter) {
          latOffset = strandOffsets[si] * expansion;
          vertOffset = 0;
        } else {
          latOffset = 0;
          vertOffset = 0;
        }

        const p = path.points[s];

        positions[idx * 3] = p[0] + latOffset * right[0] + vertOffset * up[0];
        positions[idx * 3 + 1] = p[1] + latOffset * right[1] + vertOffset * up[1];
        positions[idx * 3 + 2] = p[2] + latOffset * right[2] + vertOffset * up[2];
        colors[idx * 3] = fadedColor[0];
        colors[idx * 3 + 1] = fadedColor[1];
        colors[idx * 3 + 2] = fadedColor[2];
        idx++;

        if (s < stepCount - 1) {
          const nextAngle = (s + 1) * (config.vortexRate ?? 0.3);
          let nextLat: number;
          let nextVert: number;

          if (config.vortexRadius && !isCenter) {
            const sideSign = strandOffsets[si] > 0 ? 1 : -1;
            const aspect = config.vortexVerticalAspect ?? 0.6;
            nextLat = config.vortexRadius * Math.cos(nextAngle) * sideSign + strandOffsets[si] * (s + 1) * config.expansionRate;
            nextVert = config.vortexRadius * aspect * Math.sin(nextAngle) * sideSign;
          } else if (!isCenter) {
            nextLat = strandOffsets[si] * (s + 1) * config.expansionRate;
            nextVert = 0;
          } else {
            nextLat = 0;
            nextVert = 0;
          }

          const np = path.points[s + 1];
          positions[idx * 3] = np[0] + nextLat * right[0] + nextVert * up[0];
          positions[idx * 3 + 1] = np[1] + nextLat * right[1] + nextVert * up[1];
          positions[idx * 3 + 2] = np[2] + nextLat * right[2] + nextVert * up[2];
        } else {
          positions[idx * 3] = p[0] + latOffset * right[0] + vertOffset * up[0];
          positions[idx * 3 + 1] = p[1] + latOffset * right[1] + vertOffset * up[1];
          positions[idx * 3 + 2] = p[2] + latOffset * right[2] + vertOffset * up[2];
        }
        colors[idx * 3] = fadedColor[0];
        colors[idx * 3 + 1] = fadedColor[1];
        colors[idx * 3 + 2] = fadedColor[2];
        idx++;
      }
    }
  }

  return { positions, colors };
}
