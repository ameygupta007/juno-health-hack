import { POSE_LANDMARKS, type ScreenLandmark } from '@/types/pose';

// Balance is derived from three signals:
//   1. lateralOffset — how far the center of mass (hip midpoint) sits from
//      the base of support (ankle midpoint), normalised by shoulder width so
//      it's person-invariant. Positive = leaning right on screen.
//   2. shoulderTiltDeg — angle of the shoulder line from horizontal.
//   3. sway — rolling stddev of the hip midpoint over the last ~1s of frames
//      (computed in the hook, not here).
export type BalanceState = 'unknown' | 'stable' | 'wobbly' | 'losing';

export type BalanceMetrics = {
  state: BalanceState;
  lateralOffset: number;
  shoulderTiltDeg: number;
  swayPx: number;
  hipMidpoint: { x: number; y: number } | null;
  ankleMidpoint: { x: number; y: number } | null;
};

const MIN_VIS = 0.5;

const midpoint = (a: ScreenLandmark, b: ScreenLandmark) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

const visible = (lm: ScreenLandmark | undefined): lm is ScreenLandmark =>
  !!lm && lm.visibility >= MIN_VIS;

export function computeBalance(
  landmarks: ScreenLandmark[],
  swayPx: number,
): BalanceMetrics {
  const leftHip = landmarks[POSE_LANDMARKS.leftHip];
  const rightHip = landmarks[POSE_LANDMARKS.rightHip];
  const leftAnkle = landmarks[POSE_LANDMARKS.leftAnkle];
  const rightAnkle = landmarks[POSE_LANDMARKS.rightAnkle];
  const leftShoulder = landmarks[POSE_LANDMARKS.leftShoulder];
  const rightShoulder = landmarks[POSE_LANDMARKS.rightShoulder];

  // Need shoulders + hips + ankles all visible to say anything meaningful.
  if (
    !visible(leftHip) ||
    !visible(rightHip) ||
    !visible(leftAnkle) ||
    !visible(rightAnkle) ||
    !visible(leftShoulder) ||
    !visible(rightShoulder)
  ) {
    return {
      state: 'unknown',
      lateralOffset: 0,
      shoulderTiltDeg: 0,
      swayPx,
      hipMidpoint: null,
      ankleMidpoint: null,
    };
  }

  const hipMid = midpoint(leftHip, rightHip);
  const ankleMid = midpoint(leftAnkle, rightAnkle);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) || 1;

  // Person-invariant lateral offset: how much the CoM has drifted horizontally
  // from directly above the base of support, in shoulder-widths.
  const lateralOffset = (hipMid.x - ankleMid.x) / shoulderWidth;

  // Signed angle of the shoulder line from horizontal. Using |dx| keeps the
  // measurement direction-agnostic — front-camera mirroring flips which
  // shoulder sits at the higher x on screen, so a raw atan2 would land at
  // ±180° for a level stance.
  const shoulderTiltDeg =
    (Math.atan2(
      rightShoulder.y - leftShoulder.y,
      Math.abs(rightShoulder.x - leftShoulder.x),
    ) *
      180) /
    Math.PI;

  // Thresholds tuned empirically for a person standing ~2m from a phone at
  // portrait orientation. Sway is in projected pixels so it scales with
  // camera-view size; shoulder-width normalisation would be more robust if
  // needed later.
  const offAbs = Math.abs(lateralOffset);
  const tiltAbs = Math.abs(shoulderTiltDeg);

  let state: BalanceState;
  if (offAbs > 0.35 || tiltAbs > 15 || swayPx > 30) {
    state = 'losing';
  } else if (offAbs > 0.18 || tiltAbs > 8 || swayPx > 15) {
    state = 'wobbly';
  } else {
    state = 'stable';
  }

  return {
    state,
    lateralOffset,
    shoulderTiltDeg,
    swayPx,
    hipMidpoint: hipMid,
    ankleMidpoint: ankleMid,
  };
}

export const BALANCE_COLORS: Record<BalanceState, string> = {
  unknown: '#9ca3af',
  stable: '#4ade80',
  wobbly: '#facc15',
  losing: '#ef4444',
};
