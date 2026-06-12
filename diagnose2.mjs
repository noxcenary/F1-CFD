import { Document, NodeIO } from '@gltf-transform/core';

async function diagnoseScene() {
  const io = new NodeIO();
  const doc = await io.read('./public/2025_f1_car.glb');
  const root = doc.getRoot();
  const scene = root.getDefaultScene();

  if (!scene) {
    console.log('No default scene found');
    return;
  }

  console.log('========================================');
  console.log('  SCENE HIERARCHY & TRANSFORMS');
  console.log('========================================\n');

  function printNode(node, depth = 0) {
    const indent = '  '.repeat(depth);
    const t = node.getTranslation();
    const r = node.getRotation();
    const s = node.getScale();
    const mesh = node.getMesh();
    const name = node.getName() || '(unnamed)';
    const children = node.listChildren();

    console.log(`${indent}▶ ${name}`);
    console.log(`${indent}  translation: (${t[0].toFixed(4)}, ${t[1].toFixed(4)}, ${t[2].toFixed(4)})`);
    console.log(`${indent}  rotation:    (${r[0].toFixed(4)}, ${r[1].toFixed(4)}, ${r[2].toFixed(4)}, ${r[3].toFixed(4)})`);
    console.log(`${indent}  scale:       (${s[0].toFixed(4)}, ${s[1].toFixed(4)}, ${s[2].toFixed(4)})`);
    if (mesh) {
      const prims = mesh.listPrimitives();
      const pos = prims[0]?.getAttribute('POSITION');
      console.log(`${indent}  mesh:        "${mesh.getName()}" (${prims.length} prims, ${pos ? pos.getCount() : 0} verts)`);
    }
    console.log(`${indent}  children:    ${children.length}\n`);

    for (const child of children) {
      printNode(child, depth + 1);
    }
  }

  const scenes = root.listScenes();
  console.log(`Number of scenes: ${scenes.length}`);
  console.log(`Default scene: ${scene.getName() || '(unnamed)'}\n`);

  const sceneChildren = scene.listChildren();
  for (const child of sceneChildren) {
    printNode(child);
  }

  // Check all root-level nodes
  const allNodes = root.listNodes();
  const nullParent = allNodes.filter(n => n.getParent() === null);
  console.log(`\nOrphan nodes (no parent): ${nullParent.length}`);
  for (const n of nullParent) {
    if (n !== scene) {
      console.log(`  - ${n.getName() || '(unnamed)'}`);
    }
  }

  // Compute transforms for all mesh-containing nodes
  console.log('\n========================================');
  console.log('  MESH NODES - WORLD TRANSFORMS');
  console.log('========================================\n');

  function getWorldTransform(node) {
    // Walk up to compute world transform
    // GLTF-Transform doesn't have built-in world matrix, so we compute manually
    const stack = [];
    let current = node;
    while (current) {
      stack.push({
        t: current.getTranslation(),
        r: current.getRotation(),
        s: current.getScale(),
      });
      current = current.getParent();
    }

    // Simple accumulation (ignoring full matrix math for now)
    // Accumulate translation, rotation, scale
    let wt = [0, 0, 0];
    let ws = [1, 1, 1];
    for (const frame of stack.reverse()) {
      wt[0] += frame.t[0] * ws[0];
      wt[1] += frame.t[1] * ws[1];
      wt[2] += frame.t[2] * ws[2];
      ws[0] *= frame.s[0];
      ws[1] *= frame.s[1];
      ws[2] *= frame.s[2];
    }

    return { translation: wt, scale: ws };
  }

  const meshes = root.listMeshes();
  for (const mesh of meshes) {
    const node = allNodes.find(n => n.getMesh() === mesh);
    if (!node) continue;
    const name = node.getName() || mesh.getName() || '(unnamed)';
    const prim = mesh.listPrimitives()[0];
    const pos = prim?.getAttribute('POSITION');
    if (!pos) continue;

    const localT = node.getTranslation();
    const localR = node.getRotation();
    const localS = node.getScale();
    const worldT = getWorldTransform(node);

    // Get first vertex as sample
    const arr = pos.getArray();
    const firstVert = arr ? [arr[0], arr[1], arr[2]] : '(no data)';

    console.log(`  ${name}`);
    console.log(`    local T:   (${localT[0].toFixed(3)}, ${localT[1].toFixed(3)}, ${localT[2].toFixed(3)})`);
    console.log(`    local R:   (${localR[0].toFixed(3)}, ${localR[1].toFixed(3)}, ${localR[2].toFixed(3)}, ${localR[3].toFixed(3)})`);
    console.log(`    local S:   (${localS[0].toFixed(3)}, ${localS[1].toFixed(3)}, ${localS[2].toFixed(3)})`);
    console.log(`    world T:   (${worldT.translation[0].toFixed(3)}, ${worldT.translation[1].toFixed(3)}, ${worldT.translation[2].toFixed(3)})`);
    console.log(`    world S:   (${worldT.scale[0].toFixed(3)}, ${worldT.scale[1].toFixed(3)}, ${worldT.scale[2].toFixed(3)})`);
    console.log(`    sample v:  (${firstVert[0]?.toFixed(3)}, ${firstVert[1]?.toFixed(3)}, ${firstVert[2]?.toFixed(3)})`);
    console.log(`    verts:     ${pos.getCount()}`);
    console.log();
  }
}

diagnoseScene().catch(console.error);
