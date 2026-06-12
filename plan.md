# arvar1 — F1 Aerodynamic Visualization Platform

## Project Plan & Phase Log

---

## Architecture Overview

```
arvar1/
├── src/
│   ├── systems/         # Pure computation modules (no React)
│   │   ├── influenceField.ts      — 9 influence sources, Gaussian ellipsoids, velocity sampling
│   │   ├── wakes.ts               — Wake ribbon geometry with vortex simulation
│   │   ├── streamlines.ts         — Straight streamline segments
│   │   ├── curvedStreamlines.ts   — Euler-integrated flow-adapted streamlines
│   │   ├── aeroShell.ts           — Voxel-based surface shell extraction
│   │   ├── aeroReferenceFrame.ts  — 11 aerodynamic regions (nose→rear wing)
│   │   ├── carCoordinateSystem.ts — Auto-detection of car axes from bounding box
│   │   ├── seedingWallSystem.ts   — Floor-based seeding walls + seed points
│   │   └── modelOptimizer.ts      — Geometry merging for performance
│   ├── visualization/   # R3F React components for 3D rendering
│   ├── debug/           # Debug panel UI and state management
│   ├── types/index.ts   # TypeScript interfaces and default config constants
│   ├── utils/           # Model analysis and dimension helpers
│   └── hooks/           # Performance probe hooks
├── public/
│   └── 2025_f1_car.glb  # F1 car 3D model (primary asset)
├── diagnose.mjs         # GLTF bounding box & coordinate system diagnostic
├── diagnose2.mjs        # Scene hierarchy & transform diagnostic
└── verify.mjs           # Numerical verification of corrected aero frame dimensions
```

---

## Phase Log

### Phase 1 — Project Scaffolding & Model Loading
- Initialized React + TypeScript + Vite project
- Integrated Three.js via @react-three/fiber and @react-three/drei
- Loaded 2025 F1 car GLB model, configured lighting and environment
- Established basic scene structure (Canvas, Ground, OrbitControls)

### Phase 2 — Car Coordinate System & Reference Frame
- Implemented `carCoordinateSystem.ts` — auto-detects forward/right/up axes from bounding box extents
- Implemented `aeroReferenceFrame.ts` — defined 11 aerodynamic regions (Nose, Front Wing, Front Wheels L/R, Sidepods L/R, Floor, Rear Wheels L/R, Diffuser, Rear Wing)
- Verified region positions via `verify.mjs` against model hierarchy transforms

### Phase 3 — Surface Shell & Seeding System
- Implemented `aeroShell.ts` — voxel-based surface extraction (100K samples, 48³ grid)
- Implemented `seedingWallSystem.ts` — 16 seeding walls (8 per side) along floor region
- Implemented `seedPoints` — 144 seed points (16 walls × 3×3 grid)
- Built DebugPanel with 12 toggle switches for all visualization layers
- Implemented `modelOptimizer.ts` for geometry merging

### Phase 4A — Core Flow Visualization
- Implemented `streamlines.ts` — straight streamline segments from seed points
- Implemented `curvedStreamlines.ts` — Euler integration (40 steps, stepSize 0.12)
- Built `StreamlineDebug.tsx` and `CurvedStreamlineDebug.tsx` renderers
- Added curved streamline parameter sliders to DebugPanel

### Phase 4B — Influence Field & Wake Calibration

#### 4B.1 — Influence Field Construction
- Implemented `influenceField.ts` — 9 influence sources with Gaussian ellipsoid parameters
- Each source: position, direction, strength, forward/lateral/vertical radii
- Per-type config: strengthMult (0.5–2.5), fwdFactor (1.5–3.0), latFactor (1.0–2.0), vertFactor (2.0–5.0)
- Source directions: diffuser upwash, rear wing downwash + inward, wheels outward + up, sidepods outward + up
- Built `InfluenceFieldDebug.tsx` — source markers, ellipsoid wireframes, velocity arrows

#### 4B.2 — Wake System
- Implemented `wakes.ts` — 8 wake emitters (Front Wing Tip ×2, Front Wheel ×2, Diffuser ×2, Rear Wing Tip ×2)
- Wake ribbon geometry: Euler-advected paths through influence field
- Configurable per-emitter: initialStrength, decayFactor, expansionRate, strandCount
- Tip vortex support: vortexRadius, vortexRate, vortexVerticalAspect
- Core strand: stronger initial strength, slower decay, brighter color
- Single draw call architecture with Float32Array positions/colors

#### 4B.3 — Straight & Curved Streamline Integration
- Streamlines use seed points → Euler integration through influence field
- Curved streamlines show flow path deformation around car surfaces
- Visual verification: front wing influence, wheel wakes, sidepod guidance, diffuser wake sheet

