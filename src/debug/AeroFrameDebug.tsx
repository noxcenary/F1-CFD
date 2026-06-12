import { Vector3 } from 'three';

interface AeroFrameDebugProps {
  center: [number, number, number];
  forward: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
}

const ARROW_LENGTH = 1.5;
const HEAD_LENGTH = 0.25;
const HEAD_WIDTH = 0.12;

export function AeroFrameDebug({ center, forward, right, up }: AeroFrameDebugProps) {
  const origin = new Vector3(center[0], center[1], center[2]);
  const forwardVec = new Vector3(forward[0], forward[1], forward[2]).normalize();
  const rightVec = new Vector3(right[0], right[1], right[2]).normalize();
  const upVec = new Vector3(up[0], up[1], up[2]).normalize();

  return (
    <group>
      <arrowHelper args={[forwardVec, origin, ARROW_LENGTH, '#ff2222', HEAD_LENGTH, HEAD_WIDTH]} />
      <arrowHelper args={[rightVec, origin, ARROW_LENGTH, '#22ff22', HEAD_LENGTH, HEAD_WIDTH]} />
      <arrowHelper args={[upVec, origin, ARROW_LENGTH, '#2288ff', HEAD_LENGTH, HEAD_WIDTH]} />
    </group>
  );
}
