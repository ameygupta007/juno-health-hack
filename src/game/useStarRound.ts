import { useCallback, useEffect, useRef, useState } from 'react';

import type { BalanceMetrics } from '@/lib/balance';
import { POSE_LANDMARKS, type PoseFrame, type ScreenLandmark } from '@/types/pose';

import { CHAPTERS } from './story';
import type { ActiveRound, Star } from './types';

const CATCH_RADIUS_PX = 60; // wrist-to-star distance that counts as a catch
const EDGE_PADDING = 60;

type Args = {
  chapterIndex: number;
  frame: PoseFrame | null;
  balance: BalanceMetrics;
  viewWidth: number;
  viewHeight: number;
  onComplete: (caught: number, bonuses: number) => void;
};

// Drives one chapter of Starfall. Spawns stars on a timer, tests them against
// the player's wrists each pose frame, expires missed stars, and ends when
// the chapter timer runs out.
export function useStarRound({
  chapterIndex,
  frame,
  balance,
  viewWidth,
  viewHeight,
  onComplete,
}: Args) {
  const chapter = CHAPTERS[chapterIndex];
  const [round, setRound] = useState<ActiveRound | null>(null);
  const roundRef = useRef<ActiveRound | null>(null);
  const completedRef = useRef(false);

  // Start the round when chapterIndex changes / view has real dimensions.
  useEffect(() => {
    if (!chapter || viewWidth < 10 || viewHeight < 10) return;
    const now = Date.now();
    const fresh: ActiveRound = {
      chapterIndex,
      startedAt: now,
      endsAt: now + chapter.durationMs,
      stars: [],
      caught: 0,
      bonuses: 0,
      nextStarId: 1,
      lastSpawnAt: 0,
    };
    roundRef.current = fresh;
    completedRef.current = false;
    setRound(fresh);
  }, [chapter, chapterIndex, viewWidth, viewHeight]);

  // A rAF-like tick, driven by pose frames (~30Hz) plus a fallback interval
  // so the round still progresses when the player leaves the frame.
  useEffect(() => {
    if (!chapter) return;
    const iv = setInterval(() => tick(frame), 100);
    return () => clearInterval(iv);
    // We intentionally close over `frame`; the interval clears/reruns on new
    // frames via the tick call below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter]);

  useEffect(() => {
    tick(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  const tick = useCallback(
    (currentFrame: PoseFrame | null) => {
      const current = roundRef.current;
      if (!current || !chapter || completedRef.current) return;
      const now = Date.now();

      // 1. End condition
      if (now >= current.endsAt) {
        completedRef.current = true;
        onComplete(current.caught, current.bonuses);
        return;
      }

      let stars = current.stars.filter((s) => s.expiresAt > now);
      let caught = current.caught;
      let bonuses = current.bonuses;

      // 2. Spawn a new star if it's time
      let lastSpawnAt = current.lastSpawnAt;
      let nextStarId = current.nextStarId;
      if (now - lastSpawnAt >= chapter.spawnIntervalMs && stars.length < 4) {
        stars = [
          ...stars,
          spawnStar(nextStarId, now, chapter.starLifetimeMs, viewWidth, viewHeight),
        ];
        nextStarId += 1;
        lastSpawnAt = now;
      }

      // 3. Test wrists against active stars
      if (currentFrame) {
        const wrists = [
          currentFrame.landmarks[POSE_LANDMARKS.leftWrist],
          currentFrame.landmarks[POSE_LANDMARKS.rightWrist],
        ].filter((lm): lm is ScreenLandmark => !!lm && lm.visibility > 0.4);

        stars = stars.filter((star) => {
          const hit = wrists.some(
            (w) => Math.hypot(w.x - star.x, w.y - star.y) < CATCH_RADIUS_PX,
          );
          if (hit) {
            caught += 1;
            if (balance.state === 'stable') bonuses += 1;
            return false;
          }
          return true;
        });
      }

      const next: ActiveRound = {
        ...current,
        stars,
        caught,
        bonuses,
        nextStarId,
        lastSpawnAt,
      };
      roundRef.current = next;
      setRound(next);
    },
    [chapter, viewWidth, viewHeight, balance.state, onComplete],
  );

  return round;
}

function spawnStar(
  id: number,
  now: number,
  lifetimeMs: number,
  viewWidth: number,
  viewHeight: number,
): Star {
  return {
    id,
    x: EDGE_PADDING + Math.random() * (viewWidth - EDGE_PADDING * 2),
    y: EDGE_PADDING + Math.random() * (viewHeight - EDGE_PADDING * 2),
    spawnedAt: now,
    expiresAt: now + lifetimeMs,
  };
}
