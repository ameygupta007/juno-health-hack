import { POSE_LANDMARKS, type PoseFrame, type ScreenLandmark } from '@/types/pose';

export type FlightPhase = 'calibrating' | 'grounded' | 'airborne' | 'tracking-lost';

export type FlightTimeMetrics = {
  phase: FlightPhase;
  currentFlightMs: number;
  lastFlightMs: number | null;
  jumpCount: number;
  calibrationProgress: number;
};

type FlightTimeTracker = FlightTimeMetrics & {
  leftGroundY: number | null;
  rightGroundY: number | null;
  baselineSamples: number;
  airborneSince: number | null;
  takeoffCandidateSince: number | null;
  landingCandidateAt: number | null;
  takeoffFrames: number;
  landingFrames: number;
  lastFrameTimestamp: number | null;
};

const MIN_VISIBILITY = 0.65;
const CALIBRATION_FRAMES = 15;
const TAKEOFF_CONFIRM_FRAMES = 3;
const LANDING_CONFIRM_FRAMES = 3;
const TRACKING_TIMEOUT_MS = 250;

// Toe-tip clearance from its calibrated ground-plane position. These small
// thresholds reject landmark jitter without waiting for the whole ankle to
// rise; the smaller landing value adds hysteresis and prevents state flicker.
const TAKEOFF_LEG_RATIO = 0.025;
const LANDING_LEG_RATIO = 0.012;
const MIN_TAKEOFF_PX = 3;
const MIN_LANDING_PX = 2;

export function createFlightTimeTracker(): FlightTimeTracker {
  return {
    phase: 'calibrating',
    currentFlightMs: 0,
    lastFlightMs: null,
    jumpCount: 0,
    calibrationProgress: 0,
    leftGroundY: null,
    rightGroundY: null,
    baselineSamples: 0,
    airborneSince: null,
    takeoffCandidateSince: null,
    landingCandidateAt: null,
    takeoffFrames: 0,
    landingFrames: 0,
    lastFrameTimestamp: null,
  };
}

