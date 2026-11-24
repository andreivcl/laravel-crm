# Filming and editing real footage

## Light (the cheapest quality upgrade)
- **Key light**: one soft source 30–45° off the camera axis, slightly above eye
  level, as large and close as possible (softbox, diffused panel, or a window).
- **Fill**: a bounce card, reflector or wall on the opposite side. Light the
  background separately (a practical lamp, an RGB tube) so the subject separates
  from it.
- **Colour**: keep every source at one colour temperature (e.g. all 5600 K),
  because mixed warm and cool casts look wrong on skin. Lock white balance in
  the camera app.
- **Flicker**: match the shutter to the mains frequency. In 50 Hz Europe
  (Romania) that is 1/50 or 1/100 at 25 fps, and 1/100 at 50 fps.

## Camera
- **Format**: shoot 4K vertical; 30 fps (or 25 in 50 Hz countries) for talking,
  60 fps (50) for B-roll you may slow down.
- **Shutter**: about twice the frame rate (180° rule: 1/50 at 25 fps, 1/60 at
  30 fps) for natural motion blur. Use an ND filter outdoors.
- **Lock**: exposure, focus and white balance, so nothing pumps mid-shot.
- **Framing**: medium close-up (chest up) for talking heads, eyes at about ⅓
  from the top. Keep essentials out of the bottom 20 %. Vertical frames need
  depth, so use foreground objects and push *into* the frame rather than
  sliding sideways.
- **Movement**: slow push-ins on the important line; a tilt up or down beats a
  shaky pan; a gimbal or a phone held against the body works for walking shots.
- **B-roll list per video**: hands doing the thing, a close detail, a wide of
  the place, a reaction, the result. Get 3–5 s of each, plus one "impossible"
  insert (3D or AI) if the story needs it.

## Audio
- A lav or shotgun mic close to the mouth beats any camera mic.
- Record 20–30 s of room tone to fill gaps between cuts.
- Peaks around −12 dBFS when recording; master to −14 LUFS when delivering.

## Editing playbook
- **Cut the air**: remove silences and breaths (jump cuts). Alternate 100 % and
  108–112 % punch-ins on each cut, so a jump reads as intentional and adds
  energy.
- **J/L cuts**: start the next shot's audio early, or let a shot's audio
  linger, to smooth the story.
- **Speed ramps / velocity edits**: slow-mo into a single action, then snap
  back on the beat. Use one per idea; a ramp is not a substitute for a clear
  subject.
- **Match cuts**: link two shots through a shared shape, position, gesture or
  movement. It is the cleanest transition there is.
- **Captions**: word-level, 1 line, ≤ 3.5 words/s, one accent word, never over
  the face. Burn them in with our kinetic type.
- **B-roll on every claim**: show what you say within 1 s of saying it.
- **Sound**: whoosh on moves, impact on reveals, about half the cuts silent,
  music ducked under the voice, a silence before the payoff.

## Tools in this repo
- `node scripts/edit/autocut.ts in.mp4 out.mp4 [options]`
  - `--reframe=crop|blur|none`: make 9:16 from 16:9. `blur` puts a blurred copy
    behind it.
  - `--min-silence=0.45 --threshold=-35`: what counts as a gap (seconds, dB).
  - `--pad=0.08`: keep a little air around each phrase.
  - `--punch=1.08`: zoom on every other segment (1 = off).

  It writes `out.mp4` and `out.cuts.json`, so the cut list can drive captions
  and SFX in Remotion.
- **Transcripts with word timings**: `pip install faster-whisper` on a machine
  that can download models, then
  `WhisperModel("small").transcribe(path, word_timestamps=True)`. Remotion's
  `@remotion/install-whisper-cpp` is an alternative.
- **Watching a video** (frames + transcript) to critique an edit: the
  `watch-video` skill.

## Sources
- [Vertical video composition 2026 (DEV)](https://dev.to/cartney/vertical-video-composition-for-drama-the-2026-guide-567l)
- [Shoot like a pro: vertical video (B&H)](https://www.bhphotovideo.com/explora/node/127041)
- [Essential vertical video tips (Canon)](https://www.canon.com.au/get-inspired/essential-vertical-video-shooting-tips-inyourfayes)
- [Three-point lighting for creators (Zhiyun)](https://store.zhiyun-tech.com/blogs/news/three-point-lighting-setup-guide-for-portraits-videos-and-creator-studios)
- [Talking-head lighting setups (Neewer)](https://neewer.com/blogs/blog/best-talking-head-lighting-setups)
- [Lighting for phone-based production (Cursa)](https://cursa.app/en/page/lighting-and-camera-setup-for-phone-based-production)
- [Lighting tips from Marques Brownlee (MasterClass)](https://www.masterclass.com/articles/best-lighting-for-video-recording-tips-from-marques-brownlee)
- [CapCut editing trends 2026](https://www.capcut.com/help/latest-capcut-editing-trends)
- [CapCut transitions 2026](https://www.capcut.com/help/capcut-transitions)
- [50 video editing tips (Opus)](https://www.opus.pro/blog/video-editing-tips)
