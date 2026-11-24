/**
 * Synthesises the film's score + SFX from the same spec as the picture
 * (src/films/howItsMade.ts), then masters it to −14 LUFS / −1.5 dBTP:
 *   node scripts/film/sound.ts
 * Output: public/audio/how-its-made.wav
 *
 * Everything is deterministic (seeded noise), in A minor, on the 112.5 BPM
 * grid. Design rules (see .claude/skills/video-editor/references/sound.md):
 * accent, don't narrate · ~half the cuts silent · one riser, one main impact
 * · a real silence before the payoff · loudest moment = the payoff.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { rng } from "../../src/lib/loop.ts";
import { BEAT, bar, DUR, HERO, PANELS_AT, SILENCES, TEXTS } from "../../src/films/howItsMade.ts";
import { ROOT } from "../lib.ts";

const SR = 48000;
const N = Math.ceil(DUR * SR);
const rand = rng(1234);
const noise = () => rand() * 2 - 1;
const TAU = Math.PI * 2;

type Stem = { L: Float32Array; R: Float32Array };
const stem = (): Stem => ({ L: new Float32Array(N), R: new Float32Array(N) });
const stems = { pad: stem(), bass: stem(), drums: stem(), sfx: stem() };

const add = (s: Stem, i: number, v: number, pan = 0) => {
  if (i < 0 || i >= N) return;
  s.L[i] += v * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  s.R[i] += v * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
};
const idx = (t: number) => Math.round(t * SR);

// ------------------------------------------------------------ music: pad
const CHORDS = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [196.0, 261.63, 329.63], // C/G
  [196.0, 246.94, 293.66], // G
];
const ROOTS = [110.0, 87.31, 65.41, 98.0];

/** Section dynamics for the pad (0..1). */
const padLevel = (t: number) => {
  if (t < bar(3)) return 0.55;
  if (t < bar(8)) return 0.45;
  if (t < bar(13)) return 0.5;
  if (t < bar(18)) return 0.55;
  if (t < HERO) return 0.4;
  if (t < bar(23)) return 0.75;
  if (t < bar(28)) return 0.8;
  return 0.6;
};
/** Filter opens over the film; fully open after the hero. */
const padCutoff = (t: number) => (t < HERO ? 700 + 1300 * (t / HERO) : 3200);

{
  const lpL = { y: 0 };
  const lpR = { y: 0 };
  const phases = new Float64Array(64);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const b = Math.floor(t / bar(1));
    const inBar = t - b * bar(1);
    let l = 0;
    let r = 0;
    // current chord + release tail of the previous one (0.6 s crossfade)
    for (const [chordIdx, env] of [
      [b % 4, Math.min(1, inBar / 0.4)],
      [(b + 3) % 4, Math.max(0, 1 - inBar / 0.6)],
    ] as const) {
      if (env <= 0 || (chordIdx === (b + 3) % 4 && b === 0)) continue;
      CHORDS[chordIdx].forEach((fr, n) => {
        const k = chordIdx * 3 + n;
        for (const [h, g] of [[1, 1], [2, 0.28], [3, 0.1]] as const) {
          const det = 1 + (h === 1 ? 0.0022 : 0.0011);
          phases[k * 6 + h] += (TAU * fr * h) / SR;
          phases[k * 6 + h + 3] += (TAU * fr * h * det) / SR;
          l += Math.sin(phases[k * 6 + h]) * g * env;
          r += Math.sin(phases[k * 6 + h + 3]) * g * env;
        }
      });
    }
    const lfo = 0.85 + 0.15 * Math.sin((TAU * t) / (bar(2)));
    const a = 1 - Math.exp((-TAU * padCutoff(t)) / SR);
    lpL.y += a * (l - lpL.y);
    lpR.y += a * (r - lpR.y);
    const g = 0.055 * padLevel(t) * lfo;
    stems.pad.L[i] += lpL.y * g;
    stems.pad.R[i] += lpR.y * g;
  }
}

// ------------------------------------------------------------ music: bass
for (let b = 8; b < 31; b++) {
  for (const beatInBar of [0, 2]) {
    const t0 = bar(b) + beatInBar * BEAT;
    const fr = ROOTS[b % 4];
    const len = 0.5;
    const gain = t0 >= HERO && t0 < bar(28) ? 0.22 : 0.15;
    for (let j = 0; j < len * SR; j++) {
      const tt = j / SR;
      const env = Math.min(1, tt / 0.01) * Math.exp(-tt * 5);
      const v = (Math.sin(TAU * fr * tt) + 0.25 * Math.sin(TAU * fr * 2 * tt)) * env * gain;
      add(stems.bass, idx(t0) + j, v);
    }
  }
}

