import type { InfluenceSource, InfluenceField, AeroReferenceFrame, CarAxis } from '../types';

interface PerAxisConfig {
  strengthMult: number;
  fwdFactor: number;
  latFactor: number;
  vertFactor: number;
  minFwdRadius?: number;
}

const SOURCE_TYPE_CONFIG: Record<string, PerAxisConfig> = {
  'Front Wing': { strengthMult: 2.0, fwdFactor: 2.5, latFactor: 1.2, vertFactor: 2.0 },
  'Front Wheel L': { strengthMult: 2.5, fwdFactor: 3.0, latFactor: 2.0, vertFactor: 4.0, minFwdRadius: 2.0 },
  'Front Wheel R': { strengthMult: 2.5, fwdFactor: 3.0, latFactor: 2.0, vertFactor: 4.0, minFwdRadius: 2.0 },
  'Sidepod L': { strengthMult: 2.0, fwdFactor: 1.8, latFactor: 1.5, vertFactor: 3.0 },
  'Sidepod R': { strengthMult: 2.0, fwdFactor: 1.8, latFactor: 1.5, vertFactor: 3.0 },
  'Rear Wheel L': { strengthMult: 1.0, fwdFactor: 3.0, latFactor: 2.0, vertFactor: 4.0, minFwdRadius: 2.0 },
  'Rear Wheel R': { strengthMult: 1.0, fwdFactor: 3.0, latFactor: 2.0, vertFactor: 4.0, minFwdRadius: 2.0 },
  'Diffuser': { strengthMult: 2.5, fwdFactor: 2.5, latFactor: 1.5, vertFactor: 5.0 },
  'Rear Wing': { strengthMult: 1.5, fwdFactor: 2.5, latFactor: 1.2, vertFactor: 2.0 },
};

const DEFAULT_CONFIG: PerAxisConfig = { strengthMult: 0.5, fwdFactor: 1.5, latFactor: 1.0, vertFactor: 2.0 };

function getSourceConfig(name: string): PerAxisConfig {
  for (const [key, config] of Object.entries(SOURCE_TYPE_CONFIG)) {
    if (name.startsWith(key)) return config;
  }
  return DEFAULT_CONFIG;
}

function scale(v: [number, number, number], s: number): [number, number, number] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function add3(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): [number, number, number] {
  return [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]];
}

function negate(v: [number, number, number]): [number, number, number] {
  return [-v[0], -v[1], -v[2]];
}

function makeDirection(
  type: string,
  forward: [number, number, number],
  right: [number, number, number],
  up: [number, number, number],
  side: number,
): [number, number, number] {
  const name = type.toLowerCase();

  const outward: [number, number, number] = scale(right, side);

  if (name.includes('diffuser')) {
    return add3(scale(forward, 0.4), scale(up, 0.5), scale(outward, 0.1));
  }
  if (name.includes('rear') && name.includes('wing')) {
    const down = negate(up);
    const inward = negate(outward);
    return add3(scale(forward, 0.5), scale(down, 0.4), scale(inward, 0.1));
  }
  if (name.includes('wheel')) {
    return add3(scale(forward, 0.4), scale(outward, 0.3), scale(up, 0.3));
  }
  if (name.includes('sidepod')) {
    return add3(scale(forward, 0.4), scale(outward, 0.4), scale(up, 0.2));
  }
  return add3(scale(forward, 0.6), scale(outward, 0.3), scale(up, 0.1));
}

interface SubSourceSpec {
  name: string;
  fwdOffset: number;
  latOffset: number;
  strengthFraction: number;
}

function getSubSources(baseName: string): SubSourceSpec[] {
  if (baseName.includes('Wheel') || baseName.includes('Sidepod')) {
    return [{ name: baseName, fwdOffset: -1, latOffset: 0, strengthFraction: 1 }];
  }
  return [
    { name: baseName + ' L-Tip', fwdOffset: -1, latOffset: -0.8, strengthFraction: 0.25 },
    { name: baseName + ' Center', fwdOffset: -1, latOffset: 0, strengthFraction: 0.5 },
    { name: baseName + ' R-Tip', fwdOffset: -1, latOffset: 0.8, strengthFraction: 0.25 },
  ];
}

