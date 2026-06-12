import { useState, useCallback } from 'react';
import type { DebugSettings } from '../types';
import { DEFAULT_CURVED_STREAMLINE_CONFIG } from '../types';

const DEFAULT_DEBUG: DebugSettings = {
  showWireframe: false,
  showBounds: false,
  showAeroShell: false,
  showAeroShellWireframe: false,
  showCoordSystem: false,
  showAeroFrame: false,
  showSeedingWalls: false,
  showSeedPoints: false,
  showStreamlines: false,
  showInfluenceField: false,
  showCurvedStreamlines: false,
  curvedStreamlineSteps: DEFAULT_CURVED_STREAMLINE_CONFIG.steps,
  curvedStreamlineStepSize: DEFAULT_CURVED_STREAMLINE_CONFIG.stepSize,
  showWakes: false,
};

export function useDebugSettings() {
  const [debug, setDebug] = useState<DebugSettings>(DEFAULT_DEBUG);

  const toggle = useCallback((key: keyof DebugSettings) => {
    setDebug((prev) => {
      const val = prev[key];
      if (typeof val === 'boolean') {
        return { ...prev, [key]: !val };
      }
      return prev;
    });
  }, []);

  const setValue = useCallback((key: keyof DebugSettings, value: number) => {
    setDebug((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { debug, toggle, setValue };
}
