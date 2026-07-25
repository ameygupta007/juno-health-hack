import { POSE_LANDMARKS, type NormalizedLandmark, type PoseFrame } from '@/types/pose';

export type SupportLegState =
  | 'BOTH'
  | 'LEFT_SUPPORT'
  | 'RIGHT_SUPPORT'
  | 'AIRBORNE'
  | 'UNKNOWN';

export type FootContact = {
  contact: boolean | null;
  visibility: number;
};

export type SupportLegMetrics = {
  state: SupportLegState;
  leftContact: boolean | null;
  rightContact: boolean | null;
  leftFootVisibility: number;
  rightFootVisibility: number;
  groundY: number | null;
  groundScreenY: number | null;
  bodyScale: number | null;
  calibrationProgress: number;
  isCalibrated: boolean;
  stableForMs: number;
  lockedSupportLeg: 'left' | 'right' | null;
};

const MIN_VISIBILITY = 0.6;
const CALIBRATION_FRAMES = 30;
const EMA_ALPHA = 0.35;
const CONTACT_CONFIRM_FRAMES = 3;
const STATE_CONFIRM_FRAMES = 3;
const LOST_CONFIDENCE_FRAMES = 8;

// Tune these two ratios to change foot-contact sensitivity. They are fractions
// of shoulder-to-hip torso length, not raw image pixels.
export const CONTACT_ENTER_TORSO_RATIO = 0.1;
export const CONTACT_LEAVE_TORSO_RATIO = 0.14;

type Calibration = {
  groundY: number;
  groundScreenY: number;
  bodyScale: number;
};

export class GroundCalibrator {
  private groundSamples: number[] = [];
  private screenSamples: number[] = [];
  private scaleSamples: number[] = [];
  private validFrames = 0;
  private calibration: Calibration | null = null;

  update(frame: PoseFrame): void {
    if (this.calibration) return;

    const normalized = frame.normalizedLandmarks;
    const footPairs = [
      [POSE_LANDMARKS.leftHeel, POSE_LANDMARKS.leftFootIndex],
      [POSE_LANDMARKS.rightHeel, POSE_LANDMARKS.rightFootIndex],
    ] as const;

    // Calibration only advances when at least one ground landmark is visible
    // on each anatomical foot.
    const leftValid = footPairs[0].some((index) => visible(normalized[index]));
    const rightValid = footPairs[1].some((index) => visible(normalized[index]));
    if (!leftValid || !rightValid) return;

    for (const [heelIndex, toeIndex] of footPairs) {
      for (const index of [heelIndex, toeIndex]) {
        const point = normalized[index];
        const screenPoint = frame.landmarks[index];
        if (visible(point)) this.groundSamples.push(point.y);
        if (visible(point) && screenPoint) this.screenSamples.push(screenPoint.y);
      }
    }

    const torsoLength = computeTorsoLength(normalized);
    if (torsoLength !== null) this.scaleSamples.push(torsoLength);
    this.validFrames += 1;

    if (
      this.validFrames >= CALIBRATION_FRAMES &&
      this.groundSamples.length > 0 &&
      this.screenSamples.length > 0 &&
      this.scaleSamples.length > 0
    ) {
      this.calibration = {
        groundY: median(this.groundSamples),
        groundScreenY: median(this.screenSamples),
        bodyScale: median(this.scaleSamples),
      };
    }
  }

  get value(): Calibration | null {
    return this.calibration;
  }

  get progress(): number {
    return Math.min(1, this.validFrames / CALIBRATION_FRAMES);
  }

  reset(): void {
    this.groundSamples = [];
    this.screenSamples = [];
    this.scaleSamples = [];
    this.validFrames = 0;
    this.calibration = null;
  }
}

export class FootContactDetector {
  private smoothed = new Map<number, number>();
  private stableContact: boolean | null = null;
  private candidate: boolean | null = null;
  private candidateFrames = 0;
  private missingFrames = 0;

  constructor(
    private readonly heelIndex: number,
    private readonly toeIndex: number,
  ) {}

