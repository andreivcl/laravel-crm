# Retention for 30–90 s vertical videos

Most numbers here come from creator-tool blogs, not platform data. Treat them as
starting points and test them against the account's own retention graphs
(`studio/scripts/analytics`).

## Why 60 s+
- TikTok Creator Rewards pays only for videos **≥ 1 minute** (plus 10k followers,
  100k views in 30 days, 18+, eligible country). Qualified views need ≥ 5 s of
  watch time. Payout weights originality, play duration, engagement and search
  value, not raw views. [postlinkapp, gemlist, makeviral, 2026]
- Instagram exposes `reels_skip_rate` (share of viewers who skip in the first 3 s),
  which is the cleanest hook metric available.
- Longer videos give more watch time per view, but every extra second must earn
  its place. The hook and the first rehook decide the whole curve.

## Skeleton for a 60–70 s video (proportions of the runtime)
| Part | Share | Job |
|---|---|---|
| Hook | 0–5 % (≤ 3 s) | Show the payoff or the strongest image first; state the promise. Readable muted on frame 0. |
| Open loop | 5–10 % | A countable promise ("5 pași", "3 greșeli") plus a visible progress device (chapter chip, dots, counter). |
| Body chapters | 10–60 % | One idea per chapter, a new visual every 2–4 s, a rehook every 10–15 s. |
| Pattern interrupt | ~40–55 % (25–35 s) | The first big drop-off sits here: change look, angle, tempo or colour. |
| Hero / payoff | 60–90 % | Preceded by a real silence; loudest sound; one signature visual trick. |
| Montage / acceleration | after the hero | Intervals halve; shows range or proof. |
| CTA + loop | last 8–10 % | A question that invites comments; the last frame flows into frame 0. No "bye, follow me". |

The reference film `studio/src/films/howItsMade.ts` follows this:
- hook at 0 s, then the "5 pași" open loop;
- 5 chapters with a progress chip;
- rehook at 35 s ("Pasul 4 schimbă tot");
- silence, then the hero at 41.6 s (63 %);
- montage that accelerates;
- comment CTA and a loop-back ending.

## Devices that keep people watching
- **Open loops**: promise something specific and pay it off later ("pasul 4
  schimbă tot"). Add smaller loops every 10–15 s.
- **Visible progress**: chapter chips, step dots, a numbered list. Viewers stay
  to finish the set.
- **Pattern interrupts**: a visual change every 2–4 s keeps attention; a jump
  cut every 2 s causes fatigue. Interrupts can be:
  - a new angle;
  - a punch-in;
  - a colour or ground flip;
  - a speed ramp;
  - a cut to B-roll.
- **Before → after / how it's made**: a transformation gives a built-in arc and
  a payoff.
- **Never let it die**: a 2 s gap where nothing moves and nothing sounds reads
  as "video over".
- **Loop endings**: the final frame matches frame 0, so replays start
  seamlessly. Avoid verbal sign-offs.

## Captions and text
- Always on. ≥ 56 px for main lines, 84 px+ for the hook.
- At most 3.5 words/s. One line per cue. Never over the subject.
- Keep the bottom ~480 px and the right ~140 px clear of platform UI.
- Say *and* show the 1–3 search terms the audience would type, verbatim
  (e.g. "nod toric", "dispersie"). TikTok and YouTube index on-screen text and
  speech.

## Platform notes
- **TikTok**: ≥ 60 s for Creator Rewards. Add trending sounds in the app.
  Unaudited API apps can only post privately.
- **Reels**: watch the skip rate. Shares and saves weigh heavily. Keep the
  cover (frame 0) clean.
- **Shorts**: loops lift "% viewed" above 100 %. Shorts views count from a
  start, so retention is what drives distribution.

## Sources
- [TikTok Creator Rewards eligibility 2026 (PostLink)](https://postlinkapp.com/blog/tiktok-creator-rewards-program)
- [Creator Rewards requirements (Gemlist)](https://www.gemlist.io/blog/tiktok-creator-rewards-requirements)
- [Creator Rewards rules (MakeViral)](https://www.makeviral.ai/blog/tiktok-creator-rewards-program)
- [Vertical video retention playbook 2026 (ClipForge)](https://clip-forge.io/blog/vertical-video-retention-editing-playbook-2026)
- [Short-form retention hooks 2026 (Terra Market Group)](https://www.terramarketgroup.com/blog/short-form-video-retention-hooks-2026-a-data-informed-framework-for-higher-completion-rates)
- [Pacing and cuts for high-retention short video (Komet Media)](https://www.kometmedia.com/tutorials/pacing-and-cuts-for-high-retention-short-video)
- [Optimal short-form length (Bytecap)](https://www.bytecap.io/blog/optimal-short-form-video-length-retention-analysis)
- [Instagram Media Insights (Meta)](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/)
