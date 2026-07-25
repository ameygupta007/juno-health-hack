import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  FootContactDetector,
  GroundCalibrator,
  SupportLegTracker,
  type SupportLegMetrics,
} from '@/lib/supportLeg';
import { POSE_LANDMARKS, type PoseFrame } from '@/types/pose';

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

  useEffect(() => {
    pipelineRef.current = createPipeline();
  }, [resetKey]);

  const metrics = useMemo(() => {
    const pipeline = pipelineRef.current;
    if (frame) pipeline.calibrator.update(frame);
    const calibration = pipeline.calibrator.value;
    const emptyContact = { contact: null, visibility: 0 };

    if (!frame || !calibration) {
      return pipeline.tracker.getMetrics(
        emptyContact,
        emptyContact,
        calibration,
        pipeline.calibrator.progress,
        frame?.timestamp ?? Date.now(),
      );
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
    return pipeline.tracker.getMetrics(
      left,
      right,
      calibration,
      pipeline.calibrator.progress,
      frame.timestamp,
    );
  }, [frame, resetKey]);

  const lockCurrentSupport = useCallback(
    () => pipelineRef.current.tracker.lockCurrentSupport(),
    [],
  );
  const unlockSupport = useCallback(() => pipelineRef.current.tracker.unlock(), []);

  return { metrics, lockCurrentSupport, unlockSupport };
}
