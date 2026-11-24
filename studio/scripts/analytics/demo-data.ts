/**
 * Generates SYNTHETIC analytics so you can see the dashboard and the learning
 * loop before real data exists. Everything it writes is flagged `demo: true`.
 *   node scripts/analytics/demo-data.ts [--days=30]
 * Remove with: npm run analytics:reset
 */
import { PALETTES, STYLES } from "../../src/brief.ts";
import { rng } from "../../src/lib/loop.ts";
import { appendSnapshots, arg, P, PLATFORMS, readJson, writeJson, type RegistryEntry, type Snapshot } from "../lib.ts";

const days = Number(arg("days", "30"));
const r = rng(42);
const pillars = ["satisfying", "howto", "myth", "challenge"];
const hooks = ["curiosity", "number", "contrarian", "challenge", "pov"];
// hidden "truth" the learner should rediscover
const effect: Record<string, number> = { clay: 0.5, glass: 0.15, grid: -0.25, number: 0.35, challenge: 0.3, pov: -0.3, howto: 0.25, myth: -0.15 };
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const now = Date.now();

const registry = readJson<RegistryEntry[]>(P.registry, []).filter((e) => !e.postId.startsWith("demo-"));
const snaps: Snapshot[] = [];
for (let d = days; d >= 1; d--) {
  const date = new Date(now - d * 864e5).toISOString().slice(0, 10);
  const postId = `demo-${date}`;
  const features = {
    style: pick(STYLES),
    palette: pick(PALETTES).name,
    pillar: pick(pillars),
    hookType: pick(hooks),
    beats: String(2 + Math.floor(r() * 3)),
    length: pick(["<10s", "10-14s", "14s+"]),
    weekday: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
  };
  const quality = Object.values(features).reduce((a, v) => a + (effect[v] ?? 0), 0) + (r() - 0.5) * 0.8;
  registry.push({
    postId,
    publishedAt: Object.fromEntries(PLATFORMS.map((p) => [p, `${date}T17:00:00Z`])),
    ids: Object.fromEntries(PLATFORMS.map((p) => [p, `${p}-${date}`])),
    features,
    durationSec: 11,
  });
  for (const platform of PLATFORMS) {
    const base = { tiktok: 2400, instagram: 1500, youtube: 900 }[platform];
    const views = Math.round(base * Math.exp(quality * 1.1 + (r() - 0.5) * 0.6) * (1 + (days - d) / days));
    const er = 0.05 * Math.exp(quality * 0.5);
    snaps.push({
      postId,
      platform,
      platformId: `${platform}-${date}`,
      fetchedAt: new Date(now).toISOString(),
      ageHours: d * 24,
      views,
      likes: Math.round(views * er * 0.7),
      comments: Math.round(views * er * 0.06),
      shares: Math.round(views * er * 0.08),
      saves: platform === "instagram" ? Math.round(views * er * 0.1) : 0,
      avgWatchRatio: platform === "tiktok" ? undefined : Math.min(1.4, 0.55 + quality * 0.15 + r() * 0.1),
      skipRate: platform === "instagram" ? Math.max(0.05, 0.4 - quality * 0.1) : undefined,
      demo: true,
    });
  }
}
writeJson(P.registry, registry);
appendSnapshots(snaps);
console.log(`✓ wrote ${days} demo posts × 3 platforms (flagged demo:true)`);
