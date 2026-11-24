/**
 * Turns snapshots into insights + a dashboard:
 *   node scripts/analytics/analyze.ts
 * Writes data/insights.json (read by plan.ts and ideas.ts) and out/dashboard.html.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { featureStats, latest, MIN_AGE_HOURS, scorePosts, engagementRate, retention } from "../learn.ts";
import { P, readJson, readSnapshots, writeJson, type RegistryEntry } from "../lib.ts";

const registry = readJson<RegistryEntry[]>(P.registry, []);
const snaps = readSnapshots();
const scores = scorePosts(snaps, registry);
const features = featureStats(scores);
const isDemo = snaps.some((s) => s.demo);

const fmt = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(2)}σ`;
const label = (f: { feature: string; value: string }) => `${f.feature}=${f.value}`;
const confident = features.filter((f) => f.n >= 3);
const recommendations = [
  ...confident
    .filter((f) => f.mean > 0.25)
    .slice(0, 4)
    .map((f) => `Mai mult: ${label(f)} (${fmt(f.mean)}, n=${f.n})`),
  ...confident
    .filter((f) => f.mean < -0.25)
    .slice(-4)
    .reverse()
    .map((f) => `Mai puțin: ${label(f)} (${fmt(f.mean)}, n=${f.n})`),
  ...features.filter((f) => f.n < 3).slice(0, 3).map((f) => `De testat mai mult: ${label(f)} (doar n=${f.n})`),
];

const ranked = [...scores].sort((a, b) => b.score - a.score);
const brief = (p: (typeof scores)[number]) => {
  const planned = readJson<{ brief?: { hook: string } } | null>(path.join(P.posts, `${p.postId}.json`), null);
  return { postId: p.postId, score: Number(p.score.toFixed(2)), hook: planned?.brief?.hook ?? "", ...p.features };
};

const insights = {
  generatedAt: new Date().toISOString(),
  demo: isDemo,
  postsScored: scores.length,
  features,
  recommendations,
  top: ranked.slice(0, 5).map(brief),
  bottom: ranked.slice(-5).reverse().map(brief),
};
writeJson(P.insights, insights);

// ---- dashboard payload
const last = latest(snaps);
const posts = scores.map((s) => ({
  ...brief(s),
  platforms: Object.fromEntries(
    last
      .filter((x) => x.postId === s.postId)
      .map((x) => [
        x.platform,
        { views: x.views, er: engagementRate(x), retention: retention(x), score: s.perPlatform[x.platform]?.score ?? null },
      ]),
  ),
}));
const pending = [...new Set(last.filter((s) => s.ageHours < MIN_AGE_HOURS).map((s) => s.postId))];

const here = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync(path.join(here, "dashboard.html"), "utf8");
const html = template.replace(
  "/*__DATA__*/null",
  JSON.stringify({ insights, posts, pending }).replace(/</g, "\\u003c"),
);
fs.mkdirSync(P.out, { recursive: true });
fs.writeFileSync(path.join(P.out, "dashboard.html"), html);

console.log(`✓ scored ${scores.length} posts${isDemo ? " (DEMO data)" : ""}`);
for (const r of recommendations) console.log(`  • ${r}`);
console.log("  → data/insights.json, out/dashboard.html");
