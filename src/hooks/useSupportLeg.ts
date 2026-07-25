import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  FootContactDetector,
  GroundCalibrator,
  SupportLegTracker,
  type FootContact,
  type SupportLegMetrics,
} from '@/lib/supportLeg';
import { POSE_LANDMARKS, type PoseFrame } from '@/types/pose';

// Log every Nth processed frame (~30fps → 1s cadence).
const LOG_EVERY_N_FRAMES = 30;

type SupportLegControls = {
  metrics: SupportLegMetrics;
  lockCurrentSupport: () => 'left' | 'right' | null;
  unlockSupport: () => void;
};

function createPipeline() {
  return {
    calibrator: new GroundCalibrator(),
    left: new FootContactDetector(
      POSE_LANDMARKS.leftHeel,
      POSE_LANDMARKS.leftFootIndex,
    ),
    right: new FootContactDetector(
      POSE_LANDMARKS.rightHeel,
      POSE_LANDMARKS.rightFootIndex,
    ),
    tracker: new SupportLegTracker(),
  };
}

export function useSupportLeg(
  frame: PoseFrame | null,
  resetKey: number,
): SupportLegControls {
  const pipelineRef = useRef(createPipeline());
  const frameCountRef = useRef(0);

  useEffect(() => {
    pipelineRef.current = createPipeline();
    frameCountRef.current = 0;
    console.log('[support] pipeline reset');
  }, [resetKey]);

  const metrics = useMemo(() => {
    const pipeline = pipelineRef.current;
    if (frame) pipeline.calibrator.update(frame);
    const calibration = pipeline.calibrator.value;
    const emptyContact: FootContact = {
      contact: null,
      visibility: 0,
      minClearance: null,
      threshold: null,
      rawContact: null,
    };

    if (!frame || !calibration) {
      const result = pipeline.tracker.getMetrics(
        emptyContact,
        emptyContact,
        calibration,
        pipeline.calibrator.progress,
        frame?.timestamp ?? Date.now(),
      );
      if (frame) logIfNeeded(frameCountRef, result, 'pre-calibration');
      return result;
    }

    const left = pipeline.left.update(
      frame.normalizedLandmarks,
      {
        heel: calibration.leftHeelGroundY,
        toe: calibration.leftToeGroundY,
      },
      calibration.bodyScale,
    );
    const right = pipeline.right.update(
      frame.normalizedLandmarks,
      {
        heel: calibration.rightHeelGroundY,
        toe: calibration.rightToeGroundY,
      },
      calibration.bodyScale,
    );
    pipeline.tracker.update(left, right, frame.timestamp);
    const result = pipeline.tracker.getMetrics(
      left,
      right,
      calibration,
      pipeline.calibrator.progress,
      frame.timestamp,
    );
    logIfNeeded(frameCountRef, result, 'live');
    return result;
  }, [frame, resetKey]);

  const lockCurrentSupport = useCallback(
    () => pipelineRef.current.tracker.lockCurrentSupport(),
    [],
  );
  const unlockSupport = useCallback(() => pipelineRef.current.tracker.unlock(), []);

  return { metrics, lockCurrentSupport, unlockSupport };
}

function logIfNeeded(
  frameCountRef: React.MutableRefObject<number>,
  metrics: SupportLegMetrics,
  phase: 'live' | 'pre-calibration',
) {
  frameCountRef.current += 1;
  if (frameCountRef.current % LOG_EVERY_N_FRAMES !== 0) return;
  const fmt = (n: number | null | undefined, digits = 3) =>
    n === null || n === undefined ? '—' : n.toFixed(digits);
  console.log(
    `[support] f=${frameCountRef.current} phase=${phase} state=${metrics.state} ` +
      `stable=${fmt(metrics.stableForMs, 0)}ms locked=${metrics.lockedSupportLeg ?? '—'} ` +
      `cal=${(metrics.calibrationProgress * 100).toFixed(0)}% ` +
      `gY=${fmt(metrics.groundY)} bScale=${fmt(metrics.bodyScale)} thr=${fmt(metrics.contactThreshold)} ` +
      `L{vis=${fmt(metrics.leftFootVisibility, 2)} clr=${fmt(metrics.leftClearance)} raw=${metrics.leftRawContact} stable=${metrics.leftContact}} ` +
      `R{vis=${fmt(metrics.rightFootVisibility, 2)} clr=${fmt(metrics.rightClearance)} raw=${metrics.rightRawContact} stable=${metrics.rightContact}}`,
  );
}
