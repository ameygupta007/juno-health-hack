export type Leg = 'left' | 'right';

export type JumpWeek = {
  leftFlightMs: number;
  rightFlightMs: number;
  leftPeakFlexionDeg: number;
  rightPeakFlexionDeg: number;
};

export type RailWeek = {
  score: number;
  wipeouts: number;
  bestStreakMs: number;
  eventCount: number;
  fatigue: boolean;
};

export type PatientSession = {
  week: number;
  jump: JumpWeek;
  rail: RailWeek;
};

export type Patient = {
  id: string;
  name: string;
  procedure: string;
  weeksInProgram: number;
  sessions: PatientSession[];
};

export type Readiness = 'improving' | 'steady' | 'flagged';
