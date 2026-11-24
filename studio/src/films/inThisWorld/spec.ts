/**
 * Series "În lumea asta…" – episode 1: "În lumea asta, gravitația dispare la prânz".
 *
 * Format of the series: the hook states the world's one rule ("În lumea asta, …"),
 * then the episode shows what happens: setup → countdown → the rule kicks in
 * (pattern interrupt ~28 s) → how people adapted → twist (hero, ~69 %) →
 * resolution → comment CTA, with the last beat looping into frame 0.
 *
 * Same contract as howItsMade.ts: one spec drives picture, sound and QA.
 * Grid: 112.5 BPM at 30 fps ⇒ 1 beat = 16 frames.
 */
export const FPS = 30;
export const BPM = 112.5;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const bar = (b: number) => b * BAR;
export const BARS = 31;
export const DUR = bar(BARS);
export const FRAMES = Math.round(DUR * FPS);

export const EPISODE = { series: "ÎN LUMEA ASTA", number: 1 };

/** Story beats (seconds). */
export const T = {
  setup: bar(3), // time cut: rewind to 11:58
  countdown: bar(8),
  ticks: [10, 11, 12].map((b) => bar(b)), // clock ticks at 11:59:57…59
  float: bar(13), // 12:00 – gravity off (pattern interrupt)
  hero: bar(21.5), // twist: Bobo doesn't float
  fall: bar(26), // 13:00 – gravity back
  cta: bar(28),
};

export type Text = {
  id: string;
  text: string;
  from: number;
  to: number;
  size: number;
  role?: "hook" | "cta" | "term";
  instant?: boolean;
  box?: [number, number, number, number];
};
const L = (id: string, text: string, b0: number, b1: number, size = 84, extra: Partial<Text> = {}): Text => ({
  id,
  text,
  from: bar(b0),
  to: bar(b1),
  size,
  ...extra,
});

// Each span obeys: legible hold ≥ max(1.5 s, 1 s + 0.3 s × words) after the last word lands.
export const TEXTS: Text[] = [
  L("hook", "În lumea asta, gravitația *dispare*", 0, 1.4, 104, { role: "hook", instant: true, box: [120, 425, 840, 130] }),
  L("promise", "Uite ce se *întâmplă*", 1.4, 2.97, 92),
  L("s1", "E 11:58 în *Cubopolis*", 3.2, 4.75),
  L("s2", "Cubi își plimbă *câinele*", 4.85, 6.4),
  L("s3", "Totul e *normal*. Deocamdată.", 6.45, 7.97),
  L("c1", "11:59. Toți se *țin* bine", 8.2, 9.9),
  L("c2", "Cubi se ține de *stâlp*", 10.0, 11.7),
  L("f1", "12:00. Totul *plutește*", 13.25, 14.6),
  L("f2", "Mașini. Bănci. *Copaci.*", 14.7, 16.1),
  L("f3", "Cine nu se ține, *zboară*", 16.2, 17.9),
  L("a1", "De-asta casele au *ancore*", 18.05, 19.6),
  L("a2", "Dar ceva nu se *potrivește*…", 19.62, 21.4),
  L("t1", "Bobo *nu* plutește", 21.6, 23.0),
  L("t2", "Nimeni nu știe *de ce*", 23.1, 24.8),
  L("t3", "*Bobo* știe.", 24.83, 26.0),
  L("r1", "13:00. Totul *cade* la loc", 26.05, 27.75),
  // DECISION: social CTA only at the end (comment prompt), not role "cta" for the 3 s rule.
  L("cta", "Ce lume vrei *mâine*?", 28.05, 30.72, 92),
  // DECISION: loop bridge – the hook returns on the last beat so the replay seam has no text pop.
  L("hookLoop", "În lumea asta, gravitația *dispare*", 30.75, 31, 104, { instant: true }),
];

export const SILENCES = [
  { from: T.float - BEAT, to: T.float },
  { from: T.hero - BEAT, to: T.hero },
  { from: T.cta - BEAT, to: T.cta },
];
export const CUTS = [T.setup];
export const TERMS: string[] = ["gravitația"];

/** Camera: spherical around a moving target. `cut` keys are jumped to. */
export type CamKey = {
  t: number;
  target: [number, number, number];
  az: number;
  el: number;
  dist: number;
  cut?: boolean;
  why: string;
};
export const CAMERA: CamKey[] = [
  { t: 0, target: [0, 3.4, 0], az: 32, el: 22, dist: 36, why: "hook: the whole floating island" },
  { t: bar(3), target: [0, 3.2, 0], az: 40, el: 22, dist: 34, why: "slow orbit under the hook" },
  { t: bar(3), target: [-2.4, 1.0, 1.4], az: 24, el: 14, dist: 12, cut: true, why: "time cut to 11:58, street level" },
  { t: bar(8), target: [0.2, 1.1, 1.8], az: 8, el: 12, dist: 11, why: "track Cubi and Bobo along the road" },
  { t: bar(10.5), target: [3, 3.8, -2.4], az: -18, el: 8, dist: 12, why: "tilt to the clock tower for the countdown" },
  { t: bar(13), target: [0.6, 1.8, 1.8], az: -10, el: 10, dist: 13, why: "back to Cubi as gravity goes" },
  { t: bar(18), target: [0, 4.0, 0], az: -38, el: 22, dist: 32, why: "pull back: the whole town floats" },
  { t: bar(21), target: [0, 3.6, 0], az: -24, el: 20, dist: 30, why: "slow orbit, anticipation" },
  { t: bar(21.5), target: [1.7, 0.6, 2.9], az: 18, el: 8, dist: 7.5, cut: true, why: "hero: cut in close on Bobo" },
  { t: bar(26), target: [1.7, 0.8, 2.9], az: 30, el: 10, dist: 8.5, why: "hold on Bobo through the twist" },
  { t: bar(26), target: [0, 3.0, 0], az: -14, el: 24, dist: 30, cut: true, why: "wide for the fall" },
  { t: bar(28), target: [0, 3.2, 0], az: 10, el: 23, dist: 33, why: "drift into the CTA" },
  { t: DUR, target: [0, 3.4, 0], az: 32, el: 22, dist: 36, why: "land on frame 0 (loop)" },
];
