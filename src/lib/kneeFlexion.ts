import { POSE_LANDMARKS, type NormalizedLandmark } from '@/types/pose';

const MIN_VIS = 0.5;

// Minimum ankle-height difference (in normalized image-height units) required
// before we call one leg the "stance" leg. Below this, both feet are close to
// the same height — treat as ambiguous (standing or symmetric squat) so we
// don't mislabel a normal two-foot stance as a one-leg jump.
const STANCE_MIN_DY = 0.05;

export type Leg = 'left' | 'right';

const visible = (lm: NormalizedLandmark | undefined): lm is NormalizedLandmark =>
  !!lm && lm.visibility >= MIN_VIS;

const LEG_INDICES: Record<Leg, { hip: number; knee: number; ankle: number }> = {
  left: {
    hip: POSE_LANDMARKS.leftHip,
    knee: POSE_LANDMARKS.leftKnee,
    ankle: POSE_LANDMARKS.leftAnkle,
  },
  right: {
    hip: POSE_LANDMARKS.rightHip,
    knee: POSE_LANDMARKS.rightKnee,
    ankle: POSE_LANDMARKS.rightAnkle,
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

// The "stance" leg during a one-leg jump is the planted one — its ankle stays
// low while the other ankle rises (knee draw-up or trailing leg). In image
// coords y grows downward, so the leg with the LARGER ankle-y is planted.
export function detectStanceLeg(normalized: NormalizedLandmark[]): Leg | null {
  const leftAnkle = normalized[POSE_LANDMARKS.leftAnkle];
  const rightAnkle = normalized[POSE_LANDMARKS.rightAnkle];
  if (!visible(leftAnkle) || !visible(rightAnkle)) return null;

  const dy = leftAnkle.y - rightAnkle.y;
  if (Math.abs(dy) < STANCE_MIN_DY) return null;
  return dy > 0 ? 'left' : 'right';
}
