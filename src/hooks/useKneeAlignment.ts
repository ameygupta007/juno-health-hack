import { useCallback, useMemo, useRef } from 'react';

import { computeKneeAlignment, computeRawKneeGeometry, type KneeAlignment } from '@/lib/valgus';
import type { PoseFrame } from '@/types/pose';

const SMOOTH_WINDOW = 8; // ~250-350ms of frames, de-jitters the raw angle
const EVENT_DEBOUNCE_MS = 350; // sustained valgus before it counts as an event

// Smooths the per-frame valgus angle (ring buffer, like useBalanceMetrics'
// sway calc) and debounces state transitions into discrete "valgus events" —
// a single noisy flick into the red shouldn't log 10 events.
export function useKneeAlignment(frame: PoseFrame | null) {
  const historyRef = useRef<number[]>([]);
  const eventsRef = useRef<number[]>([]);
  const pendingValgusSinceRef = useRef<number | null>(null);
  const loggedRef = useRef(false);

  const reset = useCallback(() => {
    historyRef.current = [];
    eventsRef.current = [];
    pendingValgusSinceRef.current = null;
    loggedRef.current = false;
  }, []);

  const alignment: KneeAlignment = useMemo(() => {
    if (!frame) {
      historyRef.current = [];
      return computeKneeAlignment([], 0);
    }

    const raw = computeRawKneeGeometry(frame.landmarks);
    const history = historyRef.current;
    if (raw) {
      history.push(raw.valgusDeg);
      if (history.length > SMOOTH_WINDOW) history.shift();
    } else {
      history.length = 0;
    }

    const smoothedDeg = history.length
      ? history.reduce((a, b) => a + b, 0) / history.length
      : 0;

    const result = computeKneeAlignment(frame.landmarks, smoothedDeg);

    const now = frame.timestamp;
    if (result.state === 'valgus') {
      if (pendingValgusSinceRef.current == null) {
        pendingValgusSinceRef.current = now;
        loggedRef.current = false;
      } else if (!loggedRef.current && now - pendingValgusSinceRef.current >= EVENT_DEBOUNCE_MS) {
        eventsRef.current.push(now);
        loggedRef.current = true;
      }
    } else {
      pendingValgusSinceRef.current = null;
      loggedRef.current = false;
    }

    return result;
  }, [frame]);

  return {
    alignment,
    events: eventsRef.current,
    eventCount: eventsRef.current.length,
    reset,
  };
}
