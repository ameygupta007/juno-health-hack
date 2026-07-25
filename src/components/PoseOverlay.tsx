import Svg, { Circle, Line } from 'react-native-svg';

import { BALANCE_COLORS, type BalanceMetrics } from '@/lib/balance';
import type { SupportLegMetrics } from '@/lib/supportLeg';
import { POSE_CONNECTIONS, type PoseFrame } from '@/types/pose';

type Props = {
  frame: PoseFrame | null;
  width: number;
  height: number;
  balance?: BalanceMetrics;
  support?: SupportLegMetrics;
};

const MIN_VISIBILITY = 0.5;

export function PoseOverlay({ frame, width, height, balance, support }: Props) {
  if (!frame) return null;

  const skeletonColor = balance ? BALANCE_COLORS[balance.state] : '#4ade80';

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {support?.groundScreenY !== null &&
      support?.groundScreenY !== undefined ? (
        <Line
          x1={0}
          y1={support.groundScreenY}
          x2={width}
          y2={support.groundScreenY}
          stroke="#22d3ee"
          strokeWidth={2}
          strokeDasharray="8,5"
          opacity={0.8}
        />
      ) : null}
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
            stroke={skeletonColor}
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
      {balance?.hipMidpoint && balance.ankleMidpoint ? (
        <>
          {/* Plumb line from center of mass down to the base of support. If
              the line is vertical, weight is stacked; if it slants, the CoM
              is drifting past the ankles. */}
          <Line
            x1={balance.hipMidpoint.x}
            y1={balance.hipMidpoint.y}
            x2={balance.ankleMidpoint.x}
            y2={balance.ankleMidpoint.y}
            stroke={skeletonColor}
            strokeWidth={2}
            strokeDasharray="6,4"
            opacity={0.7}
          />
          <Circle cx={balance.hipMidpoint.x} cy={balance.hipMidpoint.y} r={6} fill={skeletonColor} />
          <Circle
            cx={balance.ankleMidpoint.x}
            cy={balance.ankleMidpoint.y}
            r={6}
            fill="none"
            stroke={skeletonColor}
            strokeWidth={2}
          />
        </>
      ) : null}
    </Svg>
  );
}
