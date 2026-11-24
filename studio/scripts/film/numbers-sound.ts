/**
 * Score, SFX and final mix for "In this world, everyone has a number":
 *   node scripts/film/numbers-sound.ts → public/audio/numbers-mix.wav
 * Bed (music + SFX) is synthesised from the narration's word timings, ducked
 * under the voice with a sidechain compressor, then mastered to −14 LUFS.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../lib.ts";
import { Mix } from "./synth.ts";

type W = { w: string; start: number; end: number };
type L = { id: string; start: number; end: number; words: W[] };
const vo = JSON.parse(fs.readFileSync(path.join(ROOT, "src/films/numbers/script.vo.json"), "utf8")) as { dur: number; lines: L[] };
const at = (id: string, m?: string) => {
  const l = vo.lines.find((x) => x.id === id)!;
  if (!m) return l.start;
  return l.words.find((x) => x.w.toLowerCase().replace(/[^\w,]/g, "").startsWith(m.toLowerCase()))!.start;
};
const DUR = Math.ceil((vo.dur + 2.2) * 30) / 30;

const E = {
  arena: at("rising"),
  laugh: at("laugh"),
  push: at("fly") - 0.15,
  land: at("fly") - 0.15 + 0.12 + 0.686,
  hit1: at("again1", "hits"),
  hit2: at("again2"),
  silent: at("silent"),
  reveal: at("backup"),
  c9998: at("climb"),
  c9999: at("climb", "9,999"),
  flash: at("flash"),
  countdown: at("decide"),
  end: at("part2"),
};

const mix = new Mix(DUR);
const BPM = 90;
const BEAT = 60 / BPM;
// D minor: Dm – Bb – F – C, one chord per bar
const CH = [
  [146.83, 174.61, 220.0],
  [116.54, 146.83, 174.61],
  [174.61, 220.0, 261.63],
  [130.81, 164.81, 196.0],
];
const level = (t: number) =>
  t < E.arena ? 0.55 : t < E.push ? 0.7 : t < E.silent ? 0.85 : t < E.reveal - 2.2 ? 0 : t < E.reveal ? 0.25 : t < E.flash ? 1.0 : 0.8;
mix.pad(CH, BEAT * 4, level, (t) => (t < E.reveal ? 900 : 2600));
const ROOT_HZ = [73.42, 58.27, 87.31, 65.41];
for (let b = 0; b * BEAT * 4 < DUR; b++) {
  const t0 = b * BEAT * 4;
  const inSilence = t0 >= E.silent - 0.2 && t0 < E.reveal;
  if (inSilence) continue;
  mix.bass(t0, ROOT_HZ[b % 4], t0 < E.arena ? 0.12 : 0.18, 1.2);
  for (let k = 0; k < 4; k++) {
    const t = t0 + k * BEAT;
    if (t >= E.silent - 0.2 && t < E.reveal) continue;
    if (t >= E.arena && t < E.silent) mix.kick(t, k % 2 ? 0.22 : 0.32);
    if (t >= E.reveal) mix.kick(t, 0.38);
    if (t >= E.push && t < E.silent) mix.hat(t + BEAT / 2, 0.05, k % 2 ? 0.3 : -0.3);
    if (t >= E.reveal) mix.hat(t + BEAT / 2, 0.06, k % 2 ? 0.3 : -0.3);
  }
}

// crowd bed in the arena (filtered noise via whooshes), laugh bursts
for (let t = E.arena; t < E.silent; t += 0.9) mix.whoosh(t, 1.4, t >= E.laugh && t < E.laugh + 1.5 ? 0.05 : 0.025, { pan: Math.sin(t) });
for (let k = 0; k < 7; k++) mix.whoosh(E.laugh + 0.1 + k * 0.17, 0.25, 0.09, { pan: k % 2 ? 0.4 : -0.4 });

// action
mix.whoosh(E.push + 0.15, 0.7, 0.3, { pan: -0.6 });
mix.thud(E.push + 0.05, 0.4);
mix.impact(E.land, 0.5);
mix.whoosh(E.land + 0.35, 0.9, 0.12, { pan: -0.8 }); // slide
mix.impact(E.hit1, 0.6);
mix.impact(E.hit2, 0.65);

// number changes ring like a bell; the roll ticks faster and faster
const ding = (t: number, g: number) => mix.bells(t, [880, 1318.5], g, 0.04);
ding(at("two"), 0.08);
ding(at("again1", "10"), 0.09);
ding(at("again2", "100"), 0.1);
for (let x = 0, t = E.reveal + 0.2; t < E.c9998 - 0.05; x++) {
  mix.tick(t, 0.05 + 0.05 * ((t - E.reveal) / (E.c9998 - E.reveal)), x % 2 === 1);
  t += Math.max(0.035, 0.22 * Math.pow(1 - (t - E.reveal) / (E.c9998 - E.reveal), 1.5));
}
mix.riser(E.reveal - 2.0, E.reveal - 0.05, 0.25);
mix.impact(E.reveal, 1.0); // hero: loudest moment
ding(E.c9998, 0.11);
mix.impact(E.c9999, 0.55);
mix.bells(E.c9999 + 0.05, [1174.66, 1567.98, 2349.32], 0.08);

// the choice
mix.impact(E.flash, 0.7);
mix.whoosh(E.flash, 0.6, 0.25);
for (let s = 0; s < 10 && E.countdown + s < DUR; s++) mix.tick(E.countdown + s, 0.18, s % 2 === 1);
mix.impact(E.end + 0.9, 0.6);

// cut-whooshes on about half of the shot changes (every other cut, skipping hits)
const cuts = [at("rule2"), at("baker"), at("champ"), at("decides"), at("mine"), at("rising"), at("vex"), at("name"), at("getup"), at("counts"), at("choice")];
cuts.forEach((t, i) => i % 2 === 0 && mix.whoosh(t, 0.45, 0.12, { pan: i % 4 ? 0.5 : -0.5 }));

const bed = path.join(ROOT, "public/audio/numbers-bed.wav");
mix.master(bed);

// duck the bed under the voice, then master the mix
const voWav = path.join(ROOT, "public/audio/numbers-vo.wav");
const raw = path.join(ROOT, "public/audio/numbers-mix.raw.wav");
const fc =
  `[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,acompressor=threshold=0.1:ratio=3:attack=5:release=80,volume=1.6,apad=whole_dur=${DUR},asplit=2[vo1][vo2];` +
  "[0:a]volume=0.55[bed];[bed][vo1]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];" +
  "[duck][vo2]amix=inputs=2:normalize=0[m]";
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", bed, "-i", voWav, "-filter_complex", fc, "-map", "[m]", "-ar", "48000", "-c:a", "pcm_s16le", raw]);
const p1 = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${raw}" -af loudnorm=I=-14:TP=-2:LRA=11:print_format=json -f null - 2>&1`]).toString();
const j = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
const out = path.join(ROOT, "public/audio/numbers-mix.wav");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", `loudnorm=I=-14:TP=-2:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, "-ar", "48000", "-c:a", "pcm_s16le", out]);
fs.rmSync(raw);
const m = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "${out}" -af ebur128=peak=true -f null - 2>&1 | tail -12`]).toString();
console.log(`✓ ${path.relative(ROOT, out)} ${DUR.toFixed(2)} s  ${m.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]} LUFS, peak ${m.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]} dBTP (measured, not heard)`);
