import Svg, { Circle, Line } from 'react-native-svg';

import { POSE_CONNECTIONS, type PoseFrame } from '@/types/pose';

type Props = {
  frame: PoseFrame | null;
  width: number;
  height: number;
};

const MIN_VISIBILITY = 0.5;

export function PoseOverlay({ frame, width, height }: Props) {
  if (!frame) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {POSE_CONNECTIONS.map(([a, b], i) => {
        const p1 = frame.landmarks[a];
        const p2 = frame.landmarks[b];
        if (!p1 || !p2) return null;
        if (p1.visibility < MIN_VISIBILITY || p2.visibility < MIN_VISIBILITY) return null;
        return (
          <Line
            key={`c-${i}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="#4ade80"
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
      {frame.landmarks.map((lm, i) =>
        lm.visibility < MIN_VISIBILITY ? null : (
          <Circle key={`p-${i}`} cx={lm.x} cy={lm.y} r={4} fill="#f97316" />
        ),
      )}
    </Svg>
  );
}
