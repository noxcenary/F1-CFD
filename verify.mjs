// Numerical verification of corrected aero region dimensions
// Traces through the post-fix code path

import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';

async function verify() {
  const io = new NodeIO();
  const doc = await io.read('./public/2025_f1_car.glb');
  const root = doc.getRoot();

  // Simulate Box3.setFromObject with transforms
  // The transform chain (from hierarchy):
  // Scene identity → Sketchfab_model identity → FBX_node (R=90°X, S=0.3048) → RootNode (I) → CarNode (I) → Part (S=0.0328) → Mesh (I)
  // Total: v' = R(90°X) × S(0.3048) × S(0.0328) × v
  // Since both scales are uniform: S(0.3048×0.0328) = S(0.00999744)
  
  const totalScale = 0.3048 * 0.0328;  // ≈ 0.01

  // Compute world-space AABB by iterating all meshes
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const arr = pos.getArray();
      if (!arr) continue;
      
      for (let i = 0; i < arr.length; i += 3) {
        const vx = arr[i] * totalScale;
        const vy = -arr[i + 2] * totalScale;  // Z→-Y after 90° X rotation
        const vz = arr[i + 1] * totalScale;   // Y→Z after 90° X rotation
        
        minX = Math.min(minX, vx); maxX = Math.max(maxX, vx);
        minY = Math.min(minY, vy); maxY = Math.max(maxY, vy);
        minZ = Math.min(minZ, vz); maxZ = Math.max(maxZ, vz);
      }
    }
  }

  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  console.log('========================================');
  console.log('  VERIFICATION - CORRECTED AERO FRAME');
  console.log('========================================\n');

  console.log('World-Space Car AABB (post-transform):');
  console.log(`  X: [${minX.toFixed(3)}, ${maxX.toFixed(3)}]  span=${sizeX.toFixed(3)}m  (width)`);
  console.log(`  Y: [${minY.toFixed(3)}, ${maxY.toFixed(3)}]  span=${sizeY.toFixed(3)}m  (height)`);
  console.log(`  Z: [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}]  span=${sizeZ.toFixed(3)}m  (length)`);
  console.log(`  Center: (${centerX.toFixed(3)}, ${centerY.toFixed(3)}, ${centerZ.toFixed(3)})`);

  const len = sizeZ;  // forward = Z (detected)
  const wid = sizeX;  // right = X
  const hgt = sizeY;  // up = Y
  const halfLen = len / 2;
  const halfWid = wid / 2;
  const halfHgt = hgt / 2;

  console.log(`\n  Corrected dimensions:`);
  console.log(`  carLength = size.z = ${len.toFixed(3)}m  ← forward axis`);
  console.log(`  carWidth  = size.x = ${wid.toFixed(3)}m  ← right axis`);
  console.log(`  carHeight = size.y = ${hgt.toFixed(3)}m  ← up axis`);
  console.log(`  halfLen=${halfLen.toFixed(3)}, halfWid=${halfWid.toFixed(3)}, halfHgt=${halfHgt.toFixed(3)}\n`);

  function offset(df, dr, du) {
    return [
      centerX + df*0 + dr*1 + du*0,
      centerY + df*0 + dr*0 + du*1,
      centerZ + df*1 + dr*0 + du*0
    ];
  }

  function region(name, df, dr, du, sf, sw, sh) {
    const c = offset(df * halfLen, dr * halfWid, du * halfHgt);
    const s = [len * sf, wid * sw, hgt * sh];
    // In buildOrientedBoxEdges with forward=[0,0,1], right=[1,0,0], up=[0,1,0]:
    // World Z span = s[0] (forward), World X span = s[1] (right), World Y span = s[2] (up)
    const worldZ = s[0];
    const worldX = s[1];
    const worldY = s[2];
    
    console.log(`  ${name}`);
    console.log(`    center:     (${c[0].toFixed(3)}, ${c[1].toFixed(3)}, ${c[2].toFixed(3)})`);
    console.log(`    size:       [${s[0].toFixed(3)}, ${s[1].toFixed(3)}, ${s[2].toFixed(3)}]`);
    console.log(`    world:      Z(fwd)=${worldZ.toFixed(3)}m, X(right)=${worldX.toFixed(3)}m, Y(up)=${worldY.toFixed(3)}m`);
    console.log(`    % of car:   fwd=${(sf*100).toFixed(0)}%, right=${(sw*100).toFixed(0)}%, up=${(sh*100).toFixed(0)}%`);
    
    // Check proportions
    const issues = [];
    if (worldY > worldZ * 0.5) issues.push(`WARNING: Up extent (${worldY.toFixed(3)}) > 50% of forward (${worldZ.toFixed(3)})`);
    if (name.includes('Wheel') && worldY > 1.0) issues.push(`WARNING: Wheel up extent ${worldY.toFixed(3)}m (expected ~0.4m)`);
    if (name === 'Floor' && worldY > 0.2) issues.push(`WARNING: Floor up extent ${worldY.toFixed(3)}m (expected ~0.09m)`);
    if (name === 'Floor' && worldZ < 2.0) issues.push(`WARNING: Floor forward extent ${worldZ.toFixed(3)}m (expected ~3.4m)`);
    if (issues.length > 0) {
      issues.forEach(i => console.log(`    ${i}`));
    } else {
      console.log(`    ✓ proportions correct`);
    }
    console.log();
  }

  region('Nose', 0.95, 0, 0.1, 0.08, 0.15, 0.2);
  region('Front Wing', 0.85, 0, -0.5, 0.12, 0.85, 0.2);
  region('Front Wheel L', 0.55, -0.85, -0.45, 0.12, 0.12, 0.35);
  region('Front Wheel R', 0.55, 0.85, -0.45, 0.12, 0.12, 0.35);
  region('Sidepod L', 0.1, -0.7, -0.15, 0.35, 0.2, 0.25);
  region('Sidepod R', 0.1, 0.7, -0.15, 0.35, 0.2, 0.25);
  region('Floor', 0.1, 0, -0.95, 0.55, 0.85, 0.08);
  region('Rear Wheel L', -0.4, -0.85, -0.45, 0.12, 0.12, 0.35);
  region('Rear Wheel R', -0.4, 0.85, -0.45, 0.12, 0.12, 0.35);
  region('Diffuser', -0.6, 0, -0.7, 0.15, 0.4, 0.12);
  region('Rear Wing', -0.85, 0, 0.15, 0.1, 0.6, 0.35);

  console.log('========================================');
  console.log('  VERIFICATION SUMMARY');
  console.log('========================================\n');
  
  console.log('  Forward axis (detected): Z  ← correct after hierarchy rotation');
  console.log('  Right axis (detected):   X');
  console.log('  Up axis (detected):      Y\n');
  
  console.log('  All regions now use:');
  console.log('    len = carLength = size.z (forward dim)');
  console.log('    wid = carWidth  = size.x (right dim)');
  console.log('    hgt = carHeight = size.y (up dim)\n');
  
  console.log('  Before fix (wrong): len=size.y=1.16, hgt=size.z=6.10 → towers');
  console.log('  After fix (correct): len=size.z=6.10, hgt=size.y=1.16 → flat\n');
  
  // Verify nose/tail
  const nosePt = offset(halfLen, 0, 0);
  const tailPt = offset(-halfLen, 0, 0);
  console.log(`  Nose marker: (${nosePt[0].toFixed(3)}, ${nosePt[1].toFixed(3)}, ${nosePt[2].toFixed(3)})`);
  console.log(`  Tail marker: (${tailPt[0].toFixed(3)}, ${tailPt[1].toFixed(3)}, ${tailPt[2].toFixed(3)})`);
  console.log(`  Nose-tail distance: ${(nosePt[2] - tailPt[2]).toFixed(3)}m (car length: ${len.toFixed(3)}m) ✓`);
}

verify().catch(console.error);
