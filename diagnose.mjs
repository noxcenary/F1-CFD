import { Document, NodeIO } from '@gltf-transform/core';

function vec3(arr) { return { x: arr[0], y: arr[1], z: arr[2] }; }

async function diagnose() {
  const io = new NodeIO();
  const doc = await io.read('./public/2025_f1_car.glb');
  const root = doc.getRoot();
  const meshes = root.listMeshes();

  // Compute overall bounding box in world space
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const mesh of meshes) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const arr = pos.getArray();
      if (!arr) continue;
      for (let i = 0; i < arr.length; i += 3) {
        minX = Math.min(minX, arr[i]); maxX = Math.max(maxX, arr[i]);
        minY = Math.min(minY, arr[i + 1]); maxY = Math.max(maxY, arr[i + 1]);
        minZ = Math.min(minZ, arr[i + 2]); maxZ = Math.max(maxZ, arr[i + 2]);
      }
    }
  }

  const size = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };

  console.log('========================================');
  console.log('  DIAGNOSTIC - VEHICLE BOUNDING BOX');
  console.log('========================================\n');
  console.log(`  World Bounds:`);
  console.log(`    X: ${minX.toFixed(3)} to ${maxX.toFixed(3)}  (width: ${size.x.toFixed(3)})`);
  console.log(`    Y: ${minY.toFixed(3)} to ${maxY.toFixed(3)}  (height: ${size.y.toFixed(3)})`);
  console.log(`    Z: ${minZ.toFixed(3)} to ${maxZ.toFixed(3)}  (depth: ${size.z.toFixed(3)})`);
  console.log(`  Center: (${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})\n`);

  // Determine axes (mirror of carCoordinateSystem.ts determineAxes)
  const dims = [
    { axis: 'x', value: size.x },
    { axis: 'y', value: size.y },
    { axis: 'z', value: size.z },
  ];
  dims.sort((a, b) => b.value - a.value);

  const longAxis = dims[0].axis;   // forward
  const shortAxis = dims[2].axis;  // up
  const midAxis = dims[1].axis;    // right

  const forward = [0,0,0]; forward[longAxis === 'x' ? 0 : longAxis === 'y' ? 1 : 2] = 1;
  const up = [0,0,0]; up[shortAxis === 'x' ? 0 : shortAxis === 'y' ? 1 : 2] = 1;
  const right = [0,0,0]; right[midAxis === 'x' ? 0 : midAxis === 'y' ? 1 : 2] = 1;

  // Dimension mapping (mirror of detectCarCoordinateSystem)
  const carLength = size.y;  // hardcoded world Y
  const carWidth = size.x;   // hardcoded world X
  const carHeight = size.z;  // hardcoded world Z

  console.log('========================================');
  console.log('  DETECTED COORDINATE SYSTEM');
  console.log('========================================\n');
  console.log(`  Sorted dimensions: long=${longAxis}, mid=${midAxis}, short=${shortAxis}`);
  console.log(`  forward axis:  [${forward}] (world ${longAxis})`);
  console.log(`  right axis:    [${right}] (world ${midAxis})`);
  console.log(`  up axis:       [${up}] (world ${shortAxis})\n`);
  console.log(`  carLength = size.y = ${carLength.toFixed(3)}  (forward axis = world Y ${forward[1] === 1 ? '✓ MATCH' : '✗ MISMATCH'})`);
  console.log(`  carWidth  = size.x = ${carWidth.toFixed(3)}  (right axis = world X ${right[0] === 1 ? '✓ MATCH' : '✗ MISMATCH'})`);
  console.log(`  carHeight = size.z = ${carHeight.toFixed(3)}  (up axis = world Z ${up[2] === 1 ? '✓ MATCH' : '✗ MISMATCH'})\n`);

  // Cross product check
  const cross = [
    forward[1]*up[2] - forward[2]*up[1],
    forward[2]*up[0] - forward[0]*up[2],
    forward[0]*up[1] - forward[1]*up[0],
  ];
  const crossMatch = Math.abs(cross[0] - right[0]) < 0.01 &&
                     Math.abs(cross[1] - right[1]) < 0.01 &&
                     Math.abs(cross[2] - right[2]) < 0.01;
  console.log(`  forward × up = [${cross.map(v=>v.toFixed(1))}]  ${crossMatch ? '✓ matches right' : '✗ does not match right'}\n`);

  // Build regions (mirror of aeroReferenceFrame.ts)
  const halfLen = carLength / 2;
  const halfWid = carWidth / 2;
  const halfHgt = carHeight / 2;

  function offset(df, dr, du) {
    return [
      center.x + df * forward[0] + dr * right[0] + du * up[0],
      center.y + df * forward[1] + dr * right[1] + du * up[1],
      center.z + df * forward[2] + dr * right[2] + du * up[2],
    ];
  }

  function region(name, df, dr, du, sf, sw, sh) {
    const c = offset(df * halfLen, dr * halfWid, du * halfHgt);
    const s = [carLength * sf, carWidth * sw, carHeight * sh];
    return { name, center: c, size: s, forward, right, up };
  }

  const regions = [
    region('Nose', 0.95, 0, 0.1, 0.08, 0.15, 0.2),
    region('Front Wing', 0.85, 0, -0.5, 0.12, 0.85, 0.2),
    region('Front Wheel L', 0.55, -0.85, -0.45, 0.12, 0.12, 0.35),
    region('Front Wheel R', 0.55, 0.85, -0.45, 0.12, 0.12, 0.35),
    region('Sidepod L', 0.1, -0.7, -0.15, 0.35, 0.2, 0.25),
    region('Sidepod R', 0.1, 0.7, -0.15, 0.35, 0.2, 0.25),
    region('Floor', 0.1, 0, -0.95, 0.55, 0.85, 0.08),
    region('Rear Wheel L', -0.4, -0.85, -0.45, 0.12, 0.12, 0.35),
    region('Rear Wheel R', -0.4, 0.85, -0.45, 0.12, 0.12, 0.35),
    region('Diffuser', -0.6, 0, -0.7, 0.15, 0.4, 0.12),
    region('Rear Wing', -0.85, 0, 0.15, 0.1, 0.6, 0.35),
  ];

  const nosePt = offset(1, 0, 0);
  const tailPt = offset(-1, 0, 0);

  function computeCorners(c, s, f, r, u) {
    const signs = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],
    ];
    const hx = s[0]/2, hy = s[1]/2, hz = s[2]/2;
    return signs.map(sg => [
      c[0] + sg[0]*hx*f[0] + sg[1]*hy*r[0] + sg[2]*hz*u[0],
      c[1] + sg[0]*hx*f[1] + sg[1]*hy*r[1] + sg[2]*hz*u[1],
      c[2] + sg[0]*hx*f[2] + sg[1]*hy*r[2] + sg[2]*hz*u[2],
    ]);
  }

  function fmt3(v) { return `(${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)})`; }
  function fmt(v) { return v.toFixed(2); }

  console.log('========================================');
  console.log('  NOSE / TAIL POSITIONS');
  console.log('========================================\n');
  console.log(`  Nose: ${fmt3(nosePt)}`);
  console.log(`  Tail: ${fmt3(tailPt)}`);
  console.log(`  Nose-tail distance: ${Math.sqrt((nosePt[0]-tailPt[0])**2 + (nosePt[1]-tailPt[1])**2 + (nosePt[2]-tailPt[2])**2).toFixed(3)}`);
  const fwdFromCenter = Math.sqrt((nosePt[0]-center.x)**2 + (nosePt[1]-center.y)**2 + (nosePt[2]-center.z)**2);
  console.log(`  Nose from center: ${fwdFromCenter.toFixed(3)} (expected ~${halfLen.toFixed(3)})\n`);

  console.log('========================================');
  console.log('  REGION ANALYSIS');
  console.log('========================================\n');

  for (const r of regions) {
    const corners = computeCorners(r.center, r.size, r.forward, r.right, r.up);
    const c = r.center;
    const s = r.size;

    let cx = 0, cy = 0, cz = 0;
    for (const cr of corners) { cx += cr[0]; cy += cr[1]; cz += cr[2]; }
    const rbCenter = [cx/8, cy/8, cz/8];

    let mnX = Infinity, mnY = Infinity, mnZ = Infinity;
    let mxX = -Infinity, mxY = -Infinity, mxZ = -Infinity;
    for (const cr of corners) {
      mnX = Math.min(mnX, cr[0]); mxX = Math.max(mxX, cr[0]);
      mnY = Math.min(mnY, cr[1]); mxY = Math.max(mxY, cr[1]);
      mnZ = Math.min(mnZ, cr[2]); mxZ = Math.max(mxZ, cr[2]);
    }

    // Expected center location description
    const fwdPct = ((c[1] - center.y) / halfLen * 100);
    const latPct = ((c[0] - center.x) / halfWid * 100);
    const vertPct = ((c[2] - center.z) / halfHgt * 100);

    console.log(`  ${r.name}`);
    console.log(`    center:    ${fmt3(c)}`);
    console.log(`    size:      (${fmt(s[0])}, ${fmt(s[1])}, ${fmt(s[2])})  [forward, right, up]`);
    console.log(`    rel pos:   fwd=${fwdPct.toFixed(0)}%, lat=${latPct.toFixed(0)}%, vert=${vertPct.toFixed(0)}%`);
    console.log(`    wld bnds:  X:[${fmt(mnX)},${fmt(mxX)}]  Y:[${fmt(mnY)},${fmt(mxY)}]  Z:[${fmt(mnZ)},${fmt(mxZ)}]`);
    console.log(`    corners:   ${fmt3(corners[0])} ${fmt3(corners[1])} ${fmt3(corners[2])} ${fmt3(corners[3])}`);
    console.log(`               ${fmt3(corners[4])} ${fmt3(corners[5])} ${fmt3(corners[6])} ${fmt3(corners[7])}`);
    console.log(`    size check: forward=${fmt(mxY - mnY)} (expected ${fmt(s[0])}), ` +
                `right=${fmt(mxX - mnX)} (expected ${fmt(s[1])}), ` +
                `up=${fmt(mxZ - mnZ)} (expected ${fmt(s[2])})`);

    // Validate position
    const fwdCheck = fwdPct > 50 ? 'front section' : fwdPct < -50 ? 'rear section' : 'mid section';
    const latCheck = Math.abs(latPct) < 15 ? 'near centerline' : latPct < 0 ? 'left side' : 'right side';
    const vertCheck = vertPct < -30 ? 'low (near ground)' : vertPct > 30 ? 'high' : 'mid-height';

    console.log(`    position:  ${fwdCheck}, ${latCheck}, ${vertCheck}\n`);
  }

  // Summary
  console.log('========================================');
  console.log('  VERIFICATION SUMMARY');
  console.log('========================================\n');
  console.log(`  Axis mapping: forward×up ${crossMatch ? '✓' : '✗'} right`);
  console.log(`  Dimension mapping: length=${longAxis}(forward), width=${midAxis}(right), height=${shortAxis}(up)\n`);

  const expectedLen = halfLen * 2;
  console.log(`  Expected car length: ${expectedLen.toFixed(3)} (halfLen=${halfLen.toFixed(3)})`);
  console.log(`  Nose-to-tail: ${Math.sqrt((nosePt[0]-tailPt[0])**2 + (nosePt[1]-tailPt[1])**2 + (nosePt[2]-tailPt[2])**2).toFixed(3)}\n`);

  // Check if regions are correctly positioned
  for (const r of regions) {
    const fwdPct = ((r.center[1] - center.y) / halfLen * 100);
    const latPct = ((r.center[0] - center.x) / halfWid * 100);
    const vertPct = ((r.center[2] - center.z) / halfHgt * 100);
    const name = r.name;

    let issues = [];
    if (name.includes('Floor') && vertPct > -30) issues.push('Floor should be low (vert < -30%)');
    if (name.includes('Sidepod') && Math.abs(latPct) < 30) issues.push('Sidepods should be laterally offset > 30%');
    if (name.includes('Nose') && fwdPct < 70) issues.push('Nose should be far forward (>70%)');
    if (name.includes('Rear Wing') && fwdPct > -70) issues.push('Rear wing should be far rear (< -70%)');
    if (name.includes('Front Wing') && fwdPct < 60) issues.push('Front wing should be far forward (>60%)');
    if (name.includes('Front Wheel') && (fwdPct < 30 || fwdPct > 70)) issues.push('Front wheels should be in front section (30-70%)');

    if (issues.length > 0) {
      console.log(`  ⚠ ${name}: ${issues.join('; ')}`);
    } else {
      console.log(`  ✓ ${name}: position looks reasonable`);
    }
  }

  console.log('');
}

diagnose().catch(console.error);
