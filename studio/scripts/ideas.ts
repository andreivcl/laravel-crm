/**
 * Generates fresh post ideas with Claude, using the niche config, the trend
 * notes and what analytics says is working:
 *   ANTHROPIC_API_KEY=... node scripts/ideas.ts [--count=10]
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import fs from "node:fs";
import { z } from "zod";
import { STYLES } from "../src/brief.ts";
import type { FeatureStat } from "./learn.ts";
import { arg, P, readJson, today, writeJson, type Config, type Idea } from "./lib.ts";

const count = Number(arg("count", "10"));
const config = readJson<Config | null>(P.config, null);
if (!config) throw new Error("content/config.json missing");
const ideas = readJson<Idea[]>(P.ideas, []);
const trends = fs.existsSync(P.trends) ? fs.readFileSync(P.trends, "utf8") : "";
const insights = readJson<{ features: FeatureStat[]; top: unknown[]; bottom: unknown[] }>(P.insights, {
  features: [],
  top: [],
  bottom: [],
});

const IdeaSchema = z.object({
  pillar: z.enum(config.pillars.map((p) => p.id) as [string, ...string[]]),
  hookType: z.enum(config.hookTypes.map((h) => h.id) as [string, ...string[]]),
  style: z.enum(STYLES).nullable(),
  hook: z.string(),
  beats: z.array(z.string()),
  cta: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
});
const Output = z.object({ ideas: z.array(IdeaSchema) });

const system = `You write short-form video concepts (TikTok, Instagram Reels, YouTube Shorts) for a daily 3D-animation series.
Each video is a 9–15 second seamless 3D loop with kinetic text on top: a hook, 2–4 short beats, and a CTA.
Write in the series language (${config.language}). Use correct diacritics.

Hard constraints for the on-screen text:
- hook: max 6 words, readable in under 1.5 s. It must make sense on the very first frame.
- beats: 2–4 lines, max 6 words each. Each beat must add something new; no filler.
- cta: max 6 words. Prefer CTAs that create comments, saves or shares over "follow".
- Emphasise exactly one key word or number per line by wrapping it in *asterisks*.
- caption: 1–2 sentences, conversational, no hashtags inside it.
- hashtags: 1–3 niche-specific hashtags with #; the base hashtags are added automatically.
- style: set it only if the text refers to a specific visual (glass = iridescent glass knot + chrome spheres; clay = toon/halftone ink-outlined blob; grid = field of 121 pillars with a chrome ball riding two waves). Otherwise null, and the planner picks the style.
Never claim false facts, never imitate a specific creator or brand, no engagement bait that misleads.`;

const user = `Niche: ${config.niche}
Audience: ${config.audience}

Pillars:
${config.pillars.map((p) => `- ${p.id}: ${p.name} – ${p.description}`).join("\n")}

Hook types:
${config.hookTypes.map((h) => `- ${h.id}: ${h.description}`).join("\n")}

Trend notes:
${trends}

What our analytics says (posterior mean score in σ, n = posts; positive = above average):
${insights.features
  .filter((f) => ["pillar", "hookType", "length", "beats"].includes(f.feature))
  .map((f) => `- ${f.feature}=${f.value}: ${f.mean >= 0 ? "+" : ""}${f.mean.toFixed(2)} (n=${f.n})`)
  .join("\n") || "- no data yet: spread ideas evenly across pillars and hook types"}

Best recent posts: ${JSON.stringify(insights.top).slice(0, 1500)}
Worst recent posts: ${JSON.stringify(insights.bottom).slice(0, 1500)}

Ideas already used or queued (do not repeat these angles):
${ideas.map((i) => `- ${i.hook.replace(/\*/g, "")}`).join("\n")}

Write ${count} new, distinct ideas. Lean ~70% into what analytics favours and ~30% into untested combinations.`;

const client = new Anthropic();
// Server-side fallback: if the request is ever declined, the API retries it
// on a fallback model inside the same call.
const response = await client.beta.messages.parse({
  model: "claude-opus-5-5",
  max_tokens: 16000,
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
  output_config: { effort: "medium", format: betaZodOutputFormat(Output) },
  system,
  messages: [{ role: "user", content: user }],
});

if (response.stop_reason === "refusal" || !response.parsed_output) {
  throw new Error(`No ideas returned (stop_reason=${response.stop_reason})`);
}

const stamp = today().replace(/-/g, "");
const fresh: Idea[] = response.parsed_output.ideas.map((i, k) => ({
  id: `ai-${stamp}-${String(k + 1).padStart(2, "0")}`,
  ...i,
  beats: i.beats.slice(0, 4),
}));
writeJson(P.ideas, [...ideas, ...fresh]);
console.log(`✓ added ${fresh.length} ideas to content/ideas.json`);
for (const i of fresh) console.log(`  [${i.pillar}/${i.hookType}] ${i.hook}`);