// ------------------------------------------------------------ drums
const kick = (t0: number, gain: number) => {
  let ph = 0;
  for (let j = 0; j < 0.4 * SR; j++) {
    const tt = j / SR;
    const fr = 45 + 80 * Math.exp(-tt * 28);
    ph += (TAU * fr) / SR;
    const env = Math.min(1, tt / 0.002) * Math.exp(-tt * 8);
    add(stems.drums, idx(t0) + j, Math.sin(ph) * env * gain);
  }
};
const hat = (t0: number, gain: number, pan: number) => {
  let prev = 0;
  for (let j = 0; j < 0.06 * SR; j++) {
    const tt = j / SR;
    const n = noise();
    const hp = n - prev; // crude high-pass
    prev = n;
    add(stems.drums, idx(t0) + j, hp * Math.exp(-tt * 70) * gain, pan);
  }
};
for (let b = 8; b < 31; b++) {
  for (let beat = 0; beat < 4; beat++) {
    const t0 = bar(b) + beat * BEAT;
    const post = t0 >= HERO && t0 < bar(28) - BEAT;
    if (post) kick(t0, 0.55);
    else if (t0 < HERO - BEAT && (beat === 0 || beat === 2) && b < 18) kick(t0, 0.32);
    else if (t0 >= bar(28) && beat === 0) kick(t0, 0.3);
    if (post) hat(t0 + BEAT / 2, beat % 2 ? 0.05 : 0.07, beat % 2 ? 0.25 : -0.25);
  }
}

// ------------------------------------------------------------ SFX
/** Band-passed noise sweep. peakAt = when it should be loudest. */
const whoosh = (peakAt: number, len: number, gain: number, reverse = false, pan = 0) => {
  const start = peakAt - len * (reverse ? 0.85 : 0.35);
  let lp = 0;
  let bp = 0;
  for (let j = 0; j < len * SR; j++) {
    const x = j / (len * SR);
    const env = reverse ? Math.pow(x, 2.2) * (x < 0.85 ? 1 : (1 - x) / 0.15) : Math.sin(Math.PI * Math.min(1, x / 0.35) * 0.5) * Math.pow(1 - x, 1.5);
    const fc = 300 + 3200 * (reverse ? x : 1 - Math.abs(x - 0.35));
    const f = 2 * Math.sin((Math.PI * fc) / SR);
    const n = noise();
    lp += f * bp;
    const hp = n - lp - 0.6 * bp;
    bp += f * hp;
    add(stems.sfx, idx(start) + j, bp * env * gain, pan * (x - 0.5) * 2);
  }
};
const impact = (t0: number, gain: number) => {
  let ph = 0;
  let lp = 0;
  for (let j = 0; j < 1.6 * SR; j++) {
    const tt = j / SR;
    const fr = 34 + 30 * Math.exp(-tt * 6);
    ph += (TAU * fr) / SR;
    const sub = Math.sin(ph) * Math.exp(-tt * 2.2);
    lp += 0.08 * (noise() - lp);
    const body = lp * Math.exp(-tt * 14) * 2.5;
    const crack = noise() * Math.exp(-tt * 90) * 0.5;
    const env = Math.min(1, tt / 0.004);
    add(stems.sfx, idx(t0) + j, (sub + body + crack) * env * gain);
  }
};
const riser = (from: number, to: number, gain: number) => {
  let ph = 0;
  let lp = 0;
  const len = to - from;
  for (let j = 0; j < len * SR; j++) {
    const x = j / (len * SR);
    const fr = 220 * Math.pow(4, x);
    ph += (TAU * fr) / SR;
    lp += (0.02 + 0.4 * x) * (noise() - lp);
    const env = Math.pow(x, 1.8);
    add(stems.sfx, idx(from) + j, (Math.sin(ph) * 0.35 + lp * 0.9) * env * gain);
  }
};
const bell = (t0: number, fr: number, gain: number, pan: number) => {
  for (let j = 0; j < 0.9 * SR; j++) {
    const tt = j / SR;
    const env = Math.min(1, tt / 0.003) * Math.exp(-tt * 6);
    const v = (Math.sin(TAU * fr * tt) + 0.3 * Math.sin(TAU * fr * 2.76 * tt) * Math.exp(-tt * 10)) * env * gain;
    add(stems.sfx, idx(t0) + j, v, pan);
  }
};
const tick = (t0: number, gain: number, variant: number) => {
  const fr = variant ? 2400 : 1800;
  for (let j = 0; j < 0.05 * SR; j++) {
    const tt = j / SR;
    add(stems.sfx, idx(t0) + j, (Math.sin(TAU * fr * tt) * 0.6 + noise() * 0.4) * Math.exp(-tt * 120) * gain, variant ? 0.3 : -0.3);
  }
};
const pluck = (t0: number, gain: number) => {
  let ph = 0;
  for (let j = 0; j < 0.5 * SR; j++) {
    const tt = j / SR;
    const fr = 660 + 330 * Math.exp(-tt * 30);
    ph += (TAU * fr) / SR;
    add(stems.sfx, idx(t0) + j, Math.sin(ph) * Math.exp(-tt * 9) * gain);
  }
};

