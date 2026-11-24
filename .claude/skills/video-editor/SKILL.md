---
name: video-editor
description: Make or edit vertical short-form videos (TikTok, Instagram Reels, YouTube Shorts) in this repo, from 10 s loops to 60–90 s films. Covers 3D animation in code (Remotion + Three.js in studio/), editing real footage (jump cuts, punch-ins, captions, loudness), retention structure for 60 s+ videos, sound design, and automated QA. Use when the user asks to make, edit, improve or check a video, a reel, a short or an animation, or asks how to film or edit better.
---

# Video editor (studio/)

You are the director and the editor. You can't watch or listen, so **plan in
numbers, then measure the render**. Never report what you didn't measure or see.

## What's here

| Path | What it is |
|---|---|
| `studio/src/films/howItsMade.ts` | Reference 66 s film spec: sections, looks, camera keys, texts, silences on a 112.5 BPM grid (1 beat = 16 frames at 30 fps). Copy it for new films. |
| `studio/src/films/HowItsMade.tsx`, `KnotStage.tsx` | Picture for that spec: one 3D object through 5 build steps, diagonal wipes, chapter chip with progress dots, montage that accelerates, loop-back ending. |
| `studio/src/scenes/*` | 3D looks: `GlassScene` (dispersive glass), `ClayScene` (toon + halftone + ink outline), `GridScene` (kinetic pillars), shared lighting/backdrop. |
| `studio/src/overlay/*` | Kinetic type (`*word*` = accent), grain/vignette finish. |
| `studio/src/DailyShort.tsx` + `scripts/daily.ts` | 10–15 s daily loops + the analytics learning loop (see `studio/README.md`). |
| `studio/scripts/film/sound.ts` | Deterministic score + SFX from the film spec, mastered to −14 LUFS. |
| `studio/scripts/film/timeline.ts` | Exports the spec as `timeline.json` and runs the plan checker. |
| `studio/scripts/edit/autocut.ts` | Edits real footage: silence-based jump cuts, alternating punch-ins, 9:16 reframe, loudness. |
| `studio/tools/video-director/` | Vendored QA (MIT, win4r/video-director): `check_timeline.py`, `qa_video.py`. |