  update(
    landmarks: NormalizedLandmark[],
    groundY: number,
    bodyScale: number,
  ): FootContact {
    const heel = landmarks[this.heelIndex];
    const toe = landmarks[this.toeIndex];
    const validPoints = [
      { point: heel, index: this.heelIndex },
      { point: toe, index: this.toeIndex },
    ].filter(
      (item): item is { point: NormalizedLandmark; index: number } =>
        visible(item.point),
    );
    const visibility = Math.max(heel?.visibility ?? 0, toe?.visibility ?? 0);

    if (validPoints.length === 0) {
      this.missingFrames += 1;
      return {
        contact:
          this.missingFrames <= LOST_CONFIDENCE_FRAMES
            ? this.stableContact
            : null,
        visibility,
      };
    }

    this.missingFrames = 0;
    const leaveThreshold = bodyScale * CONTACT_LEAVE_TORSO_RATIO;
    const enterThreshold = bodyScale * CONTACT_ENTER_TORSO_RATIO;
    const threshold = this.stableContact === true ? leaveThreshold : enterThreshold;

    // Either a visible heel or toe near the calibrated plane means contact.
    const clearances = validPoints.map(({ point, index }) => {
      const previous = this.smoothed.get(index);
      const smoothedY =
        previous === undefined ? point.y : previous + EMA_ALPHA * (point.y - previous);
      this.smoothed.set(index, smoothedY);
      return groundY - smoothedY;
    });
    const rawContact = clearances.some((clearance) => clearance <= threshold);

    if (rawContact === this.candidate) {
      this.candidateFrames += 1;
    } else {
      this.candidate = rawContact;
      this.candidateFrames = 1;
    }

    if (this.candidateFrames >= CONTACT_CONFIRM_FRAMES) {
      this.stableContact = rawContact;
    }

    return { contact: this.stableContact, visibility };
  }

  reset(): void {
    this.smoothed.clear();
    this.stableContact = null;
    this.candidate = null;
    this.candidateFrames = 0;
    this.missingFrames = 0;
  }
}

export class SupportLegTracker {
  private state: SupportLegState = 'UNKNOWN';
  private candidate: SupportLegState = 'UNKNOWN';
  private candidateFrames = 0;
  private candidateSince = 0;
  private stableSince = 0;
  private unknownFrames = 0;
  private lockedSupportLeg: 'left' | 'right' | null = null;

  update(left: FootContact, right: FootContact, timestamp: number): void {
    if (left.contact === null || right.contact === null) {
      this.unknownFrames += 1;
      if (this.unknownFrames > LOST_CONFIDENCE_FRAMES && this.lockedSupportLeg === null) {
        this.state = 'UNKNOWN';
        this.stableSince = timestamp;
      }
      return;
    }

    this.unknownFrames = 0;
    const raw = stateFromContacts(left.contact, right.contact);
    if (raw === this.candidate) {
      this.candidateFrames += 1;
    } else {
      this.candidate = raw;
      this.candidateFrames = 1;
      this.candidateSince = timestamp;
    }

    if (this.candidateFrames >= STATE_CONFIRM_FRAMES && raw !== this.state) {
      this.state = raw;
      this.stableSince = this.candidateSince;
    }
  }

  lockCurrentSupport(): 'left' | 'right' | null {
    if (this.state === 'LEFT_SUPPORT') this.lockedSupportLeg = 'left';
    if (this.state === 'RIGHT_SUPPORT') this.lockedSupportLeg = 'right';
    return this.lockedSupportLeg;
  }

  unlock(): void {
    this.lockedSupportLeg = null;
  }

  getMetrics(
    left: FootContact,
    right: FootContact,
    calibration: Calibration | null,
    calibrationProgress: number,
    timestamp: number,
  ): SupportLegMetrics {
    return {
      state: this.state,
      leftContact: left.contact,
      rightContact: right.contact,
      leftFootVisibility: left.visibility,
      rightFootVisibility: right.visibility,
      groundY: calibration?.groundY ?? null,
      groundScreenY: calibration?.groundScreenY ?? null,
      bodyScale: calibration?.bodyScale ?? null,
      calibrationProgress,
      isCalibrated: calibration !== null,
      stableForMs: Math.max(0, timestamp - this.stableSince),
      lockedSupportLeg: this.lockedSupportLeg,
    };
  }

  reset(): void {
    this.state = 'UNKNOWN';
    this.candidate = 'UNKNOWN';
    this.candidateFrames = 0;
    this.candidateSince = 0;
    this.stableSince = 0;
    this.unknownFrames = 0;
    this.lockedSupportLeg = null;
  }
}

function stateFromContacts(left: boolean, right: boolean): SupportLegState {
  if (left && right) return 'BOTH';
  if (left) return 'LEFT_SUPPORT';
  if (right) return 'RIGHT_SUPPORT';
  return 'AIRBORNE';
}

function computeTorsoLength(landmarks: NormalizedLandmark[]): number | null {
  const leftShoulder = landmarks[POSE_LANDMARKS.leftShoulder];
  const rightShoulder = landmarks[POSE_LANDMARKS.rightShoulder];
  const leftHip = landmarks[POSE_LANDMARKS.leftHip];
  const rightHip = landmarks[POSE_LANDMARKS.rightHip];
  if (
    !visible(leftShoulder) ||
    !visible(rightShoulder) ||
    !visible(leftHip) ||
    !visible(rightHip)
  ) {
    return null;
  }

  const shoulder = midpoint(leftShoulder, rightShoulder);
  const hip = midpoint(leftHip, rightHip);
  return Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y);
}

function midpoint(a: NormalizedLandmark, b: NormalizedLandmark) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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
