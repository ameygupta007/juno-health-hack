import {
  CONTACT_ENTER_TORSO_RATIO,
  CONTACT_LEAVE_TORSO_RATIO,
  type SupportLegMetrics,
} from '@/lib/supportLeg';
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
  };
}

// Airtime uses the same fixed, median-calibrated ground plane as support-leg
// detection. Both anatomical toe tips must clear the leave threshold; landing
// occurs when either toe returns inside the smaller contact threshold.
export function updateFlightTime(
  previous: FlightTimeTracker,
  frame: PoseFrame | null,
  support: SupportLegMetrics,
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
    };
  }

  if (!frame) return loseTracking(previous);
  const leftToe = frame.normalizedLandmarks[POSE_LANDMARKS.leftFootIndex];
  const rightToe = frame.normalizedLandmarks[POSE_LANDMARKS.rightFootIndex];
  if (!visible(leftToe) || !visible(rightToe)) return loseTracking(previous);

  const next = {
    ...previous,
    calibrationProgress: 1,
  };
  const leftClearance = support.groundY - leftToe.y;
  const rightClearance = support.groundY - rightToe.y;
  const takeoffThreshold = support.bodyScale * CONTACT_LEAVE_TORSO_RATIO;
  const landingThreshold = support.bodyScale * CONTACT_ENTER_TORSO_RATIO;

  if (next.airborneSince === null) {
    const bothToesClear =
      leftClearance > takeoffThreshold && rightClearance > takeoffThreshold;
    if (bothToesClear && next.takeoffFrames === 0) {
      next.takeoffCandidateSince = frame.timestamp;
    }
    next.takeoffFrames = bothToesClear ? next.takeoffFrames + 1 : 0;
    if (!bothToesClear) next.takeoffCandidateSince = null;
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
    leftClearance <= landingThreshold || rightClearance <= landingThreshold;
  if (eitherToeLanded && next.landingFrames === 0) {
    next.landingCandidateAt = frame.timestamp;
  }
  next.landingFrames = eitherToeLanded ? next.landingFrames + 1 : 0;
  if (!eitherToeLanded) next.landingCandidateAt = null;

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
  };
}

function visible(
  landmark: NormalizedLandmark | undefined,
): landmark is NormalizedLandmark {
  return !!landmark && landmark.visibility >= MIN_VISIBILITY;
}
