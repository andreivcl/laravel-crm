/**
 * Small deterministic synth + mastering library for film soundtracks.
 * Every voice is a pure function of its parameters (seeded noise), so a
 * re-render is bit-identical. See .claude/skills/video-editor/references/sound.md.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { rng } from "../../src/lib/loop.ts";

export const SR = 48000;
const TAU = Math.PI * 2;

export class Mix {
  readonly dur: number;
  readonly N: number;
  readonly L: Float32Array;
  readonly R: Float32Array;
  private rand = rng(1234);
  constructor(dur: number) {
    this.dur = dur;
    this.N = Math.ceil(dur * SR);
    this.L = new Float32Array(this.N);
    this.R = new Float32Array(this.N);
  }
  private noise = () => this.rand() * 2 - 1;
  private add(i: number, v: number, pan = 0) {
    if (i < 0 || i >= this.N) return;
    const a = ((pan + 1) * Math.PI) / 4;
    this.L[i] += v * Math.cos(a) * Math.SQRT2;
    this.R[i] += v * Math.sin(a) * Math.SQRT2;
  }
  private idx = (t: number) => Math.round(t * SR);

  /** Soft chord pad. `chords` = one chord (Hz list) per `chordLen` seconds, cycled. */
  pad(chords: number[][], chordLen: number, level: (t: number) => number, cutoff: (t: number) => number) {
    const ph = new Float64Array(chords.length * 8 * 6);
    let yl = 0;
    let yr = 0;
    for (let i = 0; i < this.N; i++) {
      const t = i / SR;
      const b = Math.floor(t / chordLen);
      const inC = t - b * chordLen;
      let l = 0;
      let r = 0;
      const voices: [number, number][] = [[b % chords.length, Math.min(1, inC / 0.4)]];
      if (b > 0) voices.push([(b - 1) % chords.length, Math.max(0, 1 - inC / 0.6)]);
      for (const [ci, env] of voices) {
        if (env <= 0) continue;
        chords[ci].forEach((fr, n) => {
          for (const [h, g] of [[1, 1], [2, 0.25], [3, 0.08]] as const) {
            const k = ((ci * 8 + n) * 3 + (h - 1)) * 2;
            ph[k] += (TAU * fr * h) / SR;
            ph[k + 1] += (TAU * fr * h * 1.0022) / SR;
            l += Math.sin(ph[k]) * g * env;
            r += Math.sin(ph[k + 1]) * g * env;
          }
        });
      }
      const a = 1 - Math.exp((-TAU * cutoff(t)) / SR);
      yl += a * (l - yl);
      yr += a * (r - yr);
      const g = 0.05 * level(t);
      this.L[i] += yl * g;
      this.R[i] += yr * g;
    }
  }

  /** Plucked note (marimba-ish): sine + 4th partial, fast decay. */
  pluck(t0: number, fr: number, gain: number, pan = 0, decay = 7) {
    for (let j = 0; j < 0.8 * SR; j++) {
      const tt = j / SR;
      const env = Math.min(1, tt / 0.003) * Math.exp(-tt * decay);
      this.add(this.idx(t0) + j, (Math.sin(TAU * fr * tt) + 0.25 * Math.sin(TAU * fr * 4 * tt) * Math.exp(-tt * 20)) * env * gain, pan);
    }
  }
  bass(t0: number, fr: number, gain: number, len = 0.5) {
    for (let j = 0; j < len * SR; j++) {
      const tt = j / SR;
      const env = Math.min(1, tt / 0.01) * Math.exp(-tt * 5);
      this.add(this.idx(t0) + j, (Math.sin(TAU * fr * tt) + 0.25 * Math.sin(TAU * fr * 2 * tt)) * env * gain);
    }
  }
  kick(t0: number, gain: number) {
    let ph = 0;
    for (let j = 0; j < 0.4 * SR; j++) {
      const tt = j / SR;
      ph += (TAU * (45 + 80 * Math.exp(-tt * 28))) / SR;
      this.add(this.idx(t0) + j, Math.sin(ph) * Math.min(1, tt / 0.002) * Math.exp(-tt * 8) * gain);
    }
  }
  hat(t0: number, gain: number, pan = 0) {
    let prev = 0;
    for (let j = 0; j < 0.06 * SR; j++) {
      const n = this.noise();
      this.add(this.idx(t0) + j, (n - prev) * Math.exp((-j / SR) * 70) * gain, pan);
      prev = n;
    }
  }
  /** Clock tick: short woody click. */
  tick(t0: number, gain: number, high = false) {
    const fr = high ? 2600 : 1900;
    for (let j = 0; j < 0.05 * SR; j++) {
      const tt = j / SR;
      this.add(this.idx(t0) + j, (Math.sin(TAU * fr * tt) * 0.6 + this.noise() * 0.4) * Math.exp(-tt * 120) * gain, high ? 0.2 : -0.2);
    }
  }
  /** Band-passed noise sweep, loudest at `peakAt`. */
  whoosh(peakAt: number, len: number, gain: number, opts: { reverse?: boolean; up?: boolean; pan?: number } = {}) {
    const { reverse = false, up = false, pan = 0 } = opts;
    const start = peakAt - len * (reverse ? 0.85 : 0.35);
    let lp = 0;
    let bp = 0;
    for (let j = 0; j < len * SR; j++) {
      const x = j / (len * SR);
      const env = reverse ? Math.pow(x, 2.2) * (x < 0.85 ? 1 : (1 - x) / 0.15) : Math.sin(Math.PI * Math.min(1, x / 0.35) * 0.5) * Math.pow(1 - x, 1.5);
      const fc = up ? 250 + 4200 * x : 300 + 3200 * (reverse ? x : 1 - Math.abs(x - 0.35));
      const f = 2 * Math.sin((Math.PI * fc) / SR);
      lp += f * bp;
      const hp = this.noise() - lp - 0.6 * bp;
      bp += f * hp;
      this.add(this.idx(start) + j, bp * env * gain, pan * (x - 0.5) * 2);
    }
  }
  impact(t0: number, gain: number) {
    let ph = 0;
    let lp = 0;
    for (let j = 0; j < 1.6 * SR; j++) {
      const tt = j / SR;
      ph += (TAU * (34 + 30 * Math.exp(-tt * 6))) / SR;
      lp += 0.08 * (this.noise() - lp);
      const v = Math.sin(ph) * Math.exp(-tt * 2.2) + lp * Math.exp(-tt * 14) * 2.5 + this.noise() * Math.exp(-tt * 90) * 0.5;
      this.add(this.idx(t0) + j, v * Math.min(1, tt / 0.004) * gain);
    }
  }
  /** Soft landing thud (smaller than an impact). */
  thud(t0: number, gain: number, pan = 0) {
    let ph = 0;
    let lp = 0;
    for (let j = 0; j < 0.35 * SR; j++) {
      const tt = j / SR;
      ph += (TAU * (70 + 60 * Math.exp(-tt * 30))) / SR;
      lp += 0.15 * (this.noise() - lp);
      this.add(this.idx(t0) + j, (Math.sin(ph) * Math.exp(-tt * 12) + lp * Math.exp(-tt * 30)) * Math.min(1, tt / 0.003) * gain, pan);
    }
  }
  riser(from: number, to: number, gain: number) {
    let ph = 0;
    let lp = 0;
    const len = to - from;
    for (let j = 0; j < len * SR; j++) {
      const x = j / (len * SR);
      ph += (TAU * 220 * Math.pow(4, x)) / SR;
      lp += (0.02 + 0.4 * x) * (this.noise() - lp);
      this.add(this.idx(from) + j, (Math.sin(ph) * 0.35 + lp * 0.9) * Math.pow(x, 1.8) * gain);
    }
  }
  /** Bell sparkle (pentatonic arpeggio when given several notes). */
  bells(t0: number, notes: number[], gain: number, step = 0.07) {
    notes.forEach((fr, k) => {
      for (let j = 0; j < 0.9 * SR; j++) {
        const tt = j / SR;
        const env = Math.min(1, tt / 0.003) * Math.exp(-tt * 6);
        const v = (Math.sin(TAU * fr * tt) + 0.3 * Math.sin(TAU * fr * 2.76 * tt) * Math.exp(-tt * 10)) * env * gain;
        this.add(this.idx(t0 + k * step) + j, v, -0.4 + (0.8 * k) / Math.max(1, notes.length - 1));
      }
    });
  }
  /** Cartoon "boing": pitch wobble. */
  boing(t0: number, gain: number) {
    let ph = 0;
    for (let j = 0; j < 0.6 * SR; j++) {
      const tt = j / SR;
      ph += (TAU * (220 + 90 * Math.sin(TAU * 9 * tt) * Math.exp(-tt * 4) + 140 * Math.exp(-tt * 10))) / SR;
      this.add(this.idx(t0) + j, Math.sin(ph) * Math.exp(-tt * 5) * Math.min(1, tt / 0.004) * gain);
    }
  }
  /** Hard silences with 10 ms ramps. */
  silence(windows: { from: number; to: number }[]) {
    const ramp = Math.round(0.01 * SR);
    for (const w of windows) {
      const a = this.idx(w.from);
      const b = this.idx(w.to);
      for (let i = a - ramp; i < b; i++) {
        if (i < 0 || i >= this.N) continue;
        const g = i < a ? 1 - (i - (a - ramp)) / ramp : 0;
        this.L[i] *= g;
        this.R[i] *= g;
      }
    }
  }

  /** Soft-clip, write 16-bit WAV, two-pass loudnorm to −14 LUFS / −1.5 dBTP, measure. */
  master(file: string) {
    let peak = 0;
    for (let i = 0; i < this.N; i++) {
      if (!Number.isFinite(this.L[i]) || !Number.isFinite(this.R[i])) throw new Error(`non-finite sample at ${(i / SR).toFixed(3)} s`);
      this.L[i] = Math.tanh(this.L[i] * 1.2) / 1.2;
      this.R[i] = Math.tanh(this.R[i] * 1.2) / 1.2;
      peak = Math.max(peak, Math.abs(this.L[i]), Math.abs(this.R[i]));
    }
    const norm = peak > 0 ? 0.89 / peak : 1;
    const data = Buffer.alloc(this.N * 4);
    for (let i = 0; i < this.N; i++) {
      data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, this.L[i] * norm)) * 32767), i * 4);
      data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, this.R[i] * norm)) * 32767), i * 4 + 2);
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
    const raw = file.replace(/\.wav$/, ".raw.wav");
    fs.writeFileSync(raw, Buffer.concat([h, data]));
    const p1 = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${raw}" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`]).toString();
    const j = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
    execFileSync("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error", "-i", raw,
      "-af", `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`,
      "-ar", String(SR), "-c:a", "pcm_s16le", file,
    ]);
    fs.rmSync(raw);
    const m = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "${file}" -af ebur128=peak=true -f null - 2>&1 | tail -12`]).toString();
    return { lufs: m.match(/I:\s+(-?[\d.]+) LUFS/)?.[1], peak: m.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1] };
  }
}
