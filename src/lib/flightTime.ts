import {
  CONTACT_ENTER_TORSO_RATIO,
  CONTACT_LEAVE_TORSO_RATIO,
  type SupportLegMetrics,
} from '@/lib/supportLeg';
import type { BodyMotionMetrics } from '@/lib/bodyMotion';
import { POSE_LANDMARKS, type NormalizedLandmark, type PoseFrame } from '@/types/pose';

export type FlightPhase = 'calibrating' | 'grounded' | 'airborne' | 'tracking-lost';

export type FlightTimeMetrics = {
  phase: FlightPhase;
  currentFlightMs: number;
  lastFlightMs: number | null;
  jumpCount: number;
  calibrationProgress: number;
};

type FlightTimeTracker = FlightTimeMetrics & {
  airborneSince: number | null;
  takeoffCandidateSince: number | null;
  landingCandidateAt: number | null;
  takeoffFrames: number;
  landingFrames: number;
  lastJumpImpulseAt: number | null;
};

const MIN_VISIBILITY = 0.6;
const TAKEOFF_CONFIRM_FRAMES = 3;
const LANDING_CONFIRM_FRAMES = 3;

export function createFlightTimeTracker(): FlightTimeTracker {
  return {
    phase: 'calibrating',
    currentFlightMs: 0,
    lastFlightMs: null,
    jumpCount: 0,
    calibrationProgress: 0,
    airborneSince: null,
    takeoffCandidateSince: null,
    landingCandidateAt: null,
    takeoffFrames: 0,
    landingFrames: 0,
    lastJumpImpulseAt: null,
  };
}

// Takeoff combines a coordinated upward body impulse with the fixed foot plane.
// This avoids depending on a single noisy toe while still requiring clearance
// or a confirmed AIRBORNE contact state. Landing remains foot-contact based.
export function updateFlightTime(
  previous: FlightTimeTracker,
  frame: PoseFrame | null,
  support: SupportLegMetrics,
  motion: BodyMotionMetrics,
): FlightTimeTracker {
  if (!support.isCalibrated || support.groundY === null || support.bodyScale === null) {
    return {
      ...previous,
      phase: 'calibrating',
      currentFlightMs: 0,
      calibrationProgress: support.calibrationProgress,
      airborneSince: null,
      takeoffCandidateSince: null,
      landingCandidateAt: null,
      takeoffFrames: 0,
      landingFrames: 0,
      lastJumpImpulseAt: null,
    };
  }

  if (!frame) return loseTracking(previous);
  const leftToe = frame.normalizedLandmarks[POSE_LANDMARKS.leftFootIndex];
  const rightToe = frame.normalizedLandmarks[POSE_LANDMARKS.rightFootIndex];

  const next = {
    ...previous,
    calibrationProgress: 1,
  };
  if (motion.jumpImpulse) next.lastJumpImpulseAt = frame.timestamp;
  const hasRecentImpulse =
    next.lastJumpImpulseAt !== null &&
    frame.timestamp - next.lastJumpImpulseAt <= 450;
  const leftGroundY =
    support.leftToeGroundY ?? support.leftGroundY ?? support.groundY;
  const rightGroundY =
    support.rightToeGroundY ?? support.rightGroundY ?? support.groundY;
  const toesVisible = visible(leftToe) && visible(rightToe);
  const leftClearance = toesVisible ? leftGroundY - leftToe.y : 0;
  const rightClearance = toesVisible ? rightGroundY - rightToe.y : 0;
  const takeoffThreshold = support.bodyScale * CONTACT_LEAVE_TORSO_RATIO;
  const landingThreshold = support.bodyScale * CONTACT_ENTER_TORSO_RATIO;

  if (next.airborneSince === null) {
    const bothToesClear =
      toesVisible &&
      leftClearance > takeoffThreshold &&
      rightClearance > takeoffThreshold;
    const coordinatedRise =
      motion.upwardVelocity > 0.2 && motion.upwardPointRatio >= 0.5;
    const takeoffEvidence =
      (hasRecentImpulse &&
        (bothToesClear || support.state === 'AIRBORNE')) ||
      (bothToesClear && coordinatedRise);
    if (takeoffEvidence && next.takeoffFrames === 0) {
      next.takeoffCandidateSince = frame.timestamp;
    }
    next.takeoffFrames = takeoffEvidence ? next.takeoffFrames + 1 : 0;
    if (!takeoffEvidence) next.takeoffCandidateSince = null;
    next.landingFrames = 0;
    next.phase = 'grounded';
    next.currentFlightMs = 0;

    if (next.takeoffFrames >= TAKEOFF_CONFIRM_FRAMES) {
      next.airborneSince = next.takeoffCandidateSince ?? frame.timestamp;
      next.currentFlightMs = frame.timestamp - next.airborneSince;
      next.phase = 'airborne';
      next.takeoffFrames = 0;
      next.takeoffCandidateSince = null;
    }
    return next;
  }

  next.phase = 'airborne';
  next.currentFlightMs = Math.max(0, frame.timestamp - next.airborneSince);
  const eitherToeLanded =
    support.leftContact === true ||
    support.rightContact === true ||
    (toesVisible &&
      (leftClearance <= landingThreshold || rightClearance <= landingThreshold));
  const minimumFlightElapsed = frame.timestamp - next.airborneSince >= 100;
  if (eitherToeLanded && minimumFlightElapsed && next.landingFrames === 0) {
    next.landingCandidateAt = frame.timestamp;
  }
  next.landingFrames =
    eitherToeLanded && minimumFlightElapsed ? next.landingFrames + 1 : 0;
  if (!eitherToeLanded || !minimumFlightElapsed) next.landingCandidateAt = null;

  if (next.landingFrames >= LANDING_CONFIRM_FRAMES) {
    const landingAt = next.landingCandidateAt ?? frame.timestamp;
    next.phase = 'grounded';
    next.currentFlightMs = 0;
    next.lastFlightMs = Math.max(0, landingAt - next.airborneSince);
    next.jumpCount += 1;
    next.airborneSince = null;
    next.landingCandidateAt = null;
    next.landingFrames = 0;
  }
  return next;
}

export function toFlightTimeMetrics(tracker: FlightTimeTracker): FlightTimeMetrics {
  return {
    phase: tracker.phase,
    currentFlightMs: tracker.currentFlightMs,
    lastFlightMs: tracker.lastFlightMs,
    jumpCount: tracker.jumpCount,
    calibrationProgress: tracker.calibrationProgress,
  };
}

function loseTracking(tracker: FlightTimeTracker): FlightTimeTracker {
  return {
    ...tracker,
    phase: 'tracking-lost',
    currentFlightMs: 0,
    airborneSince: null,
    takeoffCandidateSince: null,
    landingCandidateAt: null,
    takeoffFrames: 0,
    landingFrames: 0,
    lastJumpImpulseAt: null,
  };
}

function visible(
  landmark: NormalizedLandmark | undefined,
): landmark is NormalizedLandmark {
  return !!landmark && landmark.visibility >= MIN_VISIBILITY;
}
