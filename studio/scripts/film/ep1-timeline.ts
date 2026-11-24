/**
 * Exports "În lumea asta…" ep. 1 as a video-director timeline.json and validates it:
 *   node scripts/film/ep1-timeline.ts → out/films/ep1/timeline.json
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BARS, BPM, CAMERA, CUTS, DUR, FPS, SILENCES, T, TERMS, TEXTS } from "../../src/films/inThisWorld/spec.ts";
import { ROOT } from "../lib.ts";

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const words = (s: string) => s.replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
const arrived = (instant: boolean | undefined, s: string) => (instant ? 0 : (2 + (words(s) - 1) * 2 + 14) / FPS);
const EXIT = 9 / FPS;
const beats: [string, number, number, string][] = [
  ["hook", 0, T.setup, "time cut: rewind to 11:58"],
  ["setup", T.setup, T.countdown, "next step: the countdown starts"],
  ["countdown", T.countdown, T.float, "cause → effect: 12:00 hits"],
  ["float", T.float, T.hero, "hard cut in on Bobo for the twist"],
  ["twist", T.hero, T.fall, "cut wide: gravity returns"],
  ["fall", T.fall, T.cta, "same shot drifts into the CTA"],
  ["cta", T.cta, DUR, ""],
];
const timeline = {
  meta: { w: 1080, h: 1920, fps: FPS, dur: r3(DUR), clock: "music", register: "handmade", loop: true, bpm: BPM, meter: "4/4", bars: BARS, t0: 0, grid: "designed" },
  objects: [
    { id: "cubi", role: "constant", what: "Cubi, the series' cube kid" },
    { id: "bobo", role: "hero", what: "Bobo, the cube dog that never floats" },
  ],
  scenes: beats.map(([id, a, b, why]) => ({
    id,
    start: r3(a),
    end: r3(b),
    beats: { start: r3(a) },
    reads: TEXTS.filter((x) => x.from >= a && x.from < b).map((x) => ({ what: x.text.replace(/\*/g, ""), from: r3(x.from + arrived(x.instant, x.text)), to: r3(x.to - EXIT) })),
    ...(why ? { transitionOut: { type: "cut", dur: 0, why } } : {}),
  })),
  cuts: [...CUTS, ...CAMERA.filter((c) => c.cut).map((c) => c.t)].map(r3).filter((v, i, a) => a.indexOf(v) === i),
  hero: { t: r3(T.hero), what: "everything floats except Bobo" },
  silences: SILENCES.map((s) => ({ from: r3(s.from), to: r3(s.to) })),
  texts: TEXTS.map((x) => ({ id: x.id, text: x.text.replace(/\*/g, ""), from: r3(x.from + arrived(x.instant, x.text)), to: r3(x.to - EXIT), role: x.role ?? null, px: x.size, ...(x.box ? { box: x.box } : {}) })),
  terms: TERMS,
};
const dir = path.join(ROOT, "out/films/ep1");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "timeline.json");
fs.writeFileSync(file, JSON.stringify(timeline, null, 2));
console.log(`✓ ${path.relative(ROOT, file)}`);
try {
  execFileSync("python3", [path.join(ROOT, "tools/video-director/check_timeline.py"), file], { stdio: "inherit" });
} catch {
  process.exitCode = 1;
}