function buildSubSource(
  region: { center: [number, number, number]; size: [number, number, number]; orientation: CarAxis },
  baseName: string,
  spec: SubSourceSpec,
  config: PerAxisConfig,
): InfluenceSource {
  const [sx, sy, sz] = region.size;
  const f = region.orientation.forward;
  const r = region.orientation.right;
  const u = region.orientation.up;
  const [cx, cy, cz] = region.center;

  const crossSection = sy * sz;
  const totalStrength = crossSection * config.strengthMult;

  const halfFwd = sx / 2;
  const halfLat = sy / 2;

  const pos: [number, number, number] = [
    cx + spec.fwdOffset * halfFwd * f[0] + spec.latOffset * halfLat * r[0],
    cy + spec.fwdOffset * halfFwd * f[1] + spec.latOffset * halfLat * r[1],
    cz + spec.fwdOffset * halfFwd * f[2] + spec.latOffset * halfLat * r[2],
  ];

  const side = spec.latOffset > 0 ? 1 : spec.latOffset < 0 ? -1 : 0;

  let fwdR = sx * config.fwdFactor;
  if (config.minFwdRadius && fwdR < config.minFwdRadius) {
    fwdR = config.minFwdRadius;
  }

  return {
    position: pos,
    direction: makeDirection(baseName, f, r, u, side),
    strength: totalStrength * spec.strengthFraction,
    forwardRadius: fwdR,
    lateralRadius: sy * config.latFactor,
    verticalRadius: sz * config.vertFactor,
    sourceType: spec.name,
    orientation: region.orientation,
  };
}

export function buildInfluenceField(frame: AeroReferenceFrame): InfluenceField {
  const fwd = frame.frontWingRegion.orientation.forward;
  const freestream: [number, number, number] = [-fwd[0], -fwd[1], -fwd[2]];

  const regionEntries: { region: typeof frame.noseRegion; name: string }[] = [
    { region: frame.frontWingRegion, name: 'Front Wing' },
    { region: frame.frontWheelLeft, name: 'Front Wheel L' },
    { region: frame.frontWheelRight, name: 'Front Wheel R' },
    { region: frame.sidepodLeft, name: 'Sidepod L' },
    { region: frame.sidepodRight, name: 'Sidepod R' },
    { region: frame.rearWheelLeft, name: 'Rear Wheel L' },
    { region: frame.rearWheelRight, name: 'Rear Wheel R' },
    { region: frame.diffuserRegion, name: 'Diffuser' },
    { region: frame.rearWingRegion, name: 'Rear Wing' },
  ];

  const sources: InfluenceSource[] = [];

  for (const { region, name } of regionEntries) {
    const config = getSourceConfig(name);
    const subs = getSubSources(name);
    for (const spec of subs) {
      sources.push(buildSubSource(region, name, spec, config));
    }
  }

  return { sources, freestream };
}

export function sampleVelocity(
  point: [number, number, number],
  sources: InfluenceSource[],
  freestream: [number, number, number],
): [number, number, number] {
  let vx = freestream[0];
  let vy = freestream[1];
  let vz = freestream[2];

  const [px, py, pz] = point;

  for (const src of sources) {
    const dx = px - src.position[0];
    const dy = py - src.position[1];
    const dz = pz - src.position[2];

    const f = src.orientation.forward;
    const r = src.orientation.right;
    const u = src.orientation.up;

    const df = dx * f[0] + dy * f[1] + dz * f[2];
    const dl = dx * r[0] + dy * r[1] + dz * r[2];
    const dv = dx * u[0] + dy * u[1] + dz * u[2];

    const fwdR = src.forwardRadius;
    const latR = src.lateralRadius;
    const vertR = src.verticalRadius;

    const weight = Math.exp(
      -(df * df) / (2 * fwdR * fwdR)
      - (dl * dl) / (2 * latR * latR)
      - (dv * dv) / (2 * vertR * vertR),
    );

    vx += src.direction[0] * src.strength * weight;
    vy += src.direction[1] * src.strength * weight;
    vz += src.direction[2] * src.strength * weight;
  }

  return [vx, vy, vz];
}
