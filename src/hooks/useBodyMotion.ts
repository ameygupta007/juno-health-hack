import { useEffect, useMemo, useRef } from 'react';

import {
  BodyMotionDetector,
  type BodyMotionMetrics,
} from '@/lib/bodyMotion';
import type { PoseFrame } from '@/types/pose';

const EMPTY_MOTION: BodyMotionMetrics = {
  upwardVelocity: 0,
  upwardAcceleration: 0,
  upwardPointRatio: 0,
  jumpImpulse: false,
};

export function useBodyMotion(
  frame: PoseFrame | null,
  bodyScale: number | null,
  resetKey: number,
): BodyMotionMetrics {
  const detectorRef = useRef(new BodyMotionDetector());

  useEffect(() => {
    detectorRef.current = new BodyMotionDetector();
  }, [resetKey]);

  return useMemo(
    () =>
      frame
        ? detectorRef.current.update(frame, bodyScale)
        : EMPTY_MOTION,
    [frame, bodyScale, resetKey],
  );
}
