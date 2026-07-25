import { useEffect, useMemo, useRef } from 'react';

import {
  computeKneeFlexionDeg,
  detectStanceLeg,
  type Leg,
} from '@/lib/kneeFlexion';
import { createOneEuroFilter, type OneEuroFilter } from '@/lib/oneEuroFilter';
import type { PoseFrame } from '@/types/pose';

export type KneeFlexionMetrics = {
  stanceLeg: Leg | null;
  airborneLeg: Leg | null;
  currentAngleDeg: number | null;
  peakFlexionDeg: number | null;
  peakLeg: Leg | null;
  peakTimestamp: number | null;
};

// Sustain window: a new peak only commits when the last N smoothed angles all
// sit at or below it. Guards against a single bad frame locking in an
// unrealistically deep peak that never recovers.
const SUSTAIN_FRAMES = 3;

// Peak flexion is the tightest (minimum) angle since the last reset — deepest
// point of a jump landing. Only considered when a clear stance leg is detected
// so a symmetric two-foot stance doesn't contaminate a one-leg measurement.
// Pass pausePeakTracking=true (typically while airborne) to keep the current
// angle updating for display but skip peak commits — during flight the raised
// leg's drawn-up knee is often tighter than the jumping leg's, and stance
// detection is unreliable, so peaks captured mid-air get attributed to the
// wrong leg.
export function useKneeFlexionMetrics(
  frame: PoseFrame | null,
  resetKey: number,
  pausePeakTracking = false,
): KneeFlexionMetrics {
  const filterRef = useRef<OneEuroFilter>(createOneEuroFilter());
  const windowRef = useRef<number[]>([]);
  const prevLegRef = useRef<Leg | null>(null);
  const peakRef = useRef<{ leg: Leg | null; angle: number | null; timestamp: number | null }>({
    leg: null,
    angle: null,
    timestamp: null,
  });
  // Read via ref so the memo only re-runs per new frame; otherwise a pause
  // toggle between frames would re-push the same smoothed angle into the
  // sustain window.
  const pauseRef = useRef(pausePeakTracking);
  pauseRef.current = pausePeakTracking;

  useEffect(() => {
    filterRef.current.reset();
    windowRef.current = [];
    prevLegRef.current = null;
    peakRef.current = { leg: null, angle: null, timestamp: null };
  }, [resetKey]);

  return useMemo(() => {
    const peakSnapshot = () => ({
      peakFlexionDeg: peakRef.current.angle,
      peakLeg: peakRef.current.leg,
      peakTimestamp: peakRef.current.timestamp,
    });

    if (!frame) {
      return {
        stanceLeg: null,
        airborneLeg: null,
        currentAngleDeg: null,
        ...peakSnapshot(),
      };
    }

    const stanceLeg = detectStanceLeg(frame.normalizedLandmarks);
    const airborneLeg =
      stanceLeg === null ? null : stanceLeg === 'left' ? 'right' : 'left';

    // If the stance leg changes, the smoother's history is from a different
    // angle series and would spuriously interpolate across the switch. Reset.
    if (stanceLeg !== prevLegRef.current) {
      filterRef.current.reset();
      windowRef.current = [];
      prevLegRef.current = stanceLeg;
    }

    if (stanceLeg === null) {
      return { stanceLeg: null, airborneLeg: null, currentAngleDeg: null, ...peakSnapshot() };
    }

    const { angleDeg } = computeKneeFlexionDeg(frame.normalizedLandmarks, stanceLeg);
    if (angleDeg === null) {
      return { stanceLeg, airborneLeg, currentAngleDeg: null, ...peakSnapshot() };
    }

    const smoothed = filterRef.current.filter(angleDeg, frame.timestamp);

    const win = windowRef.current;
    win.push(smoothed);
    if (win.length > SUSTAIN_FRAMES) win.shift();

    if (win.length === SUSTAIN_FRAMES && !pauseRef.current) {
      // Peak-candidate is the WORST (largest) angle in the window — i.e. the
      // best angle that has held across the whole window. A one-frame outlier
      // can't be the max of a window it doesn't dominate.
      const worst = Math.max(...win);
      const prev = peakRef.current.angle;
      if (prev === null || worst < prev) {
        peakRef.current = { leg: stanceLeg, angle: worst, timestamp: frame.timestamp };
      }
    }

    return { stanceLeg, airborneLeg, currentAngleDeg: smoothed, ...peakSnapshot() };
  }, [frame]);
}
