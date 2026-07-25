import { useCallback, useEffect, useRef, useState } from 'react';

import type { FlightTimeMetrics } from '@/lib/flightTime';
import type { JumpResult, JumpTestControls, JumpTestState } from '@/lib/jumpTest';
import type { Leg } from '@/lib/kneeFlexion';

import type { KneeFlexionMetrics } from './useKneeFlexionMetrics';

// Two-step protocol: left leg then right leg. Each step waits for
// flightMetrics.jumpCount to tick, then snapshots the knee peak that landed
// with it (both metrics update on the same frame) before resetting the peak.
// Leg attribution uses the last stance seen while the user was confidently
// grounded (not `peakLeg`), because during takeoff / landing confirmation
// there's a lag window where stance can be transiently misdetected and locked
// into the peak tracker.
export function useJumpTest(params: {
  flightMetrics: FlightTimeMetrics;
  kneeMetrics: KneeFlexionMetrics;
  onResetPeak: () => void;
}): JumpTestControls {
  const { flightMetrics, kneeMetrics, onResetPeak } = params;

  const [state, setState] = useState<JumpTestState>({ kind: 'idle' });
  const resultsRef = useRef<JumpResult[]>([]);
  const jumpCountAtStepStart = useRef(0);
  const lastGroundedStanceRef = useRef<Leg | null>(null);

  const kneeMetricsRef = useRef(kneeMetrics);
  kneeMetricsRef.current = kneeMetrics;
  const flightMetricsRef = useRef(flightMetrics);
  flightMetricsRef.current = flightMetrics;
  const onResetPeakRef = useRef(onResetPeak);
  onResetPeakRef.current = onResetPeak;

  // Sample stance every frame — but only remember it when the user is
  // actually planted (phase === 'grounded'). Airborne / lost-tracking frames
  // are ignored so a mid-flight flicker can't overwrite the pre-jump stance.
  useEffect(() => {
    if (flightMetrics.phase !== 'grounded') return;
    if (kneeMetrics.stanceLeg === null) return;
    lastGroundedStanceRef.current = kneeMetrics.stanceLeg;
  }, [kneeMetrics.stanceLeg, flightMetrics.phase]);

  const start = useCallback(() => {
    onResetPeakRef.current();
    resultsRef.current = [];
    lastGroundedStanceRef.current = null;
    jumpCountAtStepStart.current = flightMetricsRef.current.jumpCount;
    setState({ kind: 'awaiting', leg: 'left', stepIndex: 1 });
  }, []);

  const cancel = useCallback(() => {
    resultsRef.current = [];
    lastGroundedStanceRef.current = null;
    onResetPeakRef.current();
    setState({ kind: 'idle' });
  }, []);

  const restart = useCallback(() => {
    resultsRef.current = [];
    lastGroundedStanceRef.current = null;
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
      stanceLegDetected: lastGroundedStanceRef.current,
      flightMs: flightMetrics.lastFlightMs ?? 0,
      timestamp: Date.now(),
    };
    resultsRef.current = [...resultsRef.current, result];
    onResetPeakRef.current();
    lastGroundedStanceRef.current = null;

    if (state.stepIndex === 1) {
      jumpCountAtStepStart.current = flightMetrics.jumpCount;
      setState({ kind: 'awaiting', leg: 'right', stepIndex: 2 });
    } else {
      setState({ kind: 'complete', results: resultsRef.current });
    }
  }, [flightMetrics, state]);

  return { state, start, cancel, restart };
}
