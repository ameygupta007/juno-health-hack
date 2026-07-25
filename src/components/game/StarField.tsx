import Svg, { Circle, G, Line } from 'react-native-svg';

import type { Star } from '@/game/types';
import type { PoseFrame } from '@/types/pose';
import { POSE_LANDMARKS } from '@/types/pose';

type Props = {
  stars: Star[];
  width: number;
  height: number;
  frame: PoseFrame | null;
  now: number;
};

// Renders the star field plus glowing "catcher" markers on the wrists so the
// player knows what they're aiming with.
export function StarField({ stars, width, height, frame, now }: Props) {
  const leftWrist = frame?.landmarks[POSE_LANDMARKS.leftWrist];
  const rightWrist = frame?.landmarks[POSE_LANDMARKS.rightWrist];

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {stars.map((star) => {
        const life = Math.max(0, (star.expiresAt - now) / (star.expiresAt - star.spawnedAt));
        const radius = 14 + Math.sin((now - star.spawnedAt) / 200) * 3;
        return (
          <G key={star.id} opacity={0.5 + life * 0.5}>
            <Circle
              cx={star.x}
              cy={star.y}
              r={radius + 10}
              fill="#fde68a"
              opacity={0.2 * life}
            />
            <Circle cx={star.x} cy={star.y} r={radius} fill="#fde68a" />
            <Circle cx={star.x} cy={star.y} r={radius / 2} fill="#fff" />
            {/* Twinkle rays */}
            <Line
              x1={star.x - radius - 4}
              y1={star.y}
              x2={star.x + radius + 4}
              y2={star.y}
              stroke="#fff"
              strokeWidth={1.5}
              opacity={0.7}
            />
            <Line
              x1={star.x}
              y1={star.y - radius - 4}
              x2={star.x}
              y2={star.y + radius + 4}
              stroke="#fff"
              strokeWidth={1.5}
              opacity={0.7}
            />
          </G>
        );
      })}
      {leftWrist && leftWrist.visibility > 0.4 ? (
        <Catcher x={leftWrist.x} y={leftWrist.y} />
      ) : null}
      {rightWrist && rightWrist.visibility > 0.4 ? (
        <Catcher x={rightWrist.x} y={rightWrist.y} />
      ) : null}
    </Svg>
  );
}

function Catcher({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={30} fill="#38bdf8" opacity={0.18} />
      <Circle cx={x} cy={y} r={12} fill="#38bdf8" opacity={0.9} />
      <Circle cx={x} cy={y} r={6} fill="#fff" />
    </G>
  );
}
