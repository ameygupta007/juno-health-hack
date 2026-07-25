export type Star = {
  id: number;
  x: number;
  y: number;
  spawnedAt: number;
  expiresAt: number;
};

export type Phase =
  | { kind: 'menu' }
  | { kind: 'intro'; chapterIndex: number }
  | { kind: 'playing'; chapterIndex: number }
  | { kind: 'result'; chapterIndex: number; caught: number; bonuses: number }
  | { kind: 'epilogue' };

export type ActiveRound = {
  chapterIndex: number;
  startedAt: number;
  endsAt: number;
  stars: Star[];
  caught: number;
  bonuses: number;
  nextStarId: number;
  lastSpawnAt: number;
};

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
