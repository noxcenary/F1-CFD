import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Environment } from '../visualization/Environment';
import { Ground } from '../visualization/Ground';
import { F1Car } from '../visualization/F1Car';
import { DebugPanel } from '../debug/DebugPanel';
import { useDebugSettings } from '../debug/useDebug';
import { usePerformance, useRendererProbe } from '../hooks/usePerformance';
import type { ModelAnalysisReport, DebugSettings, AeroShellStats } from '../types';

function Probe({ onInfo }: { onInfo: (info: { drawCalls: number; triangles: number }) => void }) {
  useRendererProbe(onInfo);
  return null;
}

function SceneContent({
  onAnalysis,
  onMeshCount,
  onShellStats,
  onRendererInfo,
  debug,
}: {
  onAnalysis: (report: ModelAnalysisReport) => void;
  onMeshCount: (count: number) => void;
  onShellStats: (stats: AeroShellStats) => void;
  onRendererInfo: (info: { drawCalls: number; triangles: number }) => void;
  debug: DebugSettings;
}) {
  return (
    <>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={30}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.5, 0]}
      />
      <Environment />
      <Ground />
      <F1Car
        onAnalysis={onAnalysis}
        onMeshCount={onMeshCount}
        onShellStats={onShellStats}
        debug={debug}
      />
      <Probe onInfo={onRendererInfo} />
    </>
  );
}

export function App() {
  const [analysis, setAnalysis] = useState<ModelAnalysisReport | null>(null);
  const [meshCount, setMeshCount] = useState(0);
  const [shellStats, setShellStats] = useState<AeroShellStats>({ triangleCount: 0, meshCount: 0 });
  const [rendererInfo, setRendererInfo] = useState({ drawCalls: 0, triangles: 0 });
  const { debug, toggle, setValue } = useDebugSettings();
  const stats = usePerformance();

  const handleAnalysis = useCallback((report: ModelAnalysisReport) => {
    setAnalysis(report);
  }, []);

  const handleMeshCount = useCallback((count: number) => {
    setMeshCount(count);
  }, []);

  const handleShellStats = useCallback((stats: AeroShellStats) => {
    setShellStats(stats);
  }, []);

  const handleRendererInfo = useCallback((info: { drawCalls: number; triangles: number }) => {
    setRendererInfo(info);
  }, []);

  const syncedStats = {
    ...stats,
    drawCalls: rendererInfo.drawCalls,
    triangleCount: rendererInfo.triangles,
    meshCount,
  };

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{
          position: [8, 5, 8],
          fov: 40,
          near: 0.1,
          far: 100,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#111118');
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = 1;
        }}
      >
        <SceneContent
          onAnalysis={handleAnalysis}
          onMeshCount={handleMeshCount}
          onShellStats={handleShellStats}
          onRendererInfo={handleRendererInfo}
          debug={debug}
        />
      </Canvas>
      <DebugPanel
        stats={syncedStats}
        analysis={analysis}
        debug={debug}
        onToggle={toggle}
        onSetValue={setValue}
        shellStats={shellStats}
      />
    </div>
  );
}
