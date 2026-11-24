/**
 * Plans the post for a date (default: today):
 *   node scripts/plan.ts [YYYY-MM-DD] [--force]
 *
 * Picks style, palette and idea with Thompson sampling over the learned
 * feature stats (data/insights.json), then writes content/posts/<date>.json.
 */
import fs from "node:fs";
import path from "node:path";
import { briefSchema, PALETTES, STYLES, type Brief } from "../src/brief.ts";
import { rng } from "../src/lib/loop.ts";
import { thompson, type FeatureStat } from "./learn.ts";
import {
  arg,
  dateArg,
  hashSeed,
  P,
  PLATFORMS,
  readJson,
  writeJson,
  type Config,
  type Idea,
  type Platform,
  type PostFile,
} from "./lib.ts";

const date = dateArg();
const file = path.join(P.posts, `${date}.json`);
if (fs.existsSync(file) && !arg("force")) {
  console.log(`✓ ${file} already planned (use --force to re-plan)`);
  process.exit(0);
}

const config = readJson<Config | null>(P.config, null);
if (!config) throw new Error("content/config.json missing");
const ideas = readJson<Idea[]>(P.ideas, []);
const insights = readJson<{ features: FeatureStat[] }>(P.insights, { features: [] });
const stats = insights.features;
const rand = rng(hashSeed(date));

// Previous post (to avoid repeating yesterday's look)
const previous = fs
  .readdirSync(P.posts)
  .filter((f) => f.endsWith(".json") && f < `${date}.json`)
  .sort()
  .at(-1);
const prev = previous ? readJson<PostFile | null>(path.join(P.posts, previous), null) : null;
const number = fs.readdirSync(P.posts).filter((f) => f.endsWith(".json") && f < `${date}.json`).length + 1;

// 1. Idea: sample a pillar and a hook type, take the first unused idea matching both
const unused = ideas.filter((i) => !i.usedOn);
if (unused.length === 0) {
  throw new Error("No unused ideas left – run `npm run ideas` (needs ANTHROPIC_API_KEY) or add some to content/ideas.json");
}
const pillarPick = thompson("pillar", [...new Set(unused.map((i) => i.pillar))], stats, rand, prev?.features.pillar);
const hookPick = thompson("hookType", [...new Set(unused.map((i) => i.hookType))], stats, rand);
const idea =
  unused.find((i) => i.pillar === pillarPick && i.hookType === hookPick) ??
  unused.find((i) => i.pillar === pillarPick) ??
  unused.find((i) => i.hookType === hookPick) ??
  unused[0];

// 2. Style (unless the idea is written for a specific one) & palette
const lockedStyle = STYLES.find((s) => s === idea.style);
const style = lockedStyle ?? (thompson("style", [...STYLES], stats, rand, prev?.features.style) as Brief["style"]);
const paletteName = thompson(
  "palette",
  PALETTES.map((p) => p.name),
  stats,
  rand,
  prev?.features.palette,
);
const palette = PALETTES.find((p) => p.name === paletteName)!;

// 3. Pacing: hook gets more time if it's long; beats ~2.4 s
const words = (s: string) => s.replace(/\*/g, "").split(/\s+/).length;
const brief: Brief = briefSchema.parse({
  id: date,
  series: `${config.series} · #${String(number).padStart(3, "0")}`,
  style,
  palette,
  hook: idea.hook,
  beats: idea.beats.slice(0, 5),
  cta: idea.cta,
  seed: hashSeed(date) % 100000,
  hookSeconds: Math.min(3.2, 1.8 + words(idea.hook) * 0.12),
  beatSeconds: 2.3,
  ctaSeconds: 2.4,
});
const durationSec = brief.hookSeconds + brief.beats.length * brief.beatSeconds + brief.ctaSeconds;

// 4. Captions per platform
const caption = (platform: Platform) => {
  const c = config.platforms[platform];
  const tags = [...new Set([...idea.hashtags, ...c.baseHashtags])].slice(0, c.maxHashtags);
  const title = idea.hook.replace(/\*/g, "");
  if (platform === "youtube") return `${title}\n\n${idea.caption}\n\n${tags.join(" ")}`;
  return `${idea.caption}\n\n${tags.join(" ")}`;
};

const post: PostFile = {
  date,
  brief,
  ideaId: idea.id,
  features: {
    style,
    palette: palette.name,
    pillar: idea.pillar,
    hookType: idea.hookType,
    beats: String(brief.beats.length),
    length: durationSec < 10 ? "<10s" : durationSec < 14 ? "10-14s" : "14s+",
    weekday: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
  },
  captions: Object.fromEntries(PLATFORMS.map((p) => [p, caption(p)])) as Record<Platform, string>,
};

writeJson(file, post);
idea.usedOn = date;
writeJson(P.ideas, ideas);
console.log(`✓ planned ${date}: style=${style} palette=${palette.name} idea=${idea.id} (${durationSec.toFixed(1)}s)`);
console.log(`  hook: ${idea.hook}`);
