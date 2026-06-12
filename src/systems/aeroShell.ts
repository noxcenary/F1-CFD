import { BufferGeometry, Vector3, Float32BufferAttribute } from 'three';
import type { Object3D, Mesh } from 'three';

interface VoxelGrid {
  dims: [number, number, number];
  origin: [number, number, number];
  step: number;
  cells: Uint8Array;
}

function samplePoints(model: Object3D, count: number): Vector3[] {
  const points: Vector3[] = [];
  const meshes: Mesh[] = [];

  model.traverse((child) => {
    if ((child as Mesh).isMesh) meshes.push(child as Mesh);
  });

  if (meshes.length === 0) return points;

  const targetPerMesh = Math.ceil(count / meshes.length);

  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    if (!pos) continue;

    const matrix = mesh.matrixWorld;
    const total = pos.count;
    const step = Math.max(1, Math.floor(total / targetPerMesh));
    const tmp = new Vector3();

    for (let i = 0; i < total; i += step) {
      tmp.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      tmp.applyMatrix4(matrix);
      points.push(tmp.clone());
    }
  }

  return points;
}

function buildVoxelGrid(
  points: Vector3[],
  resolution: number
): VoxelGrid {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
  }

  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const step = extent / resolution;

  const nx = Math.ceil((maxX - minX) / step) + 1;
  const ny = Math.ceil((maxY - minY) / step) + 1;
  const nz = Math.ceil((maxZ - minZ) / step) + 1;

  const cells = new Uint8Array(nx * ny * nz);

  for (const p of points) {
    const ix = Math.min(Math.floor((p.x - minX) / step), nx - 1);
    const iy = Math.min(Math.floor((p.y - minY) / step), ny - 1);
    const iz = Math.min(Math.floor((p.z - minZ) / step), nz - 1);
    cells[ix + iy * nx + iz * nx * ny] = 1;
  }

  return {
    dims: [nx, ny, nz],
    origin: [minX, minY, minZ],
    step,
    cells,
  };
}

function extractSurface(voxel: VoxelGrid): BufferGeometry {
  const { dims, origin, step, cells } = voxel;
  const [nx, ny, nz] = dims;

  const verts: number[] = [];
  const indices: number[] = [];

  function getCell(x: number, y: number, z: number): number {
    if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) return 0;
    return cells[x + y * nx + z * nx * ny];
  }

  const faceVerts: [number, number, number][][] = [
    [[0,0,0],[1,0,0],[1,1,0],[0,1,0]],
    [[0,0,1],[0,1,1],[1,1,1],[1,0,1]],
    [[0,0,0],[0,1,0],[0,1,1],[0,0,1]],
    [[1,0,0],[1,0,1],[1,1,1],[1,1,0]],
    [[0,0,0],[0,0,1],[1,0,1],[1,0,0]],
    [[0,1,0],[1,1,0],[1,1,1],[0,1,1]],
  ];

  const faceNormals: [number,number,number][] = [
    [0,0,-1],[0,0,1],
    [-1,0,0],[1,0,0],
    [0,-1,0],[0,1,0],
  ];

  function addFace(
    cx: number, cy: number, cz: number,
    faceIdx: number
  ): void {
    const fv = faceVerts[faceIdx];
    const base = verts.length / 3;
    const ox = origin[0], oy = origin[1], oz = origin[2];

    for (const [dx, dy, dz] of fv) {
      verts.push(
        ox + (cx + dx) * step,
        oy + (cy + dy) * step,
        oz + (cz + dz) * step
      );
    }

    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        if (!getCell(ix, iy, iz)) continue;

        for (let f = 0; f < 6; f++) {
          const [nx_, ny_, nz_] = faceNormals[f];
          if (!getCell(ix + nx_, iy + ny_, iz + nz_)) {
            addFace(ix, iy, iz, f);
          }
        }
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

export function createImprovedAeroShell(
  model: Object3D,
  resolution: number = 48
): BufferGeometry | null {
  const points = samplePoints(model, 100000);
  if (points.length < 10) return null;

  const voxel = buildVoxelGrid(points, resolution);
  const surface = extractSurface(voxel);

  if (surface.attributes.position.count < 12) return null;

  return surface;
}
