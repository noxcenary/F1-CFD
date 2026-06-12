import type {
  AeroRegion, SeedingWallConfig, SeedingWallInstance, SeedingWallSystem,
  SeedPoint, SeedDensityConfig,
} from '../types';

export function buildSeedingWalls(
  sourceRegion: AeroRegion,
  config: SeedingWallConfig
): SeedingWallSystem {
  const [cx, cy, cz] = sourceRegion.center;
  const [sf, sr, sv] = sourceRegion.size;
  const f = sourceRegion.orientation.forward;
  const r = sourceRegion.orientation.right;
  const u = sourceRegion.orientation.up;

  const halfFwd = sf / 2;
  const halfRight = sr / 2;

  const angRad = config.angleDeg * Math.PI / 180;

  const vertShift = Math.max(0, config.wallHeight / 2 - sv / 2);

  const walls: SeedingWallInstance[] = [];
  const count = config.wallsPerSide;

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < count; i++) {
      const t = count > 1
        ? config.startOffset + (config.endOffset - config.startOffset) * i / (count - 1)
        : (config.startOffset + config.endOffset) / 2;

      const fwdOffset = t * halfFwd;
      const latOffset = side * halfRight;

      const px = cx + fwdOffset * f[0] + latOffset * r[0] + vertShift * u[0];
      const py = cy + fwdOffset * f[1] + latOffset * r[1] + vertShift * u[1];
      const pz = cz + fwdOffset * f[2] + latOffset * r[2] + vertShift * u[2];

      walls.push({
        position: [px, py, pz],
        rotation: side * angRad,
        size: [config.wallLength, config.wallHeight, config.wallThickness],
      });
    }
  }

  return { walls, config, orientation: sourceRegion.orientation };
}

function yawDirection(
  fwd: [number, number, number],
  right: [number, number, number],
  angle: number,
): [number, number, number] {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return [
    fwd[0] * cosA + right[0] * sinA,
    fwd[1] * cosA + right[1] * sinA,
    fwd[2] * cosA + right[2] * sinA,
  ];
}

export function generateSeedPoints(
  wallSystem: SeedingWallSystem,
  densityConfig: SeedDensityConfig,
): SeedPoint[] {
  const { walls, orientation } = wallSystem;
  const fwd = orientation.forward;
  const right = orientation.right;
  const up = orientation.up;
  const { pointsAlongLength, pointsAlongHeight, offsetFromSurface } = densityConfig;

  const seedPoints: SeedPoint[] = [];

  for (let w = 0; w < walls.length; w++) {
    const wall = walls[w];
    const [px, py, pz] = wall.position;
    const [len, hgt] = wall.size;

    const dir = yawDirection(fwd, right, wall.rotation);

    for (let r = 0; r < pointsAlongLength; r++) {
      const tLen = pointsAlongLength > 1
        ? (r / (pointsAlongLength - 1)) - 0.5
        : 0;
      for (let c = 0; c < pointsAlongHeight; c++) {
        const tHgt = pointsAlongHeight > 1
          ? (c / (pointsAlongHeight - 1)) - 0.5
          : 0;

        seedPoints.push({
          position: [
            px + tLen * len * dir[0] + tHgt * hgt * up[0] + (offsetFromSurface + len / 2) * dir[0],
            py + tLen * len * dir[1] + tHgt * hgt * up[1] + (offsetFromSurface + len / 2) * dir[1],
            pz + tLen * len * dir[2] + tHgt * hgt * up[2] + (offsetFromSurface + len / 2) * dir[2],
          ],
          direction: dir,
          wallId: w,
        });
      }
    }
  }

  return seedPoints;
}
