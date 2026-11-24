/**
 * "Cum se face o animație 3D din cod – în 5 pași" — a 66 s vertical film.
 *
 * ONE source of truth: picture (src/films/HowItsMade.tsx), sound
 * (scripts/film/sound.ts) and QA (scripts/film/timeline.ts → timeline.json)
 * all read this file. Everything is placed on a music grid, so cuts, reveals
 * and hits land on beats.
 *
 * Grid: 112.5 BPM at 30 fps ⇒ one beat = exactly 16 frames, one bar = 64.
 */
import { PALETTES, type Palette } from "../brief.ts";

export const FPS = 30;
export const BPM = 112.5;
export const BEAT = 60 / BPM; // 0.5333 s
export const BAR = BEAT * 4; // 2.1333 s
/** Time of bar `b` (fractional bars allowed: 2.5 = beat 3 of bar 2). */
export const bar = (b: number) => b * BAR;

export const BARS = 31;
export const DUR = bar(BARS); // 66.13 s
export const FRAMES = Math.round(DUR * FPS); // 1984

export const palette: Palette = PALETTES[0];

export type Look = "final" | "wire" | "grey" | "toon" | "lit" | "glass";
export type MontageStyle = "clay" | "grid" | "glass";

export type Section = {
  id: string;
  from: number;
  to: number;
  chip?: string; // chapter chip, e.g. "1/5 · FORMA"
  step?: number; // 1..5 – drives the progress dots
};

const S = (id: string, b0: number, b1: number, chip?: string, step?: number): Section => ({
  id,
  from: bar(b0),
  to: bar(b1),
  chip,
  step,
});

export const SECTIONS: Section[] = [
  S("hook", 0, 3),
  S("forma", 3, 8, "FORMA", 1),
  S("material", 8, 13, "MATERIAL", 2),
  S("lumina", 13, 18, "LUMINA", 3),
  S("sticla", 18, 23, "STICLĂ", 4),
  S("miscarea", 23, 28, "MIȘCARE", 5),
  S("cta", 28, 31),
];

/** Hero moment: the knot turns to glass, after a one-beat silence. */
export const HERO = bar(19.5);

/**
 * Look changes on the knot. `wipe` = diagonal reveal duration in seconds
 * (0 = hard cut). The camera never jumps on a wipe, so it reads as the
 * material changing on the same object.
 */
export const LOOKS: { at: number; look: Look; wipe: number; why: string }[] = [
  { at: 0, look: "final", wipe: 0, why: "open on the payoff" },
  { at: bar(3), look: "wire", wipe: 0, why: "time cut: rewind to the first state" },
  { at: bar(8), look: "grey", wipe: BEAT, why: "next step: surface gets a material" },
  { at: bar(10.5), look: "toon", wipe: BEAT, why: "same shape, new shading" },
  { at: bar(13), look: "lit", wipe: BEAT, why: "next step: lighting" },
  { at: HERO, look: "glass", wipe: BEAT / 2, why: "hero: chrome becomes glass" },
  { at: bar(28), look: "final", wipe: 0, why: "callback to the opening frame (loop)" },
];

/** Montage (acceleration): hard cuts on the grid, intervals halve. */
export const MONTAGE: { from: number; to: number; style: MontageStyle }[] = [
  { from: bar(23), to: bar(24.5), style: "clay" },
  { from: bar(24.5), to: bar(25.5), style: "grid" },
  { from: bar(25.5), to: bar(26), style: "glass" },
  { from: bar(26), to: bar(26.5), style: "clay" },
  { from: bar(26.5), to: bar(26.75), style: "grid" },
  { from: bar(26.75), to: bar(27), style: "glass" },
  { from: bar(27), to: bar(28), style: "grid" },
];

/** Panels light up one per beat in the lighting chapter. */
export const PANELS_AT = [0, 1, 2, 3, 4].map((k) => bar(13.5) + k * BEAT);

export type Text = {
  id: string;
  text: string; // *word* = accent
  from: number; // appears
  to: number; // starts leaving
  size: number;
  role?: "hook" | "cta" | "term";
};

const T = (id: string, text: string, b0: number, b1: number, size = 84, role?: Text["role"]): Text => ({
  id,
  text,
  from: bar(b0),
  to: bar(b1),
  size,
  role,
});

// Spans come from the read-time rule: legible hold ≥ max(1.5 s, 1 s + 0.3 s × words),
// counted after the last word has landed and before the exit starts.
export const TEXTS: Text[] = [
  T("hook", "Animația asta e *100% cod*", 0, 1.35, 104, "hook"),
  T("promise", "Uite cum: *5 pași*", 1.35, 2.95, 92),
  T("f1", "Începe cu o *formă*", 3.2, 4.75),
  T("f2", "Un *nod toric* (2,3)", 4.85, 6.4),
  T("f3", "*120 × 16* segmente", 6.45, 7.97),
  T("m1", "Plastic gri. *Plictisitor.*", 8.25, 9.7),
  T("m2", "Desen animat: *3 tonuri*", 10.75, 12.35),
  T("l1", "*5* panouri de lumină", 13.4, 14.95),
  T("l2", "Metalul reflectă *tot*", 15.0, 16.4),
  T("rehook", "Pasul *4* schimbă tot", 16.45, 18),
  T("s1", "Devine *sticlă*", 18.1, 19.5),
  T("s2", "Lumina trece *prin* obiect", 19.9, 21.45),
  T("s3", "*Dispersie*: culorile se despart", 21.48, 23),
  T("v1", "Pornește de la *un unghi*", 23.2, 24.95),
  T("v2", "*Zero* tăieturi în buclă", 25.0, 26.6),
  // DECISION: social CTA only at the end (platform convention for comment prompts);
  // a comment ask in the first 3 s would compete with the hook. Not role "cta" for that reason.
  T("cta1", "Ce să animez *mâine*?", 28.05, 29.6, 92),
  T("cta2", "Scrie în *comentarii*", 29.62, 31, 92),
];

/**
 * Camera keys for the knot, in spherical coordinates around the target.
 * Between keys: ease-in-out. `cut: true` = jump (only where the picture cuts).
 */
export type CamKey = { t: number; az: number; el: number; dist: number; fov: number; cut?: boolean; why: string };
export const CAMERA: CamKey[] = [
  { t: 0, az: 0, el: 2, dist: 10.5, fov: 34, why: "establish" },
  { t: bar(3), az: 22, el: 6, dist: 10.5, fov: 34, why: "slow orbit under the hook" },
  { t: bar(8), az: 12, el: 4, dist: 8.8, fov: 34, why: "push in on the wireframe" },
  { t: bar(13), az: -12, el: 26, dist: 9.4, fov: 34, why: "crane up over the material change" },
  { t: bar(18), az: -95, el: 10, dist: 10, fov: 34, why: "orbit to show the panels' reflections" },
  { t: HERO, az: -105, el: 8, dist: 8.6, fov: 34, why: "anticipation push before the hero" },
  { t: bar(23), az: -70, el: 4, dist: 9.4, fov: 36, why: "release after the hero" },
  { t: bar(28), az: -24, el: 2, dist: 10.5, fov: 34, cut: true, why: "cut back for the CTA" },
  { t: DUR, az: 0, el: 2, dist: 10.5, fov: 34, why: "land on frame 0 for a clean loop" },
];

/** Silences (picture holds, sound drops) – one before the hero, one before the CTA. */
export const SILENCES = [
  { from: HERO - BEAT, to: HERO },
  { from: bar(28) - BEAT, to: bar(28) },
];

export const TERMS = ["nod toric", "dispersie"];