export function updateFlightTime(
  previous: FlightTimeTracker,
  frame: PoseFrame | null,
): FlightTimeTracker {
  if (!frame) {
    return loseTracking(previous, Date.now(), true);
  }

  const leftToe = frame.landmarks[POSE_LANDMARKS.leftFootIndex];
  const rightToe = frame.landmarks[POSE_LANDMARKS.rightFootIndex];
  const leftHip = frame.landmarks[POSE_LANDMARKS.leftHip];
  const rightHip = frame.landmarks[POSE_LANDMARKS.rightHip];

  if (
    !visible(leftToe) ||
    !visible(rightToe) ||
    !visible(leftHip) ||
    !visible(rightHip)
  ) {
    return loseTracking(previous, frame.timestamp);
  }

  let next = { ...previous, lastFrameTimestamp: frame.timestamp };

  if (
    next.leftGroundY === null ||
    next.rightGroundY === null ||
    next.baselineSamples < CALIBRATION_FRAMES
  ) {
    return calibrate(next, leftToe.y, rightToe.y);
  }

  // Toe-tip screen displacement is normalised by projected hip-to-toe length,
  // making the ground-plane threshold work across camera distances.
  const leftLegPx = Math.abs(leftToe.y - leftHip.y);
  const rightLegPx = Math.abs(rightToe.y - rightHip.y);
  const takeoffThreshold = Math.max(
    MIN_TAKEOFF_PX,
    ((leftLegPx + rightLegPx) / 2) * TAKEOFF_LEG_RATIO,
  );
  const landingThreshold = Math.max(
    MIN_LANDING_PX,
    ((leftLegPx + rightLegPx) / 2) * LANDING_LEG_RATIO,
  );
  const leftRise = next.leftGroundY - leftToe.y;
  const rightRise = next.rightGroundY - rightToe.y;

  if (next.airborneSince === null) {
    const bothFeetUp = leftRise > takeoffThreshold && rightRise > takeoffThreshold;
    if (bothFeetUp && next.takeoffFrames === 0) {
      next.takeoffCandidateSince = frame.timestamp;
    }
    next.takeoffFrames = bothFeetUp ? next.takeoffFrames + 1 : 0;
    if (!bothFeetUp) next.takeoffCandidateSince = null;
    next.landingFrames = 0;
    next.phase = 'grounded';
    next.currentFlightMs = 0;

    if (next.takeoffFrames >= TAKEOFF_CONFIRM_FRAMES) {
      next.airborneSince = next.takeoffCandidateSince ?? frame.timestamp;
      next.currentFlightMs = frame.timestamp - next.airborneSince;
      next.phase = 'airborne';
      next.takeoffFrames = 0;
      next.takeoffCandidateSince = null;
    } else if (!bothFeetUp) {
      // Slowly follow changes in framing while grounded, without allowing a
      // crouch or a single noisy frame to move the floor abruptly. Gate per
      // foot on "actually planted" (rise near zero) so a raised leg during a
      // one-leg stance can't drag its own floor upward.
      if (leftRise < landingThreshold) {
        next.leftGroundY = lerp(next.leftGroundY, leftToe.y, 0.025);
      }
      if (rightRise < landingThreshold) {
        next.rightGroundY = lerp(next.rightGroundY, rightToe.y, 0.025);
      }
    }
    return next;
  }

  next.phase = 'airborne';
  next.currentFlightMs = Math.max(0, frame.timestamp - next.airborneSince);
  const eitherFootDown =
    leftRise < landingThreshold || rightRise < landingThreshold;
  if (eitherFootDown && next.landingFrames === 0) {
    next.landingCandidateAt = frame.timestamp;
  }
  next.landingFrames = eitherFootDown ? next.landingFrames + 1 : 0;
  if (!eitherFootDown) next.landingCandidateAt = null;

  if (next.landingFrames >= LANDING_CONFIRM_FRAMES) {
    const landingAt = next.landingCandidateAt ?? frame.timestamp;
    const duration = Math.max(0, landingAt - next.airborneSince);
    next.phase = 'grounded';
    next.currentFlightMs = 0;
    next.lastFlightMs = duration;
    next.jumpCount += 1;
    next.airborneSince = null;
    next.landingCandidateAt = null;
    next.landingFrames = 0;
    // Only re-anchor a foot's ground if it appears to be at the floor. On a
    // one-leg landing the non-landing foot is still raised — anchoring its
    // ground to the raised position would break takeoff detection for the
    // next jump on that leg.
    if (leftRise < landingThreshold) next.leftGroundY = leftToe.y;
    if (rightRise < landingThreshold) next.rightGroundY = rightToe.y;
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

function calibrate(
  tracker: FlightTimeTracker,
  leftY: number,
  rightY: number,
): FlightTimeTracker {
  const sampleCount = tracker.baselineSamples + 1;
  const leftGroundY =
    tracker.leftGroundY === null
      ? leftY
      : tracker.leftGroundY + (leftY - tracker.leftGroundY) / sampleCount;
  const rightGroundY =
    tracker.rightGroundY === null
      ? rightY
      : tracker.rightGroundY + (rightY - tracker.rightGroundY) / sampleCount;

  return {
    ...tracker,
    phase: sampleCount >= CALIBRATION_FRAMES ? 'grounded' : 'calibrating',
    leftGroundY,
    rightGroundY,
    baselineSamples: sampleCount,
    calibrationProgress: Math.min(1, sampleCount / CALIBRATION_FRAMES),
  };
}

function loseTracking(
  tracker: FlightTimeTracker,
  timestamp = Date.now(),
  immediately = false,
): FlightTimeTracker {
  const recentlySeen =
    !immediately &&
    tracker.lastFrameTimestamp !== null &&
    timestamp - tracker.lastFrameTimestamp <= TRACKING_TIMEOUT_MS;
  if (recentlySeen) return tracker;

  // Do not invent a landing while the feet are occluded. Preserve completed
  // jumps, but recalibrate the floor once the person is visible again.
  return {
    ...tracker,
    phase: 'tracking-lost',
    currentFlightMs: 0,
    leftGroundY: null,
    rightGroundY: null,
    baselineSamples: 0,
    calibrationProgress: 0,
    airborneSince: null,
    takeoffCandidateSince: null,
    landingCandidateAt: null,
    takeoffFrames: 0,
    landingFrames: 0,
  };
}

function visible(landmark: ScreenLandmark | undefined): landmark is ScreenLandmark {
  return !!landmark && landmark.visibility >= MIN_VISIBILITY;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
