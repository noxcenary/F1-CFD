import type { SeedPoint, InfluenceField, CurvedStreamlineConfig } from '../types';
import { sampleVelocity } from './influenceField';
import { WALL_COLORS, hexToRgb } from './streamlines';

export interface CurvedStreamlineVertices {
  positions: Float32Array;
  colors: Float32Array;
}

const ZERO_THRESHOLD = 0.001;

export function buildCurvedStreamlines(
  seedPoints: SeedPoint[],
  field: InfluenceField,
  config: CurvedStreamlineConfig,
): CurvedStreamlineVertices {
  const { steps, stepSize } = config;
  const { sources, freestream } = field;

  const vertCount = seedPoints.length * steps * 2;
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);

  let idx = 0;
  for (const sp of seedPoints) {
    let cx = sp.position[0];
    let cy = sp.position[1];
    let cz = sp.position[2];
    const rgb = hexToRgb(WALL_COLORS[sp.wallId % WALL_COLORS.length]);

    for (let s = 0; s < steps; s++) {
      const v = sampleVelocity([cx, cy, cz], sources, freestream);
      const vLen = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

      if (vLen < ZERO_THRESHOLD) {
        for (let r = s; r < steps; r++) {
          positions[idx * 3] = cx;
          positions[idx * 3 + 1] = cy;
          positions[idx * 3 + 2] = cz;
          colors[idx * 3] = rgb[0];
          colors[idx * 3 + 1] = rgb[1];
          colors[idx * 3 + 2] = rgb[2];
          idx++;

          positions[idx * 3] = cx;
          positions[idx * 3 + 1] = cy;
          positions[idx * 3 + 2] = cz;
          colors[idx * 3] = rgb[0];
          colors[idx * 3 + 1] = rgb[1];
          colors[idx * 3 + 2] = rgb[2];
          idx++;
        }
        break;
      }

      const invLen = 1 / vLen;
      const nx = cx + (v[0] * invLen) * stepSize;
      const ny = cy + (v[1] * invLen) * stepSize;
      const nz = cz + (v[2] * invLen) * stepSize;

      positions[idx * 3] = cx;
      positions[idx * 3 + 1] = cy;
      positions[idx * 3 + 2] = cz;
      colors[idx * 3] = rgb[0];
      colors[idx * 3 + 1] = rgb[1];
      colors[idx * 3 + 2] = rgb[2];
      idx++;

      positions[idx * 3] = nx;
      positions[idx * 3 + 1] = ny;
      positions[idx * 3 + 2] = nz;
      colors[idx * 3] = rgb[0];
      colors[idx * 3 + 1] = rgb[1];
      colors[idx * 3 + 2] = rgb[2];
      idx++;

      cx = nx;
      cy = ny;
      cz = nz;
    }
  }

  return { positions, colors };
}
