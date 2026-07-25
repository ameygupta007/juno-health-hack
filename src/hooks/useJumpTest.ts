import { useCallback, useEffect, useRef, useState } from 'react';

import type { FlightTimeMetrics } from '@/lib/flightTime';
import type { JumpResult, JumpTestControls, JumpTestState } from '@/lib/jumpTest';
import type { Leg } from '@/lib/kneeFlexion';
import type { SupportLegMetrics } from '@/lib/supportLeg';

import type { KneeFlexionMetrics } from './useKneeFlexionMetrics';

export function useJumpTest(params: {
  flightMetrics: FlightTimeMetrics;
  kneeMetrics: KneeFlexionMetrics;
  supportMetrics: SupportLegMetrics;
  onResetPeak: () => void;
  onLockSupport: () => Leg | null;
  onUnlockSupport: () => void;
}): JumpTestControls {
  const {
    flightMetrics,
    kneeMetrics,
    supportMetrics,
    onResetPeak,
    onLockSupport,
    onUnlockSupport,
  } = params;

  const [state, setState] = useState<JumpTestState>({ kind: 'idle' });
  const resultsRef = useRef<JumpResult[]>([]);
  const jumpCountAtStepStart = useRef(0);

  const kneeMetricsRef = useRef(kneeMetrics);
  kneeMetricsRef.current = kneeMetrics;
  const flightMetricsRef = useRef(flightMetrics);
  flightMetricsRef.current = flightMetrics;
  const supportMetricsRef = useRef(supportMetrics);
  supportMetricsRef.current = supportMetrics;
  const onResetPeakRef = useRef(onResetPeak);
  onResetPeakRef.current = onResetPeak;
  const onLockSupportRef = useRef(onLockSupport);
  onLockSupportRef.current = onLockSupport;
  const onUnlockSupportRef = useRef(onUnlockSupport);
  onUnlockSupportRef.current = onUnlockSupport;

  // Arm only after the requested anatomical support side has remained stable
  // for 500ms. The tracker then locks that side until this step completes.
  useEffect(() => {
    if (state.kind !== 'awaiting' || state.supportReady) return;
    const expected =
      state.leg === 'left' ? 'LEFT_SUPPORT' : 'RIGHT_SUPPORT';
    if (supportMetrics.state !== expected || supportMetrics.stableForMs < 500) return;
    if (onLockSupportRef.current() !== state.leg) return;

    jumpCountAtStepStart.current = flightMetricsRef.current.jumpCount;
    setState({ ...state, supportReady: true });
  }, [state, supportMetrics]);

  const start = useCallback(() => {
    onResetPeakRef.current();
    onUnlockSupportRef.current();
    resultsRef.current = [];
    jumpCountAtStepStart.current = flightMetricsRef.current.jumpCount;
    setState({
      kind: 'awaiting',
      leg: 'left',
      stepIndex: 1,
      supportReady: false,
    });
  }, []);

  const cancel = useCallback(() => {
    resultsRef.current = [];
    onUnlockSupportRef.current();
    onResetPeakRef.current();
    setState({ kind: 'idle' });
  }, []);

  const restart = useCallback(() => {
    resultsRef.current = [];
    onUnlockSupportRef.current();
    onResetPeakRef.current();
    jumpCountAtStepStart.current = flightMetricsRef.current.jumpCount;
    setState({
      kind: 'awaiting',
      leg: 'left',
      stepIndex: 1,
      supportReady: false,
    });
  }, []);

  useEffect(() => {
    if (state.kind !== 'awaiting') return;
    if (!state.supportReady) {
      // A hop before the 500ms support hold does not belong to this trial.
      jumpCountAtStepStart.current = flightMetrics.jumpCount;
      return;
    }
    if (flightMetrics.jumpCount <= jumpCountAtStepStart.current) return;

    const result: JumpResult = {
      leg: state.leg,
      peakFlexionDeg: kneeMetricsRef.current.peakFlexionDeg,
      stanceLegDetected: supportMetricsRef.current.lockedSupportLeg,
      flightMs: flightMetrics.lastFlightMs ?? 0,
      timestamp: Date.now(),
    };
    resultsRef.current = [...resultsRef.current, result];
    onResetPeakRef.current();
    onUnlockSupportRef.current();

    if (state.stepIndex === 1) {
      jumpCountAtStepStart.current = flightMetrics.jumpCount;
      setState({
        kind: 'awaiting',
        leg: 'right',
        stepIndex: 2,
        supportReady: false,
      });
    } else {
      setState({ kind: 'complete', results: resultsRef.current });
    }
  }, [flightMetrics, state]);

  return { state, start, cancel, restart };
}
