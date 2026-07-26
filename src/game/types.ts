// Rail Grind Pro — single-leg-squat balance game (src/game/useRailRun.ts).
export type RailRunSummary = {
  score: number;
  wipeouts: number;
  bestStreakMs: number;
  eventCount: number;
  fatigue: boolean;
};

export type ActiveRailRun = {
  startedAt: number;
  endsAt: number;
  score: number;
  multiplier: number;
  streakMs: number;
  bestStreakMs: number;
  wipeouts: number;
  wipeoutUntil: number;
  lastTickAt: number;
};
