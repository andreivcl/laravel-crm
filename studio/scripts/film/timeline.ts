/**
 * Exports the film spec as a video-director timeline.json (the schema the
 * vendored QA tools read), then validates it:
 *   node scripts/film/timeline.ts            → out/films/how-its-made/timeline.json
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  BARS,
  BPM,
  CAMERA,
  DUR,
  FPS,
  HERO,
  LOOKS,
  MONTAGE,
  SECTIONS,
  SILENCES,
  TERMS,
  TEXTS,
} from "../../src/films/howItsMade.ts";
import { ROOT } from "../lib.ts";

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const words = (s: string) => s.replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
/** KineticLine: 2-frame word stagger, 14-frame entrance, 9-frame exit. */
const arrived = (id: string, text: string) => (id === "hook" ? 0 : (2 + (words(text) - 1) * 2 + 14) / FPS);
const EXIT = 9 / FPS;

const hardCuts = [LOOKS.find((l) => l.why.startsWith("time cut"))!.at, ...MONTAGE.map((m) => m.from), MONTAGE.at(-1)!.to];

const timeline = {
  meta: {
    w: 1080,
    h: 1920,
    fps: FPS,
    dur: r3(DUR),
    clock: "music",
    register: "kinetic",
    loop: true,
    bpm: BPM,
    meter: "4/4",
    bars: BARS,
    t0: 0,
    grid: "designed",
  },
  objects: [{ id: "knot", role: "constant", what: "(2,3) torus knot, the film's one shape" }],
  scenes: SECTIONS.map((s) => {
    const looksIn = LOOKS.filter((l) => l.at >= s.from && l.at < s.to);
    const next = LOOKS.find((l) => l.at >= s.to - 1e-6 && l.at < s.to + 1e-6);
    const montageIn = MONTAGE.find((m) => Math.abs(m.from - s.to) < 1e-6);
    return {
      id: s.id,
      start: r3(s.from),
      end: r3(s.to),
      beats: Object.fromEntries([
        ["start", r3(s.from)],
        ...looksIn.map((l) => [`look_${l.look}`, r3(l.at)]),
        ...(HERO >= s.from && HERO < s.to ? [["hero", r3(HERO)]] : []),
      ]),
      reads: TEXTS.filter((x) => x.from >= s.from && x.from < s.to).map((x) => ({
        what: x.text.replace(/\*/g, ""),
        from: r3(x.from + arrived(x.id, x.text)),
        to: r3(x.to - EXIT),
      })),
      transitionOut: next
        ? { type: next.wipe ? "wipe" : "cut", dur: r3(next.wipe), why: next.why, bridge: "knot" }
        : montageIn
          ? { type: "cut", dur: 0, why: "next step: show the motion system on other scenes" }
          : s.id === "miscarea"
            ? { type: "cut", dur: 0, why: "callback to the opening frame for the CTA" }
            : s.id === "cta"
              ? undefined
              : { type: "continuous", dur: 0, why: "same shot continues; only the chapter chip changes" },
    };
  }),
  cuts: hardCuts.map(r3),
  hero: { t: r3(HERO), what: "chrome knot becomes dispersive glass; satellites land" },
  silences: SILENCES.map((s) => ({ from: r3(s.from), to: r3(s.to) })),
  texts: TEXTS.map((x) => ({
    id: x.id,
    text: x.text.replace(/\*/g, ""),
    from: r3(x.from + arrived(x.id, x.text)),
    to: r3(x.to - EXIT),
    role: x.role ?? null,
    px: x.size,
  })),
  terms: TERMS,
  camera: CAMERA.map((c) => ({ t: r3(c.t), zoom: r3(10.5 / c.dist), x: c.az, y: c.el, why: c.why })),
};

const dir = path.join(ROOT, "out/films/how-its-made");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "timeline.json");
fs.writeFileSync(file, JSON.stringify(timeline, null, 2));
console.log(`✓ ${path.relative(ROOT, file)}`);
try {
  execFileSync("python3", [path.join(ROOT, "tools/video-director/check_timeline.py"), file], { stdio: "inherit" });
} catch {
  process.exitCode = 1;
}
