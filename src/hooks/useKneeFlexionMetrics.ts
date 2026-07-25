import { useEffect, useMemo, useRef } from 'react';

import {
  computeKneeFlexionDeg,
  detectStanceLeg,
  type Leg,
} from '@/lib/kneeFlexion';
import type { PoseFrame } from '@/types/pose';

type KneeFlexionMetrics = {
  stanceLeg: Leg | null;
  airborneLeg: Leg | null;
  currentAngleDeg: number | null;
  peakFlexionDeg: number | null;
  peakLeg: Leg | null;
  peakTimestamp: number | null;
};

// Peak flexion is the tightest (minimum) angle seen since the last reset —
// deepest squat point during a jump landing. We only consider frames where a
// clear stance leg is detected, so a symmetric two-foot stance doesn't
// contaminate a one-leg-jump measurement. Peak is stored per-jump; whichever
// leg registers the tightest angle wins peakLeg.
export function useKneeFlexionMetrics(
  frame: PoseFrame | null,
  resetKey: number,
): KneeFlexionMetrics {
  const peakRef = useRef<{ leg: Leg | null; angle: number | null; timestamp: number | null }>({
    leg: null,
    angle: null,
    timestamp: null,
  });

  useEffect(() => {
    peakRef.current = { leg: null, angle: null, timestamp: null };
  }, [resetKey]);

  return useMemo(() => {
    if (!frame) {
      return {
        stanceLeg: null,
        airborneLeg: null,
        currentAngleDeg: null,
        peakFlexionDeg: peakRef.current.angle,
        peakLeg: peakRef.current.leg,
        peakTimestamp: peakRef.current.timestamp,
      };
    }

    const stanceLeg = detectStanceLeg(frame.normalizedLandmarks);
    const { angleDeg } =
      stanceLeg === null
        ? { angleDeg: null }
        : computeKneeFlexionDeg(frame.normalizedLandmarks, stanceLeg);

    if (angleDeg !== null && stanceLeg !== null) {
      const prev = peakRef.current.angle;
      if (prev === null || angleDeg < prev) {
        peakRef.current = { leg: stanceLeg, angle: angleDeg, timestamp: frame.timestamp };
      }
    }

    return {
      stanceLeg,
      airborneLeg:
        stanceLeg === null ? null : stanceLeg === 'left' ? 'right' : 'left',
      currentAngleDeg: angleDeg,
      peakFlexionDeg: peakRef.current.angle,
      peakLeg: peakRef.current.leg,
      peakTimestamp: peakRef.current.timestamp,
    };
  }, [frame]);
}