#### 4B.4 — Parameter Calibration Pass
- Adjusted influence field strengths for balanced aerodynamic behavior
- Verified: streamline direction correct, front wing influence visible, wheel interaction visible, sidepod guidance visible, diffuser wake sheet visible

#### 4B.5 — Calibration Review & Phase Gate
- **Decision: Calibration Complete → Proceed to Phase 4C**
- All 5 review criteria passed
- Front wing, wheel, sidepod, diffuser, rear wing all producing expected aerodynamic structures
- No excessive strength, no unnatural kinks, no wake detachment

---

### Phase 4C — Enhanced Tip Vortex Structures (CURRENT)

**Objective:** Increase visual identity of wing-generated tip vortices while preserving existing architecture.

#### Changes to `src/systems/wakes.ts`:

| Parameter | Front Wing Tip (Before) | Front Wing Tip (After) | Rear Wing Tip (Before) | Rear Wing Tip (After) |
|---|---|---|---|---|
| `vortexRadius` | 0.06 | **0.10** | 0.08 | **0.12** |
| `coreStrength` | 1.3 | **1.5** | 1.3 | **1.5** |
| `strandCount` | 3 | **5** | 3 | **5** |
| `strandWeights` | — | **[1.0, 0.75, 1.5, 0.75, 1.0]** | — | **[1.0, 0.75, 1.5, 0.75, 1.0]** |
| `vortexRate` | 0.3 | 0.3 (unchanged) | 0.25 | 0.25 (unchanged) |

#### New Interface Field
```typescript
interface WakeEmitterConfig {
  // ...existing fields...
  strandWeights?: number[];  // per-strand intensity multipliers
}
```

#### Strand Layout (5-strand):
| Index | Role | Offset | Weight | Helical Motion |
|---|---|---|---|---|
| 0 | Outer Left | -1.0 | 1.0 | Yes |
| 1 | Inner Left | -0.5 | 0.75 | Yes |
| 2 | Core | 0.0 | 1.5 | No (straight) |
| 3 | Inner Right | 0.5 | 0.75 | Yes |
| 4 | Outer Right | 1.0 | 1.0 | Yes |

#### Unchanged:
- Wheel wakes: 3 strands, no vortex
- Diffuser wakes: 3 strands, no vortex, reads as wake sheet
- Front Wing, Rear Wheel, Sidepod, Diffuser influence field sources
- Euler advection, line segment rendering, single draw call

**Status:** ✅ Complete

---

### Phase 4C.1 — Ground Penetration Audit (Diagnostic)

**Diagnosis:** B) Integration drift — lowest seed row (~⅓ of seeds) starts below `minY` due to wall height (0.15) exceeding floor region vertical half-size (~0.04 × carHeight); rear wing downwash (40% downward, strengthMult 2.5) compounds drift over 40 steps.

**Status:** ✅ Complete (no code changes)

---

### Phase 4C.2 — Seed Volume Correction

**Objective:** Remove underground seed generation. No aerodynamic changes.

**Change to `src/systems/seedingWallSystem.ts`:**

- New `vertShift = max(0, wallHeight/2 - regionVerticalSize/2)` added to wall position along the up axis
- Lowest seed row (tHgt = -0.5) now aligns with `region.minY` instead of extending below it

**Parameter values for default config:**
| Before | After |
|---|---|
| Lowest seed Y = floorCenterY - 0.075 | Lowest seed Y = floorCenterY + vertShift - 0.075 = region.minY |
| ~33% of seeds below ground | **0 seeds below ground** ✅ |

**Files Modified:** `src/systems/seedingWallSystem.ts` only

**Status:** ✅ Complete

---

## Files Modified

| Phase | File | Change |
|---|---|---|
| 4C | `src/systems/wakes.ts` | vortexRadius ↑, coreStrength ↑, strandCount 3→5, strandWeights added, intensity logic updated |
| 4C.2 | `src/systems/seedingWallSystem.ts` | vertShift added — walls shifted upward to align lowest seed row with region.minY |
| — | `plan.md` | Created and maintained |

---

## Verification Commands

```bash
npx tsc --noEmit    # TypeScript compile check
npm run build       # Production build
```

---

## Success Criteria Status

| Criterion | Status |
|---|---|
| Front wing vortices clearly recognizable | ✅ |
| Rear wing vortices clearly recognizable | ✅ |
| Wake cores visibly persistent | ✅ |
| Diffuser wake unchanged | ✅ |
| Architecture unchanged | ✅ |
| Performance effectively unchanged | ✅ (same draw call, same shader) |
