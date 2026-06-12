import type { SeedPoint, StreamlineConfig } from '../types';

export interface StreamlineVertices {
  positions: Float32Array;
  colors: Float32Array;
}

export const WALL_COLORS = [
  0xff4444, 0xff8844, 0xffcc44, 0x44ff44, 0x44ff88,
  0x44ffcc, 0x44aaff, 0x4488ff, 0x8844ff, 0xcc44ff,
  0xff44aa, 0xff4488, 0xff6666, 0xff9966, 0xffcc66,
  0x66ff66, 0x66ff99, 0x66ffcc, 0x66aaff, 0x6699ff,
  0x9966ff, 0xcc66ff, 0xff66aa, 0xff6699,
];

export function hexToRgb(hex: number): [number, number, number] {
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  ];
}

export function buildStreamlines(
  seedPoints: SeedPoint[],
  config: StreamlineConfig,
): StreamlineVertices {
  const { length, segments } = config;
  const stepLen = length / segments;

  const vertCount = seedPoints.length * segments * 2;
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);

  let idx = 0;
  for (const sp of seedPoints) {
    const [px, py, pz] = sp.position;
    const [dx, dy, dz] = sp.direction;
    const rgb = hexToRgb(WALL_COLORS[sp.wallId % WALL_COLORS.length]);

    for (let s = 0; s < segments; s++) {
      const t0 = s * stepLen;
      const t1 = (s + 1) * stepLen;

      positions[idx * 3] = px + dx * t0;
      positions[idx * 3 + 1] = py + dy * t0;
      positions[idx * 3 + 2] = pz + dz * t0;
      colors[idx * 3] = rgb[0];
      colors[idx * 3 + 1] = rgb[1];
      colors[idx * 3 + 2] = rgb[2];
      idx++;

      positions[idx * 3] = px + dx * t1;
      positions[idx * 3 + 1] = py + dy * t1;
      positions[idx * 3 + 2] = pz + dz * t1;
      colors[idx * 3] = rgb[0];
      colors[idx * 3 + 1] = rgb[1];
      colors[idx * 3 + 2] = rgb[2];
      idx++;
    }
  }

  return { positions, colors };
}
