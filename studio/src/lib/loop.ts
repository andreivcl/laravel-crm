/**
 * Seamless-loop helpers.
 *
 * Every continuous motion in the scenes is a function of the loop phase
 * `a = 2π · frame / durationInFrames`, using only integer frequencies.
 * That guarantees the last frame flows straight back into the first one,
 * so the platform's auto-replay looks like one endless take (replays count
 * as views on TikTok, Reels and Shorts).
 */
export const TAU = Math.PI * 2;

export const loopAngle = (frame: number, duration: number) =>
  (TAU * frame) / duration;

/** Seeded PRNG (mulberry32) – identical output on every render worker. */
export const rng = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

/** Smooth 0→1→0 bump with zero slope at both ends (loop-safe). */
export const loopBump = (a: number, k = 1) => 0.5 - 0.5 * Math.cos(a * k);
