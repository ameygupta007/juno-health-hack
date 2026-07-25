import { POSE_LANDMARKS, type NormalizedLandmark } from '@/types/pose';

const MIN_VIS = 0.5;

// Weighted evidence for ankle height, knee bend, and projected shin length.
// A minimum combined score avoids guessing during an ordinary two-foot stance.
const FOOT_HEIGHT_WEIGHT = 0.5;
const KNEE_ANGLE_WEIGHT = 0.3;
const SHIN_LENGTH_WEIGHT = 0.2;
const MIN_STANCE_SCORE = 0.18;

export type Leg = 'left' | 'right';

const visible = (lm: NormalizedLandmark | undefined): lm is NormalizedLandmark =>
  !!lm && lm.visibility >= MIN_VIS;

// `Leg` is the user's anatomical side. The front camera is mirrored before
// the frame reaches the model, so MediaPipe's `leftAnkle` (index 27) actually
// sits on the user's anatomical RIGHT on screen, and vice versa. All lookups
// go through this map so callers can think in user-facing terms.
const LEG_INDICES: Record<Leg, { hip: number; knee: number; ankle: number }> = {
  left: {
    hip: POSE_LANDMARKS.rightHip,
    knee: POSE_LANDMARKS.rightKnee,
    ankle: POSE_LANDMARKS.rightAnkle,
  },
  right: {
    hip: POSE_LANDMARKS.leftHip,
    knee: POSE_LANDMARKS.leftKnee,
    ankle: POSE_LANDMARKS.leftAnkle,
  },
};

// Interior angle at the knee, in 3D. Vectors are computed from the knee out to
// hip and ankle; a smaller angle means deeper flexion (tighter squat).
export function computeKneeFlexionDeg(
  normalized: NormalizedLandmark[],
  side: Leg,
): { angleDeg: number | null } {
  const idx = LEG_INDICES[side];
  const hip = normalized[idx.hip];
  const knee = normalized[idx.knee];
  const ankle = normalized[idx.ankle];

  if (!visible(hip) || !visible(knee) || !visible(ankle)) {
    return { angleDeg: null };
  }

  const a = { x: hip.x - knee.x, y: hip.y - knee.y, z: hip.z - knee.z };
  const b = { x: ankle.x - knee.x, y: ankle.y - knee.y, z: ankle.z - knee.z };

  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const magA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  const magB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);

  if (magA === 0 || magB === 0) return { angleDeg: null };

  // Clamp to guard against FP drift pushing cos slightly outside [-1, 1].
  const cos = Math.max(-1, Math.min(1, dot / (magA * magB)));
  const angleDeg = (Math.acos(cos) * 180) / Math.PI;

  return { angleDeg };
}

// The stance leg usually has the lower foot, straighter knee, and longer
// projected knee-to-ankle segment. All three cues are combined below.
export function detectStanceLeg(normalized: NormalizedLandmark[]): Leg | null {
  const leftHip = normalized[POSE_LANDMARKS.leftHip];
  const rightHip = normalized[POSE_LANDMARKS.rightHip];
  const leftKnee = normalized[POSE_LANDMARKS.leftKnee];
  const rightKnee = normalized[POSE_LANDMARKS.rightKnee];
  const leftAnkle = normalized[POSE_LANDMARKS.leftAnkle];
  const rightAnkle = normalized[POSE_LANDMARKS.rightAnkle];
  if (
    !visible(leftHip) ||
    !visible(rightHip) ||
    !visible(leftKnee) ||
    !visible(rightKnee) ||
    !visible(leftAnkle) ||
    !visible(rightAnkle)
  ) {
    return null;
  }

  const leftShinLength = distance3d(leftKnee, leftAnkle);
  const rightShinLength = distance3d(rightKnee, rightAnkle);
  const shinScale = (leftShinLength + rightShinLength) / 2;
  if (shinScale === 0) return null;

  const leftKneeAngle = computeKneeFlexionDeg(normalized, 'left').angleDeg;
  const rightKneeAngle = computeKneeFlexionDeg(normalized, 'right').angleDeg;
  if (leftKneeAngle === null || rightKneeAngle === null) return null;

  const footToFootDistance = distance3d(leftAnkle, rightAnkle);
  const verticalFootGap = leftAnkle.y - rightAnkle.y;
  const verticalShare =
    footToFootDistance === 0
      ? 0
      : Math.min(1, Math.abs(verticalFootGap) / footToFootDistance);

  // Positive evidence favours the left leg; negative favours the right.
  const heightEvidence =
    clamp(verticalFootGap / (shinScale * 0.35), -1, 1) * verticalShare;
  const bendEvidence = clamp((leftKneeAngle - rightKneeAngle) / 35, -1, 1);
  const shinEvidence = clamp(
    (leftShinLength - rightShinLength) / (shinScale * 0.2),
    -1,
    1,
  );
  const score =
    heightEvidence * FOOT_HEIGHT_WEIGHT +
    bendEvidence * KNEE_ANGLE_WEIGHT +
    shinEvidence * SHIN_LENGTH_WEIGHT;

  if (Math.abs(score) < MIN_STANCE_SCORE) return null;
  return score > 0 ? 'left' : 'right';
}

function distance3d(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
