import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import type { ActiveRailRun } from '@/game/types';
import { ALIGNMENT_COLORS, type KneeAlignment } from '@/lib/valgus';

type Props = {
  alignment: KneeAlignment;
  run: ActiveRailRun | null;
  width: number;
  height: number;
  now: number;
};

const MAX_LEAN_DEG = 20; // smoothedDeg magnitude at which the avatar is at the rail's edge
const MAX_OFFSET_PX = 70;
const RAIL_TOP = 70;
const RAIL_BOTTOM_PAD = 70;

// Renders the grind rail, the lean-sensitive avatar puck, and (when a stance
// leg is tracked) the real hip->ankle "safe line" with the knee marker, so
// the player can see exactly what's driving the lean.
export function RailField({ alignment, run, width, height, now }: Props) {
  if (width < 10 || height < 10) return null;

  const railX = width / 2;
  const railBottom = height - RAIL_BOTTOM_PAD;
  const color = ALIGNMENT_COLORS[alignment.state];

  const leanT = clamp(alignment.smoothedDeg / MAX_LEAN_DEG, -1, 1);
  const avatarX = railX + leanT * MAX_OFFSET_PX;

  const progress = run ? clamp((now - run.startedAt) / (run.endsAt - run.startedAt), 0, 1) : 0.5;
  const avatarY = RAIL_TOP + progress * (railBottom - RAIL_TOP);

  const isWipeout = !!run && now < run.wipeoutUntil;
  const shakeX = isWipeout ? Math.sin(now / 45) * 6 : 0;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {/* Rail + safe zone */}
      <Line x1={railX} y1={RAIL_TOP} x2={railX} y2={railBottom} stroke="#334155" strokeWidth={6} />
      <Rect
        x={railX - MAX_OFFSET_PX * 0.3}
        y={RAIL_TOP}
        width={MAX_OFFSET_PX * 0.6}
        height={railBottom - RAIL_TOP}
        fill="#4ade80"
        opacity={0.08}
      />

      {/* Real hip->ankle safe line + knee marker, when a stance leg is tracked */}
      {alignment.hip && alignment.knee && alignment.ankle && alignment.expectedKneeX != null ? (
        <G opacity={0.85}>
          <Line
            x1={alignment.hip.x}
            y1={alignment.hip.y}
            x2={alignment.ankle.x}
            y2={alignment.ankle.y}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6,4"
          />
          <Circle cx={alignment.expectedKneeX} cy={alignment.knee.y} r={5} fill="none" stroke={color} strokeWidth={2} />
          <Circle cx={alignment.knee.x} cy={alignment.knee.y} r={7} fill={color} />
        </G>
      ) : null}

      {/* Avatar puck riding the rail */}
      <G transform={`translate(${avatarX + shakeX}, ${avatarY})`}>
        <Circle r={26} fill={color} opacity={0.2} />
        <Circle r={16} fill={color} />
        <Circle r={7} fill="#fff" />
        {isWipeout ? <Circle r={34} fill="none" stroke="#ef4444" strokeWidth={3} opacity={0.8} /> : null}
      </G>
    </Svg>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
