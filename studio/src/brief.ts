import { z } from "zod";

/**
 * A "brief" is everything needed to render one daily post.
 * The daily pipeline (scripts/plan.ts) writes one of these per day into
 * content/posts/YYYY-MM-DD.json, and the DailyShort composition renders it.
 */
export const STYLES = ["glass", "clay", "grid"] as const;
export type SceneStyle = (typeof STYLES)[number];

export const paletteSchema = z.object({
  name: z.string(),
  bg: z.string(), // deep background
  a: z.string(), // primary accent
  b: z.string(), // secondary accent
  c: z.string(), // highlight
  ink: z.string(), // outlines / dark text accents
  text: z.string(), // main text colour
});
export type Palette = z.infer<typeof paletteSchema>;

export const briefSchema = z.object({
  id: z.string(),
  series: z.string(), // small kicker on top, e.g. "3D DAILY · #014"
  style: z.enum(STYLES),
  palette: paletteSchema,
  /** Hook shown from frame 0. Wrap a word in *asterisks* to emphasise it. */
  hook: z.string(),
  /** 1–5 short lines revealed one after another. *word* emphasis works here too. */
  beats: z.array(z.string()).min(1).max(5),
  cta: z.string(),
  seed: z.number(),
  /** Seconds each beat stays on screen. */
  beatSeconds: z.number().min(1.2).max(5),
  /** Seconds the hook stays on screen. */
  hookSeconds: z.number().min(1).max(4),
  ctaSeconds: z.number().min(1).max(4),
});
export type Brief = z.infer<typeof briefSchema>;

export const FPS = 30;

export const briefTimeline = (brief: Brief, fps = FPS) => {
  const hook = Math.round(brief.hookSeconds * fps);
  const beat = Math.round(brief.beatSeconds * fps);
  const cta = Math.round(brief.ctaSeconds * fps);
  const total = hook + beat * brief.beats.length + cta;
  return { hook, beat, cta, total };
};

export const PALETTES: Palette[] = [
  {
    name: "aurora",
    bg: "#07061a",
    a: "#7b5cff",
    b: "#22d3ee",
    c: "#ff7ad9",
    ink: "#0b0820",
    text: "#f6f3ff",
  },
  {
    name: "sunset-clay",
    bg: "#1a0b12",
    a: "#ff6b4a",
    b: "#ffc15e",
    c: "#ff3d7f",
    ink: "#1d0a10",
    text: "#fff4ea",
  },
  {
    name: "mint-chrome",
    bg: "#04140f",
    a: "#2ee6a6",
    b: "#b8ff5c",
    c: "#5ce1ff",
    ink: "#03130d",
    text: "#effff8",
  },
  {
    name: "ultraviolet",
    bg: "#0c0418",
    a: "#c04bff",
    b: "#4b6bff",
    c: "#ffe45c",
    ink: "#0d0419",
    text: "#fbf6ff",
  },
];

export const defaultBrief: Brief = {
  id: "demo",
  series: "3D DAILY · #001",
  style: "glass",
  palette: PALETTES[0],
  hook: "Asta e animat *100%* din cod",
  beats: [
    "Fără Blender. Fără After Effects.",
    "Doar *React* + Three.js",
    "Randat automat, în fiecare zi",
  ],
  cta: "Urmărește pentru *#002*",
  seed: 7,
  beatSeconds: 2.4,
  hookSeconds: 2.4,
  ctaSeconds: 2.4,
};
