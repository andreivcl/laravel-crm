import type { Features, Platform, RegistryEntry, Snapshot } from "./lib.ts";

/**
 * Scoring + learning.
 *
 * 1. Each post gets a per-platform score: a weighted mix of z-scores for
 *    age-normalised views, weighted engagement rate and retention.
 * 2. Platform scores are averaged into one post score (in σ units, 0 = average).
 * 3. For every feature value (style=clay, hookType=number, …) we keep a
 *    shrunken mean of post scores – a Normal posterior with prior N(0, 1).
 * 4. The planner Thompson-samples from those posteriors, so it exploits what
 *    works while still exploring under-tested options.
 */

export const MIN_AGE_HOURS = 24; // too-young posts don't teach anything yet
const PRIOR_N = 2; // shrinkage strength: a value needs ~2 posts before it moves much

export type PostScore = {
  postId: string;
  score: number;
  perPlatform: Partial<Record<Platform, { score: number; views: number; er: number; retention?: number }>>;
  features: Features;
};

export type FeatureStat = {
  feature: keyof Features;
  value: string;
  n: number;
  mean: number; // posterior mean (σ units)
  sd: number; // posterior sd
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) || 1;
};

/** Latest snapshot per (post, platform). */
export const latest = (snaps: Snapshot[]) => {
  const m = new Map<string, Snapshot>();
  for (const s of snaps) {
    const k = `${s.postId}|${s.platform}`;
    const prev = m.get(k);
    if (!prev || prev.fetchedAt < s.fetchedAt) m.set(k, s);
  }
  return [...m.values()];
};

/** Views are compared at a common age (48 h) using a square-root growth curve. */
export const views48 = (s: Snapshot) =>
  s.ageHours >= 48 ? s.views : s.views * Math.sqrt(48 / Math.max(s.ageHours, 1));

export const engagementRate = (s: Snapshot) =>
  (s.likes + 2 * s.comments + 3 * s.shares + 3 * s.saves) / Math.max(s.views, 1);

export const retention = (s: Snapshot) => {
  if (s.avgWatchRatio != null && s.skipRate != null) return (s.avgWatchRatio + (1 - s.skipRate)) / 2;
  if (s.avgWatchRatio != null) return s.avgWatchRatio;
  if (s.skipRate != null) return 1 - s.skipRate;
  return undefined;
};

export const scorePosts = (snaps: Snapshot[], registry: RegistryEntry[]): PostScore[] => {
  const feats = new Map(registry.map((r) => [r.postId, r.features]));
  const rows = latest(snaps).filter((s) => s.ageHours >= MIN_AGE_HOURS && feats.has(s.postId));
  const byPlatform = new Map<Platform, Snapshot[]>();
  for (const r of rows) byPlatform.set(r.platform, [...(byPlatform.get(r.platform) ?? []), r]);

  const per = new Map<string, PostScore>();
  for (const [platform, list] of byPlatform) {
    const lv = list.map((s) => Math.log1p(views48(s)));
    const er = list.map(engagementRate);
    const ret = list.map(retention);
    const retKnown = ret.filter((x): x is number => x != null);
    const [mv, sv, me, se] = [mean(lv), sd(lv), mean(er), sd(er)];
    const [mr, sr] = [mean(retKnown), sd(retKnown)];
    list.forEach((s, i) => {
      const zv = (lv[i] - mv) / sv;
      const ze = (er[i] - me) / se;
      const r = ret[i];
      const score = r != null && retKnown.length > 2 ? 0.5 * zv + 0.25 * ze + 0.25 * ((r - mr) / sr) : 0.65 * zv + 0.35 * ze;
      const entry = per.get(s.postId) ?? {
        postId: s.postId,
        score: 0,
        perPlatform: {},
        features: feats.get(s.postId)!,
      };
      entry.perPlatform[platform] = { score, views: s.views, er: er[i], retention: r };
      per.set(s.postId, entry);
    });
  }
  for (const p of per.values()) p.score = mean(Object.values(p.perPlatform).map((x) => x!.score));
  return [...per.values()].sort((a, b) => a.postId.localeCompare(b.postId));
};

export const featureStats = (scores: PostScore[]): FeatureStat[] => {
  const acc = new Map<string, { feature: keyof Features; value: string; xs: number[] }>();
  for (const p of scores) {
    for (const [feature, value] of Object.entries(p.features) as [keyof Features, string][]) {
      const k = `${feature}=${value}`;
      const e = acc.get(k) ?? { feature, value, xs: [] };
      e.xs.push(p.score);
      acc.set(k, e);
    }
  }
  return [...acc.values()]
    .map(({ feature, value, xs }) => ({
      feature,
      value,
      n: xs.length,
      mean: xs.reduce((a, b) => a + b, 0) / (xs.length + PRIOR_N),
      sd: 1 / Math.sqrt(xs.length + PRIOR_N),
    }))
    .sort((a, b) => b.mean - a.mean);
};

const gauss = (rand: () => number) => {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Thompson sample: pick the option with the highest draw from its posterior. */
export const thompson = (
  feature: keyof Features,
  options: string[],
  stats: FeatureStat[],
  rand: () => number,
  avoid?: string, // e.g. yesterday's style, to keep the feed varied
) => {
  let best = options[0];
  let bestDraw = -Infinity;
  for (const o of options) {
    const st = stats.find((s) => s.feature === feature && s.value === o);
    const m = st?.mean ?? 0;
    const s = st?.sd ?? 1 / Math.sqrt(PRIOR_N);
    const draw = m + s * gauss(rand) - (o === avoid ? 0.35 : 0);
    if (draw > bestDraw) {
      bestDraw = draw;
      best = o;
    }
  }
  return best;
};
