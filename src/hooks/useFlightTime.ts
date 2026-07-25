import { useEffect, useRef, useState } from 'react';

import {
  createFlightTimeTracker,
  toFlightTimeMetrics,
  updateFlightTime,
  type FlightTimeMetrics,
} from '@/lib/flightTime';
import type { PoseFrame } from '@/types/pose';

export function useFlightTime(frame: PoseFrame | null): FlightTimeMetrics {
  const trackerRef = useRef(createFlightTimeTracker());
  const [metrics, setMetrics] = useState(() =>
    toFlightTimeMetrics(trackerRef.current),
  );

  useEffect(() => {
    trackerRef.current = updateFlightTime(trackerRef.current, frame);
    setMetrics(toFlightTimeMetrics(trackerRef.current));
  }, [frame]);

  return metrics;
}
