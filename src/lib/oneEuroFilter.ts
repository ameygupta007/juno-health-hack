// One-Euro filter (Casiez et al., 2012). A low-pass filter whose cutoff
// frequency scales with the signal's rate of change: heavy smoothing when the
// input is still (kills jitter), light smoothing when it's moving fast (keeps
// the true peak of a landing from being blunted). Better than a fixed-alpha
// EMA for real-time interaction where you can't pre-tune for a single motion
// speed.

export type OneEuroConfig = {
  minCutoff?: number; // Hz — baseline cutoff when the signal is slow
  beta?: number;      // speed→cutoff coupling; higher = more responsive to fast motion
  dCutoff?: number;   // Hz — cutoff for the internal derivative estimate
};

export type OneEuroFilter = {
  filter: (value: number, timestampMs: number) => number;
  reset: () => void;
};

export function createOneEuroFilter(config: OneEuroConfig = {}): OneEuroFilter {
  const minCutoff = config.minCutoff ?? 1.0;
  const beta = config.beta ?? 0.007;
  const dCutoff = config.dCutoff ?? 1.0;

  let xPrev: number | null = null;
  let dxPrev = 0;
  let tPrev: number | null = null;

  const alpha = (dt: number, cutoff: number) => {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  };

  return {
    filter(value, timestampMs) {
      if (xPrev === null || tPrev === null) {
        xPrev = value;
        tPrev = timestampMs;
        dxPrev = 0;
        return value;
      }
      // Clamp dt to avoid divide-by-zero when two frames share a timestamp.
      const dt = Math.max((timestampMs - tPrev) / 1000, 1e-6);
      tPrev = timestampMs;

      const dx = (value - xPrev) / dt;
      const aD = alpha(dt, dCutoff);
      const dxHat = aD * dx + (1 - aD) * dxPrev;

      const cutoff = minCutoff + beta * Math.abs(dxHat);
      const a = alpha(dt, cutoff);
      const xHat = a * value + (1 - a) * xPrev;

      xPrev = xHat;
      dxPrev = dxHat;
      return xHat;
    },
    reset() {
      xPrev = null;
      dxPrev = 0;
      tPrev = null;
    },
  };
}
