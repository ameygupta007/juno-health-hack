import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createFlightTimeTracker,
  toFlightTimeMetrics,
  updateFlightTime,
  type FlightTimeMetrics,
} from '@/lib/flightTime';
import type { PoseFrame } from '@/types/pose';
import type { SupportLegMetrics } from '@/lib/supportLeg';
import type { BodyMotionMetrics } from '@/lib/bodyMotion';

type FlightTimeControls = {
  metrics: FlightTimeMetrics;
  reset: () => void;
};

export function useFlightTime(
  frame: PoseFrame | null,
  support: SupportLegMetrics,
  motion: BodyMotionMetrics,
): FlightTimeControls {
  const trackerRef = useRef(createFlightTimeTracker());
  const [metrics, setMetrics] = useState(() =>
    toFlightTimeMetrics(trackerRef.current),
  );

  useEffect(() => {
    trackerRef.current = updateFlightTime(
      trackerRef.current,
      frame,
      support,
      motion,
    );
    setMetrics(toFlightTimeMetrics(trackerRef.current));
  }, [frame, support, motion]);

  const reset = useCallback(() => {
    trackerRef.current = createFlightTimeTracker();
    setMetrics(toFlightTimeMetrics(trackerRef.current));
  }, []);

  return { metrics, reset };
}
