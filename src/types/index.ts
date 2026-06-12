export interface BoundingBox {
  width: number;
  height: number;
  depth: number;
}

export interface ModelDimensions {
  overallLength: number;
  overallWidth: number;
  overallHeight: number;
  wheelbase: number;
  center: [number, number, number];
}

export interface ModelAnalysisReport {
  nodeCount: number;
  meshCount: number;
  materialCount: number;
  boundingBox: BoundingBox;
  boundingSphereRadius: number;
  estimatedPolyCount: number;
  dimensions: ModelDimensions;
}

export interface SeedingWallConfig {
  wallsPerSide: number;
  wallHeight: number;
  wallLength: number;
  wallThickness: number;
  startOffset: number;
  endOffset: number;
  angleDeg: number;
  opacity: number;
}

export interface SeedingWallInstance {
  position: [number, number, number];
  rotation: number;
  size: [number, number, number];
}

export interface SeedingWallSystem {
  walls: SeedingWallInstance[];
  config: SeedingWallConfig;
  orientation: CarAxis;
}

export interface SeedPoint {
  position: [number, number, number];
  direction: [number, number, number];
  wallId: number;
}

export interface SeedDensityConfig {
  pointsAlongLength: number;
  pointsAlongHeight: number;
  offsetFromSurface: number;
}

export const DEFAULT_SEED_DENSITY: SeedDensityConfig = {
  pointsAlongLength: 3,
  pointsAlongHeight: 3,
  offsetFromSurface: 0.01,
};

export interface StreamlineConfig {
  length: number;
  segments: number;
}

export const DEFAULT_STREAMLINE_CONFIG: StreamlineConfig = {
  length: 0.5,
  segments: 8,
};

export interface InfluenceSource {
  position: [number, number, number];
  direction: [number, number, number];
  strength: number;
  forwardRadius: number;
  lateralRadius: number;
  verticalRadius: number;
  sourceType: string;
  orientation: CarAxis;
}

export interface InfluenceField {
  sources: InfluenceSource[];
  freestream: [number, number, number];
}

export interface CurvedStreamlineConfig {
  steps: number;
  stepSize: number;
}

export const DEFAULT_CURVED_STREAMLINE_CONFIG: CurvedStreamlineConfig = {
  steps: 40,
  stepSize: 0.12,
};

export interface DebugSettings {
  showWireframe: boolean;
  showBounds: boolean;
  showAeroShell: boolean;
  showAeroShellWireframe: boolean;
  showCoordSystem: boolean;
  showAeroFrame: boolean;
  showSeedingWalls: boolean;
  showSeedPoints: boolean;
  showStreamlines: boolean;
  showInfluenceField: boolean;
  showCurvedStreamlines: boolean;
  curvedStreamlineSteps: number;
  curvedStreamlineStepSize: number;
  showWakes: boolean;
}

export interface PerformanceStats {
  fps: number;
  drawCalls: number;
  triangleCount: number;
  meshCount: number;
}

export interface CarAxis {
  forward: [number, number, number];
  backward: [number, number, number];
  up: [number, number, number];
  down: [number, number, number];
  right: [number, number, number];
  left: [number, number, number];
}

export interface CarCoordinateSystem {
  axes: CarAxis;
  origin: [number, number, number];
  scale: number;
  dimensions: {
    carLength: number;
    carWidth: number;
    carHeight: number;
    wheelbase: number;
  };
}

export interface AeroRegion {
  name: string;
  center: [number, number, number];
  size: [number, number, number];
  orientation: CarAxis;
}

export interface AeroReferenceFrame {
  nose: [number, number, number];
  tail: [number, number, number];
  noseRegion: AeroRegion;
  frontWingRegion: AeroRegion;
  frontWheelLeft: AeroRegion;
  frontWheelRight: AeroRegion;
  sidepodLeft: AeroRegion;
  sidepodRight: AeroRegion;
  floorRegion: AeroRegion;
  rearWheelLeft: AeroRegion;
  rearWheelRight: AeroRegion;
  diffuserRegion: AeroRegion;
  rearWingRegion: AeroRegion;
}

export const DEFAULT_SEEDING_WALL_CONFIG: SeedingWallConfig = {
  wallsPerSide: 8,
  wallHeight: 0.15,
  wallLength: 0.3,
  wallThickness: 0.02,
  startOffset: -0.5,
  endOffset: 0.9,
  angleDeg: 8,
  opacity: 0.7,
};

export interface AeroShellStats {
  triangleCount: number;
  meshCount: number;
}