// cue table – every cue anchored to the spec, about half of the seams stay silent
whoosh(bar(3), 0.7, 0.35, true); // rewind into the time cut
whoosh(bar(8) + BEAT / 2, 0.6, 0.22, false, 1); // wipe: wire → grey
pluck(bar(10.5) + BEAT / 2, 0.22); // grey → toon ("cartoon" pop); no whoosh here
whoosh(bar(13) + BEAT / 2, 0.6, 0.2, false, -1); // wipe → lit
PANELS_AT.forEach((t, k) => tick(t + 0.12, 0.4 - k * 0.035, k % 2)); // panels land
riser(bar(18.25), HERO - BEAT, 0.3); // build, hard stop into the silence
impact(HERO, 0.62); // the payoff – loudest moment
const s3 = TEXTS.find((x) => x.id === "s3")!;
[880, 1046.5, 1174.66, 1318.51, 1567.98].forEach((fr, k) => bell(s3.from + 0.35 + k * 0.07, fr, 0.06, -0.4 + k * 0.2)); // "dispersie"
whoosh(bar(23), 0.5, 0.25, false, 1); // cut into the montage
whoosh(bar(25.5), 0.4, 0.16, false, -1);
whoosh(bar(26.5), 0.35, 0.12, false, 1);
impact(bar(28), 0.3); // first sound after the second silence: CTA lands
[440, 523.25, 659.25].forEach((fr, k) => bell(bar(28) + 0.05 + k * 0.03, fr, 0.05, (k - 1) * 0.3));

// ------------------------------------------------------------ mix + silences
const GAINS = { pad: 1.0, bass: 0.9, drums: 0.9, sfx: 1.0 };
const outL = new Float32Array(N);
const outR = new Float32Array(N);
for (const [name, s] of Object.entries(stems) as [keyof typeof stems, Stem][]) {
  for (let i = 0; i < N; i++) {
    outL[i] += s.L[i] * GAINS[name];
    outR[i] += s.R[i] * GAINS[name];
  }
}
// hard silences (10 ms ramps); the impact after each silence is outside the window
for (const s of SILENCES) {
  const a = idx(s.from);
  const b = idx(s.to);
  const ramp = Math.round(0.01 * SR);
  for (let i = a - ramp; i < b; i++) {
    if (i < 0 || i >= N) continue;
    const g = i < a ? 1 - (i - (a - ramp)) / ramp : 0;
    outL[i] *= g;
    outR[i] *= g;
  }
}
// gentle soft-clip + loop-friendly edges
let peak = 0;
for (let i = 0; i < N; i++) {
  outL[i] = Math.tanh(outL[i] * 1.2) / 1.2;
  outR[i] = Math.tanh(outR[i] * 1.2) / 1.2;
  peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
}
const norm = peak > 0 ? 0.89 / peak : 1;

// ------------------------------------------------------------ write + master
const wav = (file: string) => {
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[i] * norm)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[i] * norm)) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
};

const outDir = path.join(ROOT, "public/audio");
fs.mkdirSync(outDir, { recursive: true });
const raw = path.join(outDir, "how-its-made.raw.wav");
const final = path.join(outDir, "how-its-made.wav");
wav(raw);

// two-pass loudnorm (one pass misses by ~0.5 LU)
const pass1 = execFileSync("sh", [
  "-c",
  `ffmpeg -hide_banner -i "${raw}" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`,
]).toString();
const m = pass1.slice(pass1.lastIndexOf("{"), pass1.lastIndexOf("}") + 1);
const j = JSON.parse(m);
execFileSync("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  raw,
  "-af",
  `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`,
  "-ar",
  String(SR),
  "-c:a",
  "pcm_s16le",
  final,
]);
fs.rmSync(raw);
const meter = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "${final}" -af ebur128=peak=true -f null - 2>&1 | tail -12`]).toString();
const I = meter.match(/I:\s+(-?[\d.]+) LUFS/)?.[1];
const TP = meter.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1];
console.log(`✓ ${path.relative(ROOT, final)}  ${DUR.toFixed(2)} s  integrated ${I} LUFS, true peak ${TP} dBTP (measured, not heard)`);
