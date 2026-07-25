export type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  intro: string;
  targetStars: number;
  durationMs: number;
  spawnIntervalMs: number;
  starLifetimeMs: number;
};

// Each chapter is a constellation. The star target rises and the time to
// gather shortens — cardio ramp, essentially.
export const CHAPTERS: Chapter[] = [
  {
    id: 'sparrow',
    title: 'The Sparrow',
    subtitle: 'Chapter I',
    intro:
      'A sparrow was the first star the sky-weavers ever hung. Small, quick, alive. Reach up and gather her feathers before they fade.',
    targetStars: 8,
    durationMs: 25_000,
    spawnIntervalMs: 1200,
    starLifetimeMs: 3000,
  },
  {
    id: 'willow',
    title: 'The Willow',
    subtitle: 'Chapter II',
    intro:
      'The willow bends but does not break. Its stars fall wide — you must stretch to meet them, and stay rooted so their light does not scatter.',
    targetStars: 14,
    durationMs: 30_000,
    spawnIntervalMs: 900,
    starLifetimeMs: 2600,
  },
  {
    id: 'mountain',
    title: 'The Mountain',
    subtitle: 'Chapter III',
    intro:
      'Highest of the seven. The Mountain does not rush; the Mountain endures. Move with intention. Keep your center. The stars will come.',
    targetStars: 22,
    durationMs: 35_000,
    spawnIntervalMs: 700,
    starLifetimeMs: 2400,
  },
];

export const EPILOGUE =
  'The sky is whole again. Nirin sleeps beneath your constellations. Somewhere, a child looks up and wonders how the stars came home.';
