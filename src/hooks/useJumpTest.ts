import { useCallback, useEffect, useRef, useState } from 'react';

import type { FlightTimeMetrics } from '@/lib/flightTime';
import type { JumpResult, JumpTestControls, JumpTestState } from '@/lib/jumpTest';

import type { KneeFlexionMetrics } from './useKneeFlexionMetrics';

// Two-step protocol: left leg then right leg. Each step waits for
// flightMetrics.jumpCount to tick, then snapshots the knee peak that landed
// with it (both metrics update on the same frame) before resetting the peak.
export function useJumpTest(params: {
  flightMetrics: FlightTimeMetrics;
  kneeMetrics: KneeFlexionMetrics;
  onResetPeak: () => void;
}): JumpTestControls {
  const { flightMetrics, kneeMetrics, onResetPeak } = params;

  const [state, setState] = useState<JumpTestState>({ kind: 'idle' });
  const resultsRef = useRef<JumpResult[]>([]);
  const jumpCountAtStepStart = useRef(0);

  // Keep latest values available to the effect without adding them to its
  // dependency array — we only want to react to jumpCount changing.
  const kneeMetricsRef = useRef(kneeMetrics);
  kneeMetricsRef.current = kneeMetrics;
  const flightMetricsRef = useRef(flightMetrics);
  flightMetricsRef.current = flightMetrics;
  const onResetPeakRef = useRef(onResetPeak);
  onResetPeakRef.current = onResetPeak;

  const start = useCallback(() => {
    onResetPeakRef.current();
    resultsRef.current = [];
    jumpCountAtStepStart.current = flightMetricsRef.current.jumpCount;
    setState({ kind: 'awaiting', leg: 'left', stepIndex: 1 });
  }, []);

  const cancel = useCallback(() => {
    resultsRef.current = [];
    onResetPeakRef.current();
    setState({ kind: 'idle' });
  }, []);

  const restart = useCallback(() => {
    resultsRef.current = [];
    onResetPeakRef.current();
    jumpCountAtStepStart.current = flightMetricsRef.current.jumpCount;
    setState({ kind: 'awaiting', leg: 'left', stepIndex: 1 });
  }, []);

  useEffect(() => {
    if (state.kind !== 'awaiting') return;
    if (flightMetrics.jumpCount <= jumpCountAtStepStart.current) return;

    const knee = kneeMetricsRef.current;
    const result: JumpResult = {
      leg: state.leg,
      peakFlexionDeg: knee.peakFlexionDeg,
      stanceLegDetected: knee.peakLeg,
      flightMs: flightMetrics.lastFlightMs ?? 0,
      timestamp: Date.now(),
    };
    resultsRef.current = [...resultsRef.current, result];
    onResetPeakRef.current();

    if (state.stepIndex === 1) {
      jumpCountAtStepStart.current = flightMetrics.jumpCount;
      setState({ kind: 'awaiting', leg: 'right', stepIndex: 2 });
    } else {
      setState({ kind: 'complete', results: resultsRef.current });
    }
  }, [flightMetrics, state]);

  return { state, start, cancel, restart };
}
