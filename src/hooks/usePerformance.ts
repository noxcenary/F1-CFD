import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerformanceStats } from '../types';

export function usePerformance() {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    drawCalls: 0,
    triangleCount: 0,
    meshCount: 0,
  });

  useEffect(() => {
    let animId: number;

    const tick = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
        setStats((prev) => ({ ...prev, fps }));
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  return stats;
}

export function useRendererProbe(
  onUpdate: (info: { drawCalls: number; triangles: number }) => void
) {
  const { gl } = useThree();
  const lastUpdateRef = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - lastUpdateRef.current < 500) return;
    lastUpdateRef.current = now;

    const renderInfo = gl.info;
    onUpdate({
      drawCalls: renderInfo.render?.calls ?? 0,
      triangles: renderInfo.render?.triangles ?? 0,
    });
  });
}
