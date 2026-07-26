import type { Leg } from '@/lib/kneeFlexion';

export type JumpResult = {
  // The leg the user was instructed to jump on.
  leg: Leg;
  peakFlexionDeg: number | null;
  // What stance-detection actually saw at the moment of the peak — may differ
  // from `leg` if the user jumped on the wrong side.
  stanceLegDetected: Leg | null;
  flightMs: number;
  timestamp: number;
};

export type JumpTestState =
  | { kind: 'idle' }
  | { kind: 'awaiting'; leg: Leg; stepIndex: 1 | 2; supportReady: boolean }
  | { kind: 'complete'; results: JumpResult[] };

export type JumpTestControls = {
  state: JumpTestState;
  start: () => void;
  cancel: () => void;
  restart: () => void;
};
