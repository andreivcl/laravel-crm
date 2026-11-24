# Sound

Sound is half of perceived quality, and you can't hear it. Design it on the
picture's timeline and **measure** the mix. Condensed from win4r/video-director
(MIT, `references/sound.md`) and applied in `studio/scripts/film/sound.ts`.

## Pick a clock
| Clock | For | Coupling |
|---|---|---|
| Music grid | loops, montages, kinetic type | cuts on beats, structural changes on bars, drop on the hero |
| Voice | explainers, narration | reveals on measured words; music ducked 4–10 dB under the voice |
| Reads | silent stories | shot length from read time; idles still lock to a nominal BPM |

Frame-exact grids:
- 112.5 BPM at 30 fps gives 16 frames per beat, the grid used in the
  reference film;
- 120 BPM at 24 fps gives 6-frame eighth notes.

## Voice-over (when there is one)
- **Write for the ear**: ≤ 3.5 words/s, short clauses, say the search term
  verbatim in its own short sentence.
- **Order**: render the VO first, then animate to it.
- **Word timings**: take them from the TTS timestamps (ElevenLabs
  `with-timestamps`) or from faster-whisper `word_timestamps=True`.
- **Sync**: ~200 ms of misalignment already reads as lag. Start each visual beat
  ~0.3 s after its sentence ends.
- **Numbers**: spelled out in the TTS text, digits on screen.
- **Level**: voice ≈ 10 dB above the music by RMS.

## SFX vocabulary and budget
- **Accent, don't narrate**: one action gets one sound; ~half the cuts stay
  silent; never the same cue twice in a row.
- **Film vocabulary, not UI bleeps**:
  - whoosh for a camera move or wipe;
  - impact for a landing;
  - riser for a build;
  - bell or sparkle for light;
  - real foley for materials (glass, paper, switches).
- **Budget**: one riser and one main impact per short. Longer films can carry
  about 5 structural impacts.
- **Repeated hits**: alternate two variants and step the gain down
  (0.40 → 0.25).
- **Placement**: by the measured peak, never by the start of the file.
- **Key and stereo**: tonal SFX stay in the score's key (pentatonic is safe);
  pan follows the on-screen x position, gently (±0.3).

## Silence and the payoff
- **Silences**: at least one real silence (≥ 0.4 s, ≥ 15 dB below the 90th
  percentile and below −30 dBFS) before the payoff, two in a 30–60 s film. End
  each with a hard stop and no reverb tail.
- **First sound after a silence**: make it one of the most important in the
  film.
- **Loudest moment**: the payoff, not the busiest section. In a narrated film it
  is the loudest *non-voice* hit, placed in a pause in the VO.
- **J/L cuts**: let the next scene's sound arrive early, or the last one linger,
  at least twice per 30–60 s.

## Mix and master
- **Levels**: hero SFX 0.25–0.35 on peak-normalised samples; supporting SFX
  0.08–0.2.
- **Low end**: keep 20–120 Hz about 3 dB below the rest.
- **Master**: −14 LUFS integrated, true peak ≤ −1 dBTP. Use two-pass `loudnorm`
  and aim for −1.5 dBTP before AAC.
- **Verify** the delivered MP4 with `ebur128`, not the WAV: `qa_video.py`
  reports loudness, the loudest 100 ms and the silences.
- **Sparse mixes**: they can't reach −14 LUFS without crushing. Add a bed or
  accept a lower level and say so.

## Licensing
- Use only tracks that are licensed or the user's own.
- On TikTok and Reels, add trending audio **inside the app**: that is licensed
  there and usually helps reach. Render a silent or own-score master for that
  case.
- AI music: use the paid tier for commercial rights, and remember pure-AI music
  may not be copyrightable.
