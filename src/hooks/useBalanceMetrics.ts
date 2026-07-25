import { useMemo, useRef } from 'react';

import { computeBalance, type BalanceMetrics } from '@/lib/balance';
import { POSE_LANDMARKS, type PoseFrame } from '@/types/pose';

const SWAY_WINDOW = 30; // ~1s of frames at 30fps

// Tracks hip-midpoint history across frames to compute postural sway (stddev
// of horizontal position). Keeping the ring buffer in a ref means recomputing
// balance doesn't trigger re-renders on its own.
export function useBalanceMetrics(frame: PoseFrame | null): BalanceMetrics {
  const historyRef = useRef<number[]>([]);

  return useMemo(() => {
    if (!frame) {
      historyRef.current = [];
      return computeBalance([], 0);
    }

    const leftHip = frame.landmarks[POSE_LANDMARKS.leftHip];
    const rightHip = frame.landmarks[POSE_LANDMARKS.rightHip];
    if (leftHip && rightHip) {
      const hipMidX = (leftHip.x + rightHip.x) / 2;
      const history = historyRef.current;
      history.push(hipMidX);
      if (history.length > SWAY_WINDOW) history.shift();
    }

    return computeBalance(frame.landmarks, stddev(historyRef.current));
  }, [frame]);
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}
