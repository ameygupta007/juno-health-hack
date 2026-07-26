import { POSE_LANDMARKS, type NormalizedLandmark, type PoseFrame } from '@/types/pose';

export type BodyMotionMetrics = {
  upwardVelocity: number;
  upwardAcceleration: number;
  upwardPointRatio: number;
  jumpImpulse: boolean;
};

const TRACKED_POINTS = [
  POSE_LANDMARKS.leftShoulder,
  POSE_LANDMARKS.rightShoulder,
  POSE_LANDMARKS.leftHip,
  POSE_LANDMARKS.rightHip,
  POSE_LANDMARKS.leftKnee,
  POSE_LANDMARKS.rightKnee,
  POSE_LANDMARKS.leftAnkle,
  POSE_LANDMARKS.rightAnkle,
] as const;

const MIN_VISIBILITY = 0.6;
const MIN_VISIBLE_POINTS = 6;
const POSITION_EMA_ALPHA = 0.4;
const VELOCITY_EMA_ALPHA = 0.35;

// Units are torso-lengths per second and torso-lengths per second squared.
// Tune these when real-device traces show hops are too easy/hard to trigger.
export const UPWARD_VELOCITY_THRESHOLD = 0.32;
export const UPWARD_ACCELERATION_THRESHOLD = 1.4;
export const UPWARD_POINT_RATIO_THRESHOLD = 0.65;

const EMPTY_METRICS: BodyMotionMetrics = {
  upwardVelocity: 0,
  upwardAcceleration: 0,
  upwardPointRatio: 0,
  jumpImpulse: false,
};

export class BodyMotionDetector {
  private smoothedY = new Map<number, number>();
  private smoothedVelocity = new Map<number, number>();
  private previousTimestamp: number | null = null;

  update(frame: PoseFrame, bodyScale: number | null): BodyMotionMetrics {
    if (!bodyScale || bodyScale <= 0) {
      this.previousTimestamp = frame.timestamp;
      return EMPTY_METRICS;
    }

    const previousTimestamp = this.previousTimestamp;
    this.previousTimestamp = frame.timestamp;
    if (previousTimestamp === null) {
      this.seed(frame.normalizedLandmarks);
      return EMPTY_METRICS;
    }

    const dt = Math.min(0.1, Math.max(1 / 60, (frame.timestamp - previousTimestamp) / 1000));
    const velocities: number[] = [];
    const accelerations: number[] = [];

    for (const index of TRACKED_POINTS) {
      const point = frame.normalizedLandmarks[index];
      if (!visible(point)) continue;

      const previousY = this.smoothedY.get(index);
      if (previousY === undefined) {
        this.smoothedY.set(index, point.y);
        continue;
      }

      const nextY = previousY + POSITION_EMA_ALPHA * (point.y - previousY);
      this.smoothedY.set(index, nextY);
      // Image y decreases when the body moves upward.
      const rawVelocity = (previousY - nextY) / (dt * bodyScale);
      const previousVelocity = this.smoothedVelocity.get(index) ?? rawVelocity;
      const velocity =
        previousVelocity +
        VELOCITY_EMA_ALPHA * (rawVelocity - previousVelocity);
      this.smoothedVelocity.set(index, velocity);

      velocities.push(velocity);
      accelerations.push((velocity - previousVelocity) / dt);
    }

    if (velocities.length < MIN_VISIBLE_POINTS) return EMPTY_METRICS;
    const upwardVelocity = median(velocities);
    const upwardAcceleration = median(accelerations);
    const upwardPointRatio =
      velocities.filter((velocity) => velocity > UPWARD_VELOCITY_THRESHOLD * 0.5)
        .length / velocities.length;

    return {
      upwardVelocity,
      upwardAcceleration,
      upwardPointRatio,
      jumpImpulse:
        upwardVelocity >= UPWARD_VELOCITY_THRESHOLD &&
        upwardAcceleration >= UPWARD_ACCELERATION_THRESHOLD &&
        upwardPointRatio >= UPWARD_POINT_RATIO_THRESHOLD,
    };
  }

  reset(): void {
    this.smoothedY.clear();
    this.smoothedVelocity.clear();
    this.previousTimestamp = null;
  }

  private seed(landmarks: NormalizedLandmark[]): void {
    for (const index of TRACKED_POINTS) {
      const point = landmarks[index];
      if (visible(point)) this.smoothedY.set(index, point.y);
    }
  }
}

function visible(
  landmark: NormalizedLandmark | undefined,
): landmark is NormalizedLandmark {
  return !!landmark && landmark.visibility >= MIN_VISIBILITY;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
