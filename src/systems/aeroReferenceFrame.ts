import type { Object3D } from 'three';
import { detectCarCoordinateSystem } from './carCoordinateSystem';
import type { AeroReferenceFrame, AeroRegion } from '../types';

export function buildAeroReferenceFrame(model: Object3D): AeroReferenceFrame {
  const coord = detectCarCoordinateSystem(model);

  const f = coord.axes.forward;
  const r = coord.axes.right;
  const u = coord.axes.up;
  const o = coord.origin;

  const len = coord.dimensions.carLength;
  const wid = coord.dimensions.carWidth;
  const hgt = coord.dimensions.carHeight;
  const halfLen = len / 2;
  const halfWid = wid / 2;
  const halfHgt = hgt / 2;

  function offset(df: number, dr: number, du: number): [number, number, number] {
    return [
      o[0] + df * f[0] + dr * r[0] + du * u[0],
      o[1] + df * f[1] + dr * r[1] + du * u[1],
      o[2] + df * f[2] + dr * r[2] + du * u[2],
    ];
  }

  function region(
    name: string,
    df: number, dr: number, du: number,
    sf: number, sw: number, sh: number
  ): AeroRegion {
    return {
      name,
      center: offset(df * halfLen, dr * halfWid, du * halfHgt),
      size: [len * sf, wid * sw, hgt * sh],
      orientation: coord.axes,
    };
  }

  return {
    nose: offset(halfLen, 0, 0),
    tail: offset(-halfLen, 0, 0),

    noseRegion: region('Nose', 0.95, 0, 0.1, 0.08, 0.15, 0.2),
    frontWingRegion: region('Front Wing', 0.85, 0, -0.5, 0.12, 0.85, 0.2),
    frontWheelLeft: region('Front Wheel L', 0.55, -0.85, -0.45, 0.12, 0.12, 0.35),
    frontWheelRight: region('Front Wheel R', 0.55, 0.85, -0.45, 0.12, 0.12, 0.35),
    sidepodLeft: region('Sidepod L', 0.1, -0.7, -0.15, 0.35, 0.2, 0.25),
    sidepodRight: region('Sidepod R', 0.1, 0.7, -0.15, 0.35, 0.2, 0.25),
    floorRegion: region('Floor', 0.1, 0, -0.85, 0.55, 0.85, 0.08),
    rearWheelLeft: region('Rear Wheel L', -0.4, -0.85, -0.45, 0.12, 0.12, 0.35),
    rearWheelRight: region('Rear Wheel R', -0.4, 0.85, -0.45, 0.12, 0.12, 0.35),
    diffuserRegion: region('Diffuser', -0.6, 0, -0.7, 0.15, 0.4, 0.12),
    rearWingRegion: region('Rear Wing', -0.85, 0, 0.15, 0.1, 0.6, 0.35),
  };
}

export function getRegionWorldBox(
  region: AeroRegion
): { min: [number, number, number]; max: [number, number, number] } {
  const [cx, cy, cz] = region.center;
  const [sx, sy, sz] = region.size;
  const f = region.orientation.forward;
  const r = region.orientation.right;
  const u = region.orientation.up;

  return {
    min: [
      cx - (sx/2 * f[0] + sy/2 * r[0] + sz/2 * u[0]),
      cy - (sx/2 * f[1] + sy/2 * r[1] + sz/2 * u[1]),
      cz - (sx/2 * f[2] + sy/2 * r[2] + sz/2 * u[2]),
    ],
    max: [
      cx + (sx/2 * f[0] + sy/2 * r[0] + sz/2 * u[0]),
      cy + (sx/2 * f[1] + sy/2 * r[1] + sz/2 * u[1]),
      cz + (sx/2 * f[2] + sy/2 * r[2] + sz/2 * u[2]),
    ],
  };
}
