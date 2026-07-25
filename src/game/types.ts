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
