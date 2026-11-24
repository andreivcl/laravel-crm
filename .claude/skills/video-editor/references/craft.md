# Craft numbers

Condensed from win4r/video-director (MIT, `references/craft.md`), adapted to this
repo. Every value assumes a 1080 px short side. These are defaults: deviate on
purpose.

## Registers
| | Clean / premium | Handmade | Editorial | Kinetic (our default) |
|---|---|---|---|---|
| fps | 60 + subframe blur | 24 on twos | 30 | 30 |
| Spring damping ζ | 0.72–1.0 | 0.4–0.7 | 0.85–1.0 | 0.75–1.0, snaps on the beat |
| Texture | none | grain, boil | light grain | flat/high contrast |
| Density | one thing moves at a time | secondary action | long holds | a cut every 1–4 beats, holds on reads |

## Reading and holds
- **On-screen line**: hold ≥ max(1.5 s, 1 s + 0.3 s × words), counted from the
  moment the last word has landed.
- **Title or chapter card**: 2.5–4 s.
- **Final message**: ≥ 2 s; a wordmark holds ≥ 1 s completely still.
- **Subtitles**: ≤ 3.5 words/s, ≥ 1.8 s per cue, no 1–3 frame gaps between cues.
- **Pacing feedback always points the same way: slower.** When unsure, hold
  longer.

## Easing by role
| Role | Curve | Duration |
|---|---|---|
| Entrance | cubic-bezier(0.16, 1, 0.3, 1) | words 0.5–0.8 s, small UI 0.25–0.4 s |
| Exit | cubic-bezier(0.6, 0, 0.9, 0.35) | 40–60 % of the entrance |
| State change | cubic-bezier(0.65, 0, 0.35, 1) | 0.6–1.1 s |
| Landing value | cubic-bezier(0.55, 0, 0.2, 1.12) or a spring | |
| Drift, rotation | linear | |

Entrance details:
- An entrance needs opacity **plus** 10–28 px of travel or a 0.86–0.99 scale.
  Opacity alone looks like a template.
- Staggers: words 0.05–0.09 s; list items 0.05–0.06 s (0.10–0.15 s if they
  should be counted).

## Motion principles
- **Anticipation**: 30–50 px at delivery size. 4 px is invisible.
- **Offsets**: children lag parents by 2–4 frames. Offset phases and seeds so
  copies never move in sync.
- **Springs**: use the closed form, one spring per target change, summed, so the
  value stays a pure function of t.
- **Limits**:
  - a crash zoom longer than 10 frames reads as an ordinary push;
  - shake over ~20 px reads as a glitch;
  - a flash of 4+ frames is *seen* rather than felt.

## Staging and type
- **Focus**: one focal point per frame; the subject fills ≥ ⅓ of the frame
  height at key moments.
- **Type scale**: mega 260, display 180, h1 120, h2 84, h3 60, body 40. Labels
  below 24 px are texture, not text.
- **Families**: at most three, by role. Our pair is Inter Tight 800 with
  Instrument Serif italic for the accent word.
- **Colour**:
  - one neutral ground, one accent with a written meaning, at most one tint;
  - the ground is a tinted dark, never #000;
  - text contrast ≥ 4.5:1, and 7:1 for the hook.

## Camera
- **Variety**: about 4 different motivated moves in 30–60 s plus one signature
  shot. Never the same move on adjacent shots. Never zoom in and straight back
  out.
- **Settle**: hold still through a reveal.
- **Cut seams**: cut at peak velocity; the next shot enters already moving in
  the same direction.
- **Accents**: beat punches of 1–3 % scale with exponential decay; shake of
  3–18 px decaying as e^(−14·Δt).

## Transitions (one per seam, each with a sayable reason)
| Transition | Use when |
|---|---|
| Next step | the process continues |
| Match on position | two subjects share a shape |
| Shape morph (~1.2 s) | one thing becomes another |
| Scale-through | zoom into the element that becomes the next scene |
| Push + flash (≤ 3 frames per side) | a hard, energetic change |
| Whip pan | a move with a long braking tail |
| Time cut | same frame, changed by time |
| Callback | return to an earlier image, changed |

Rules:
- 0.45–0.6 s each.
- At most 3 morphs under 30 s.
- Never a flash and a transition on the same seam.
- No blank frames.

## Engineering
- **Determinism**: time is the only input. Seeded PRNG; simulations precomputed.
- **Motion blur**: render N subframes at a 180° shutter and blend them. Never
  blur text or across hard cuts.
- **Grain**: re-seed at ~12 Hz, not every frame (our `Finish` cycles 12 states),
  or add it in ffmpeg.
- **Encode**: H.264 yuv420p, CRF 14–19 for masters and 23–28 for drafts,
  AAC 256k.
