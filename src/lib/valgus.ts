import { POSE_LANDMARKS, type ScreenLandmark } from '@/types/pose';

// Dynamic knee valgus: how far the knee drifts off the straight hip->ankle
// line during a single-leg squat. We auto-detect which leg is planted (the
// stance leg) and measure the angle between the hip->ankle line and the
// hip->knee line at the hip. Positive = knee caved toward the body midline
// (valgus); negative = knee bowed outward (varus). Smoothing (across frames)
// and event/fatigue tracking live in useKneeAlignment — this module is pure
// per-frame geometry + classification.
export type AlignmentState = 'unknown' | 'stacked' | 'wobble' | 'valgus';
export type StanceSide = 'left' | 'right';

export type KneeAlignment = {
  state: AlignmentState;
  valgusDeg: number;
  smoothedDeg: number;
  stanceSide: StanceSide | null;
  hip: { x: number; y: number } | null;
  knee: { x: number; y: number } | null;
  ankle: { x: number; y: number } | null;
  expectedKneeX: number | null;
};

export type RawKneeGeometry = {
  valgusDeg: number;
  stanceSide: StanceSide;
  hip: { x: number; y: number };
  knee: { x: number; y: number };
  ankle: { x: number; y: number };
  expectedKneeX: number;
};

const MIN_VIS = 0.5;

const visible = (lm: ScreenLandmark | undefined): lm is ScreenLandmark =>
  !!lm && lm.visibility >= MIN_VIS;

type LegPoints = { hip: ScreenLandmark; knee: ScreenLandmark; ankle: ScreenLandmark };

function legPoints(landmarks: ScreenLandmark[], side: StanceSide): LegPoints | null {
  const hip = landmarks[side === 'left' ? POSE_LANDMARKS.leftHip : POSE_LANDMARKS.rightHip];
  const knee = landmarks[side === 'left' ? POSE_LANDMARKS.leftKnee : POSE_LANDMARKS.rightKnee];
  const ankle =
    landmarks[side === 'left' ? POSE_LANDMARKS.leftAnkle : POSE_LANDMARKS.rightAnkle];
  if (!visible(hip) || !visible(knee) || !visible(ankle)) return null;
  return { hip, knee, ankle };
}

// Single-frame geometry: picks the planted leg (larger ankle.y = lower on
// screen) and measures its knee's deviation from the hip-ankle line.
export function computeRawKneeGeometry(landmarks: ScreenLandmark[]): RawKneeGeometry | null {
  const leftHip = landmarks[POSE_LANDMARKS.leftHip];
  const rightHip = landmarks[POSE_LANDMARKS.rightHip];
  if (!visible(leftHip) || !visible(rightHip)) return null;
  const hipMidX = (leftHip.x + rightHip.x) / 2;

  const left = legPoints(landmarks, 'left');
  const right = legPoints(landmarks, 'right');
  if (!left && !right) return null;

  let side: StanceSide;
  let leg: LegPoints;
  if (left && right) {
    side = left.ankle.y >= right.ankle.y ? 'left' : 'right';
    leg = side === 'left' ? left : right;
  } else if (left) {
    side = 'left';
    leg = left;
  } else {
    side = 'right';
    leg = right as LegPoints;
  }

  const { hip, knee, ankle } = leg;

  const toAnkle = { x: ankle.x - hip.x, y: ankle.y - hip.y };
  const toKnee = { x: knee.x - hip.x, y: knee.y - hip.y };
  const cross = toAnkle.x * toKnee.y - toAnkle.y * toKnee.x;
  const dot = toAnkle.x * toKnee.x + toAnkle.y * toKnee.y;
  // Unsigned angle between the two vectors — normalises by leg length/limb
  // proportions instead of using raw pixel offset.
  const angleMagDeg = (Math.abs(Math.atan2(cross, dot)) * 180) / Math.PI;

  // Where the knee "should" sit if it were exactly on the hip-ankle line, at
  // the knee's height. Doubles as the on-screen "safe line" marker.
  const dy = ankle.y - hip.y;
  const t = Math.abs(dy) > 1e-3 ? (knee.y - hip.y) / dy : 0;
  const expectedKneeX = hip.x + t * (ankle.x - hip.x);

  // Sign the angle by medial direction, derived from this frame's actual hip
  // positions (not a hardcoded left/right assumption) so it stays correct
  // under front-camera mirroring.
  const dx = knee.x - expectedKneeX;
  const inwardSign = Math.sign(hipMidX - hip.x) || 1;
  const direction = Math.sign(dx * inwardSign) || 1;

  return {
    valgusDeg: angleMagDeg * direction,
    stanceSide: side,
    hip: { x: hip.x, y: hip.y },
    knee: { x: knee.x, y: knee.y },
    ankle: { x: ankle.x, y: ankle.y },
    expectedKneeX,
  };
}

// Thresholds tuned empirically for a person ~2m from the phone, front-facing.
// Only inward (positive) drift counts toward risk — bowing outward isn't the
// injury pattern this game screens for.
const STACKED_MAX_DEG = 6;
const WOBBLE_MAX_DEG = 13;

export function computeKneeAlignment(
  landmarks: ScreenLandmark[],
  smoothedDeg: number,
): KneeAlignment {
  const raw = computeRawKneeGeometry(landmarks);
  if (!raw) {
    return {
      state: 'unknown',
      valgusDeg: 0,
      smoothedDeg,
      stanceSide: null,
      hip: null,
      knee: null,
      ankle: null,
      expectedKneeX: null,
    };
  }

  let state: AlignmentState;
  if (smoothedDeg > WOBBLE_MAX_DEG) {
    state = 'valgus';
  } else if (smoothedDeg > STACKED_MAX_DEG) {
    state = 'wobble';
  } else {
    state = 'stacked';
  }

  return {
    state,
    valgusDeg: raw.valgusDeg,
    smoothedDeg,
    stanceSide: raw.stanceSide,
    hip: raw.hip,
    knee: raw.knee,
    ankle: raw.ankle,
    expectedKneeX: raw.expectedKneeX,
  };
}

export const ALIGNMENT_COLORS: Record<AlignmentState, string> = {
  unknown: '#9ca3af',
  stacked: '#4ade80',
  wobble: '#facc15',
  valgus: '#ef4444',
};
