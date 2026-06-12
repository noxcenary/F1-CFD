import { useState } from 'react';
import type { PerformanceStats, ModelAnalysisReport, DebugSettings, AeroShellStats } from '../types';

interface DebugPanelProps {
  stats: PerformanceStats;
  analysis: ModelAnalysisReport | null;
  debug: DebugSettings;
  onToggle: (key: keyof DebugSettings) => void;
  onSetValue?: (key: keyof DebugSettings, value: number) => void;
  shellStats: AeroShellStats | null;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="debug-toggle" onClick={onChange}>
      <span className="debug-toggle-label">{label}</span>
      <div className={`debug-toggle-switch ${value ? 'active' : 'inactive'}`} />
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="debug-row">
      <span className="debug-label">{label}</span>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-blue-500"
        />
        <span className="debug-value w-9 text-right">{value.toFixed(step < 0.1 ? 2 : 0)}</span>
      </div>
    </div>
  );
}

export function DebugPanel({ stats, analysis, debug, onToggle, onSetValue, shellStats }: DebugPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="debug-panel">
      <div
        className="flex justify-between items-center mb-2 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-white/70 font-semibold text-xs uppercase tracking-wider">
          Diagnostics
        </span>
        <span className="text-white/40 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <>
          <div className="debug-section">
            <div className="debug-section-title">Performance</div>
            <div className="debug-row">
              <span className="debug-label">FPS</span>
              <span className="debug-value">{stats.fps}</span>
            </div>
            <div className="debug-row">
              <span className="debug-label">Draw Calls</span>
              <span className="debug-value">{stats.drawCalls}</span>
            </div>
            <div className="debug-row">
              <span className="debug-label">Triangles</span>
              <span className="debug-value">{(stats.triangleCount / 1000).toFixed(1)}K</span>
            </div>
            <div className="debug-row">
              <span className="debug-label">Meshes</span>
              <span className="debug-value">{stats.meshCount}</span>
            </div>
          </div>

          {analysis && (
            <div className="debug-section">
              <div className="debug-section-title">Model</div>
              <div className="debug-row">
                <span className="debug-label">Nodes</span>
                <span className="debug-value">{analysis.nodeCount}</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Meshes</span>
                <span className="debug-value">{analysis.meshCount}</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Materials</span>
                <span className="debug-value">{analysis.materialCount}</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Polygons</span>
                <span className="debug-value">{(analysis.estimatedPolyCount / 1000).toFixed(1)}K</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Length</span>
                <span className="debug-value">{analysis.dimensions.overallLength.toFixed(3)}m</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Width</span>
                <span className="debug-value">{analysis.dimensions.overallWidth.toFixed(3)}m</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Height</span>
                <span className="debug-value">{analysis.dimensions.overallHeight.toFixed(3)}m</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Wheelbase</span>
                <span className="debug-value">{analysis.dimensions.wheelbase.toFixed(3)}m</span>
              </div>
              {shellStats && (
                <>
                  <div className="debug-row">
                    <span className="debug-label">Shell Tris</span>
                    <span className="debug-value">{(shellStats.triangleCount / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="debug-row">
                    <span className="debug-label">Shell Meshes</span>
                    <span className="debug-value">{shellStats.meshCount}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="debug-section">
            <div className="debug-section-title">Visualization</div>
            <Toggle label="Wireframe (model)" value={debug.showWireframe} onChange={() => onToggle('showWireframe')} />
            <Toggle label="Wireframe (shell)" value={debug.showAeroShellWireframe} onChange={() => onToggle('showAeroShellWireframe')} />
            <Toggle label="Bounding Box" value={debug.showBounds} onChange={() => onToggle('showBounds')} />
            <Toggle label="Aero Shell" value={debug.showAeroShell} onChange={() => onToggle('showAeroShell')} />
            <Toggle label="Coordinate System" value={debug.showCoordSystem} onChange={() => onToggle('showCoordSystem')} />
            <Toggle label="Aero Reference Frame" value={debug.showAeroFrame} onChange={() => onToggle('showAeroFrame')} />
            <Toggle label="Seeding Walls" value={debug.showSeedingWalls} onChange={() => onToggle('showSeedingWalls')} />
            <Toggle label="Seed Points" value={debug.showSeedPoints} onChange={() => onToggle('showSeedPoints')} />
            <Toggle label="Streamlines" value={debug.showStreamlines} onChange={() => onToggle('showStreamlines')} />
            <Toggle label="Influence Field" value={debug.showInfluenceField} onChange={() => onToggle('showInfluenceField')} />
            <Toggle label="Curved Streamlines" value={debug.showCurvedStreamlines} onChange={() => onToggle('showCurvedStreamlines')} />
            <Toggle label="Wakes" value={debug.showWakes} onChange={() => onToggle('showWakes')} />
            {debug.showCurvedStreamlines && onSetValue && (
              <div className="ml-2 mt-1 mb-1">
                <Slider label="Steps" value={debug.curvedStreamlineSteps} min={10} max={100} step={1} onChange={(v) => onSetValue('curvedStreamlineSteps', v)} />
                <Slider label="Step Sz" value={debug.curvedStreamlineStepSize} min={0.02} max={0.30} step={0.01} onChange={(v) => onSetValue('curvedStreamlineStepSize', v)} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
