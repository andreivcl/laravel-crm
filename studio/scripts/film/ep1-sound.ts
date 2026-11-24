/**
 * Score + SFX for "În lumea asta…" ep. 1, from the episode spec:
 *   node scripts/film/ep1-sound.ts  → public/audio/in-this-world-01.wav
 * Whimsical C-major marimba over a soft pad; ticks into a silence; gravity
 * "whoom" at 12:00; riser → silence → the twist; thuds that accelerate as
 * everything lands at 13:00.
 */
import path from "node:path";
import { BAR, BEAT, bar, DUR, SILENCES, T } from "../../src/films/inThisWorld/spec.ts";
import { ROOT } from "../lib.ts";
import { Mix } from "./synth.ts";

const mix = new Mix(DUR);
const C = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880 };
const CHORDS = [
  [C.C4, C.E4, C.G4], // C
  [220.0, C.C4, C.E4], // Am
  [174.61, 220.0, C.C4], // F
  [196.0, 246.94, C.D4], // G
];
const ROOTS = [130.81, 110.0, 87.31, 98.0];

const level = (t: number) =>
  t < T.setup ? 0.6 : t < T.countdown ? 0.5 : t < T.float ? 0.35 : t < T.hero ? 0.75 : t < T.fall ? 0.55 : 0.65;
mix.pad(CHORDS, BAR, level, (t) => (t < T.float ? 1200 : 2800));

// marimba melody: a playful 8-note figure per bar in the "normal" world, sparser while floating
const FIG = [C.E5, C.G4, C.C5, C.G4, C.D5, C.G4, C.C5, C.E5];
for (let b = 0; b < 31; b++) {
  const t0 = bar(b);
  const inFloat = t0 >= T.float && t0 < T.fall;
  if (t0 >= T.countdown && t0 < T.float) continue; // countdown = ticks only
  FIG.forEach((fr, k) => {
    if (inFloat && k % 2) return;
    const shift = [1, 0.84, 0.67, 0.75][b % 4]; // follow the chord roughly
    mix.pluck(t0 + k * (BEAT / 2), fr * shift, inFloat ? 0.05 : 0.07, k % 2 ? 0.25 : -0.25, inFloat ? 4 : 8);
  });
}
// bass + soft kick once gravity is back in the story beats
for (let b = 3; b < 31; b++) {
  const t0 = bar(b);
  if (t0 >= T.countdown && t0 < T.float) continue;
  mix.bass(t0, ROOTS[b % 4], 0.14);
  if (t0 >= T.hero && t0 < T.fall) for (let k = 0; k < 4; k++) mix.kick(t0 + k * BEAT, 0.35);
  if (t0 >= T.setup && t0 < T.countdown) mix.hat(t0 + BEAT * 1.5, 0.04);
}

// cues (about half the seams stay silent)
mix.whoosh(T.setup, 0.7, 0.18, { reverse: true }); // rewind to 11:58
for (let k = 0; k < 4 * 4.75; k++) {
  const t = bar(8) + k * BEAT;
  if (t < T.float - BEAT) mix.tick(t, 0.12 + 0.12 * (k / 19), k % 2 === 1); // countdown, louder each tick
}
mix.impact(T.float, 0.6); // 12:00
mix.whoosh(T.float + 0.5, 1.6, 0.22, { up: true }); // everything lifts
mix.whoosh(bar(16.4), 0.9, 0.16, { up: true, pan: 0.6 }); // the neighbour flies off
mix.bells(bar(18.3), [C.C5, C.E5, C.G5], 0.05); // "ancore" – a light glint
mix.riser(bar(19.75), T.hero - BEAT, 0.28);
mix.impact(T.hero, 1.0); // the twist – loudest moment
mix.boing(T.hero + 0.12, 0.18); // Bobo stays put
mix.bells(T.hero + 7.0, [C.G5, C.A5 * 1.5], 0.07, 0.05); // the wink
// landings accelerate (matches floatK): alternate two thud variants, gain steps down
for (let i = 0; i < 14; i++) {
  const u = (i + 1) / 14;
  const landAt = T.fall + 0.25 + 3.2 * (1 - Math.pow(1 - u, 1.8));
  mix.thud(landAt, 0.36 - i * 0.012, i % 2 ? 0.3 : -0.3);
}
mix.impact(T.cta, 0.35); // first sound after the last silence
mix.bells(T.cta + 0.05, [C.C5, C.E5, C.G5, C.C5 * 2], 0.05);

mix.silence(SILENCES);
const out = path.join(ROOT, "public/audio/in-this-world-01.wav");
const m = mix.master(out);
console.log(`✓ ${path.relative(ROOT, out)}  ${DUR.toFixed(2)} s  ${m.lufs} LUFS, true peak ${m.peak} dBTP (measured, not heard)`);