Rendering here has no GPU: `export REMOTION_GL=swangle` and, if remotion.media is
unreachable, `export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.
Glass (transmission) costs ~1.5 s/frame at 1080×1920 on 4 CPUs: a 66 s master
takes ~45–60 min, so draft at `--scale=0.5` first.

## Workflow for a new film (60 s+)

1. **Treatment** (write it down before code): one-sentence idea · hook for 0–3 s
   readable muted · structure from `references/retention.md` · beat sheet in
   bars · sound plan · facts list (every number on screen must be true of
   what's shown).
2. **Spec**: copy `howItsMade.ts`; put every beat, text, look change, camera key
   and silence on the grid. Text spans follow the read rule (below).
3. **Check the plan**: `node scripts/film/timeline.ts` → must print
   `0 error(s)`. Fix warnings or write a `DECISION:` comment explaining why not.
4. **Look proof**: `npx remotion still <Comp> out/x.png --frame=N --scale=0.5`
   for the 6–8 most different moments; view them; fix before rendering motion.
5. **Sound**: `node scripts/film/sound.ts` (or the user's licensed track /
   VO). Report the measured LUFS/peak.
6. **Draft**: `npx remotion render <Comp> out/draft.mp4 --scale=0.5 --crf=23`.
7. **QA**: `python3 tools/video-director/qa_video.py out/draft.mp4 --out out/qa --beats out/films/<film>/timeline.json [--loop]`
   then *look at* `out/qa/hook_sheet.jpg`, `phone_sheet.jpg`, `beats_sheet.jpg`
   and read `report.md`. Fix the worst three issues, one per pass.
8. **Master** in the background (`--crf=18`), re-run QA on it, deliver with an
   honest report: what was measured, what was seen in stills, what wasn't checked.

## House rules (numbers are defaults; deviate on purpose and say why)

- **Hook** legible on frame 0 and decided by 1.5–3 s; ≥ 84 px at 1080 wide.
  Open with the payoff, not toward it.
- **Read time**: hold ≥ max(1.5 s, 1 s + 0.3 s × words) *after* the last word
  lands. Max ~6 words per line; one accent word per line.
- **Pace**: new information every 2–4 s; nothing dead > 1 s; one acceleration
  (halve intervals, never < 3 frames); at least one held breath.
- **60 s+ structure**: open loop in the first 5 s ("5 steps"), visible progress,
  a rehook every 10–15 s, a pattern interrupt near 25–35 s, hero moment at
  60–90 %, no verbal sign-off, ending that loops into frame 0.
- **Camera**: ~4 different motivated moves per 30–60 s, never the same move on
  adjacent shots, settle before a reveal.
- **Transitions**: each seam has a reason you can say; 0.45–0.6 s; no three
  decorative ones of the same kind in a row.
- **Safe area 9:16**: essentials in x 60–1020, y 250–1500; nothing important in
  the bottom ~480 px or right ~140 px (platform UI).
- **Sound**: accent, don't narrate; ~half the cuts silent; one riser + one main
  impact; a real silence (≥ 0.4 s, ≥ 15 dB down) before the payoff; loudest
  moment = payoff; master −14 LUFS integrated, ≤ −1 dBTP (two-pass loudnorm,
  verify with ebur128). Trending sounds are added natively in the app.
- **Honesty**: numbers on screen must describe what is shown (e.g. the wireframe
  really is 120 × 16 segments). No invented quotes, stats or endorsements.
- **Determinism**: everything from `useCurrentFrame()`; seeded randomness; no
  `useFrame()` from R3F, no CSS transitions.

## Narrated story shorts ("In this world, …")

The format the user wants to grow with. Reference measured (2:09 TikTok): 65 cuts,
median shot 1.7 s, one word of caption at a time, first-person narrator, blocky 3D
cast in neon-lit sets, a mystery mid-way, a countdown, and a **comment poll that
decides part 2**. Build it like `studio/src/films/numbers/`:

1. **Script**: `src/films/<film>/script.json`, a list of lines. Write in English,
   in the first person, 70–130 s. The hook states the world's rule in line 1.
   Plant one mystery and pay it off with a twist, then end on a binary choice:
   "Comment X or Y. Most votes is part 2."
2. **Voice (free, offline)**: `python3 scripts/voice/vo.py src/films/<film>/script.json public/audio/<film>-vo.wav`.
   It runs Kokoro (Apache-2.0); the user picked voice `am_michael`. Models are
   in `~/.cache/kokoro` (download `kokoro-v1.0.onnx` + `voices-v1.0.bin` from
   github.com/thewh1teagle/kokoro-onnx releases). The script writes
   `script.vo.json` with line-exact times and word times accurate to ~±80 ms.
3. **Timeline**: anchor *every* shot and event to a word with `at(lineId, "word")`.
   Never use a bare second. Aim for a new shot every 1.5–2 s.
4. **Captions**: one word at a time, lime `#e8ff3a`, 14 px black stroke, popping
   in from 1.18× scale. Numbers stay digits (the narration says them in words).
5. **Sound**: `scripts/film/numbers-sound.ts` is the template. Bed (music + SFX)
   from `scripts/film/synth.ts`, ducked under the voice with ffmpeg
   `sidechaincompress`, then two-pass master to −14 LUFS / −2 dBTP.
6. **Finish**: render, then run `scripts/film/finish.sh raw.mp4 master.mp4` for
   lens bloom + grade.
   - WebGL post-processing (`@react-three/postprocessing`) renders **black** in
     Remotion's frame-by-frame renderer: don't use it.
   - Blend in RGB (`format=gbrp`), or the screen blend shifts colours to magenta.

**Portrait framing math**: at `fov` 38° (vertical) the horizontal half-angle is
only ~10.9°. A subject is in frame only within ±0.19 × camera distance of the
target, so two characters 2.8 m apart need ≥ 8–9 m of distance. Fast actions
(a body flying sideways) need the camera target to *travel with the action*.
Number tags sit ~2.4 m above the feet: aim the target at y ≈ 2.3–2.6 m in tag
close-ups and keep ≥ 3 m distance, or the tag leaves the frame.

**Original IP only**: blocky cast, yes; Roblox or Minecraft characters, names,
textures or logos, no.

## Editing real footage

`node scripts/edit/autocut.ts in.mp4 out.mp4 [--reframe=crop|blur] [--min-silence=0.45] [--punch=1.08]`
removes silences as jump cuts, alternates 100 %/108 % punch-ins on every cut so
cuts read as intentional, reframes 16:9 → 9:16, and masters audio to −14 LUFS.
For captions, transcribe with faster-whisper (word timestamps) and render them
with the kinetic type overlay; see `references/footage.md`.

## References (read the one you need)

- `references/retention.md`: structures and devices for 30–90 s videos, platform rules.
- `references/craft.md`: easing, springs, staggers, type scale, camera, transitions.
- `references/sound.md`: clock, SFX vocabulary and placement, silence, mix, loudness.
- `references/3d-methods.md`: every way to make 3D (code, DCC, AI 3D, AI video) and how to bring it into this pipeline.
- `references/footage.md`: filming (light, camera, audio) and editing live footage.
