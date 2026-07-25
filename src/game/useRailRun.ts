import { useCallback, useEffect, useRef, useState } from 'react';

import type { AlignmentState } from '@/lib/valgus';

import type { ActiveRailRun, RailRunSummary } from './types';

const RUN_MS = 40_000;
const SCORE_RATE_PER_SEC = 10; // base points/sec while stacked, before multiplier
const STREAK_STEP_MS = 4000; // every 4s stacked bumps the multiplier by one
const MAX_MULTIPLIER = 4;
const WIPEOUT_COOLDOWN_MS = 1200; // no scoring/streak growth for this long after a collapse
const FATIGUE_LATE_FRACTION = 1 / 3; // "late" = final third of the run
const FATIGUE_MIN_EVENTS = 3;
const FATIGUE_LATE_SHARE = 0.6; // 60%+ of events landing late => fatigue flag

type Args = {
  active: boolean;
  state: AlignmentState;
  events: number[]; // valgus-event timestamps, from useKneeAlignment
  onComplete: (summary: RailRunSummary) => void;
};

// Drives one Rail Grind Pro run. Score + multiplier build while the stance
// knee stays stacked; a collapse into valgus wipes the multiplier and opens a
// short no-scoring cooldown. Mirrors useStarRound's ref-backed tick + dual
// (reactive + fallback interval) driver.
export function useRailRun({ active, state, events, onComplete }: Args) {
  const [run, setRun] = useState<ActiveRailRun | null>(null);
  const runRef = useRef<ActiveRailRun | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      runRef.current = null;
      completedRef.current = false;
      setRun(null);
      return;
    }
    const now = Date.now();
    const fresh: ActiveRailRun = {
      startedAt: now,
      endsAt: now + RUN_MS,
      score: 0,
      multiplier: 1,
      streakMs: 0,
      bestStreakMs: 0,
      wipeouts: 0,
      wipeoutUntil: 0,
      lastTickAt: now,
    };
    runRef.current = fresh;
    completedRef.current = false;
    setRun(fresh);
  }, [active]);

  const tick = useCallback(
    (currentState: AlignmentState) => {
      const current = runRef.current;
      if (!current || completedRef.current) return;
      const now = Date.now();

      if (now >= current.endsAt) {
        completedRef.current = true;
        const runLen = current.endsAt - current.startedAt;
        const lateWindowStart = current.endsAt - runLen * FATIGUE_LATE_FRACTION;
        const lateEvents = events.filter((t) => t >= lateWindowStart).length;
        const fatigue =
          events.length >= FATIGUE_MIN_EVENTS && lateEvents / events.length >= FATIGUE_LATE_SHARE;
        onComplete({
          score: Math.round(current.score),
          wipeouts: current.wipeouts,
          bestStreakMs: current.bestStreakMs,
          eventCount: events.length,
          fatigue,
        });
        return;
      }

      const dtMs = Math.max(0, now - current.lastTickAt);
      let { score, multiplier, streakMs, bestStreakMs, wipeouts, wipeoutUntil } = current;

      if (currentState === 'valgus') {
        if (now >= wipeoutUntil) wipeouts += 1;
        wipeoutUntil = now + WIPEOUT_COOLDOWN_MS;
        multiplier = 1;
        streakMs = 0;
      } else if (now < wipeoutUntil) {
        streakMs = 0; // cooling down from a recent collapse
      } else if (currentState === 'stacked') {
        streakMs += dtMs;
        multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(streakMs / STREAK_STEP_MS));
        score += (SCORE_RATE_PER_SEC * multiplier * dtMs) / 1000;
        bestStreakMs = Math.max(bestStreakMs, streakMs);
      }
      // 'wobble' and 'unknown': hold the streak, no growth, no penalty.

      const next: ActiveRailRun = {
        ...current,
        score,
        multiplier,
        streakMs,
        bestStreakMs,
        wipeouts,
        wipeoutUntil,
        lastTickAt: now,
      };
      runRef.current = next;
      setRun(next);
    },
    [events, onComplete],
  );

  // Fallback ticker so the run clock keeps advancing even if pose tracking
  // drops out; intentionally closes over a possibly-stale `state` the same
  // way useStarRound's fallback interval closes over `frame`.
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => tick(state), 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    tick(state);
  }, [active, state, tick]);

  return run;
}
