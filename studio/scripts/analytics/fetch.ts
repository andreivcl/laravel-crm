/**
 * Pulls current metrics for every published post and appends one snapshot per
 * (post, platform) to data/snapshots.jsonl:
 *   node scripts/analytics/fetch.ts
 *
 * Credentials (only the platforms you configure are queried):
 *   YouTube   – YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
 *               scopes: youtube.readonly + yt-analytics.readonly
 *   Instagram – IG_ACCESS_TOKEN (Instagram Login, instagram_business_basic +
 *               instagram_business_manage_insights), optional IG_GRAPH_VERSION
 *   TikTok    – TIKTOK_ACCESS_TOKEN (Display API, scope video.list)
 */
import { P, readJson, appendSnapshots, type Platform, type RegistryEntry, type Snapshot } from "../lib.ts";

const now = new Date();
const registry = readJson<RegistryEntry[]>(P.registry, []);
const ageHours = (iso?: string) => (iso ? (now.getTime() - new Date(iso).getTime()) / 36e5 : 0);

const getJson = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${url.split("?")[0]}: ${JSON.stringify(body).slice(0, 300)}`);
  return body as any;
};

const forPlatform = (p: Platform) =>
  registry.filter((r) => r.ids[p]).map((r) => ({ entry: r, id: r.ids[p]! }));

// ---------------------------------------------------------------- YouTube
const youtube = async (): Promise<Snapshot[]> => {
  const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
  if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) return [];
  const posts = forPlatform("youtube");
  if (!posts.length) return [];
  const token = await getJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      refresh_token: YT_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const auth = { headers: { authorization: `Bearer ${token.access_token}` } };
  const out: Snapshot[] = [];
  for (let i = 0; i < posts.length; i += 50) {
    const chunk = posts.slice(i, i + 50);
    const ids = chunk.map((c) => c.id).join(",");
    // Public counters (Data API)
    const stats = await getJson(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}`,
      auth,
    );
    // Retention + shares (Analytics API)
    const start = chunk.map((c) => c.entry.publishedAt.youtube ?? c.entry.postId).sort()[0].slice(0, 10);
    const report = await getJson(
      "https://youtubeanalytics.googleapis.com/v2/reports?" +
        new URLSearchParams({
          ids: "channel==MINE",
          startDate: start,
          endDate: now.toISOString().slice(0, 10),
          metrics: "views,likes,comments,shares,averageViewPercentage",
          dimensions: "video",
          filters: `video==${ids}`,
        }),
      auth,
    ).catch((e) => {
      console.warn("  youtube analytics unavailable:", (e as Error).message);
      return { rows: [] };
    });
    const rows = new Map<string, number[]>((report.rows ?? []).map((r: any[]) => [r[0], r.slice(1)]));
    for (const v of stats.items ?? []) {
      const c = chunk.find((x) => x.id === v.id)!;
      const s = v.statistics ?? {};
      const a = rows.get(v.id);
      out.push({
        postId: c.entry.postId,
        platform: "youtube",
        platformId: v.id,
        fetchedAt: now.toISOString(),
        ageHours: ageHours(v.snippet?.publishedAt),
        views: Number(s.viewCount ?? 0),
        likes: Number(s.likeCount ?? 0),
        comments: Number(s.commentCount ?? 0),
        shares: a ? Number(a[3]) : 0,
        saves: 0,
        // Shorts loop, so averageViewPercentage can exceed 100 – cap the ratio at 1.5
        avgWatchRatio: a ? Math.min(Number(a[4]) / 100, 1.5) : undefined,
      });
    }
  }
  return out;
};

// ---------------------------------------------------------------- Instagram
const instagram = async (): Promise<Snapshot[]> => {
  const { IG_ACCESS_TOKEN } = process.env;
  if (!IG_ACCESS_TOKEN) return [];
  const v = process.env.IG_GRAPH_VERSION ?? "v24.0";
  const base = process.env.IG_GRAPH_HOST ?? "https://graph.instagram.com";
  const out: Snapshot[] = [];
  for (const { entry, id } of forPlatform("instagram")) {
    try {
      const media = await getJson(
        `${base}/${v}/${id}?fields=timestamp,like_count,comments_count&access_token=${IG_ACCESS_TOKEN}`,
      );
      // Metric names change between Graph versions; request the current Reels set.
      const metrics = "views,reach,likes,comments,shares,saved,ig_reels_avg_watch_time,reels_skip_rate";
      const ins = await getJson(`${base}/${v}/${id}/insights?metric=${metrics}&access_token=${IG_ACCESS_TOKEN}`);
      const m = Object.fromEntries((ins.data ?? []).map((d: any) => [d.name, d.values?.[0]?.value ?? d.total_value?.value]));
      const avgWatchMs = Number(m.ig_reels_avg_watch_time ?? NaN);
      out.push({
        postId: entry.postId,
        platform: "instagram",
        platformId: id,
        fetchedAt: now.toISOString(),
        ageHours: ageHours(media.timestamp),
        views: Number(m.views ?? 0),
        likes: Number(m.likes ?? media.like_count ?? 0),
        comments: Number(m.comments ?? media.comments_count ?? 0),
        shares: Number(m.shares ?? 0),
        saves: Number(m.saved ?? 0),
        avgWatchRatio: Number.isFinite(avgWatchMs) ? Math.min(avgWatchMs / 1000 / entry.durationSec, 1.5) : undefined,
        skipRate: m.reels_skip_rate != null ? Number(m.reels_skip_rate) / 100 : undefined,
      });
    } catch (e) {
      console.warn(`  instagram ${id}:`, (e as Error).message);
    }
  }
  return out;
};

// ---------------------------------------------------------------- TikTok
const tiktok = async (): Promise<Snapshot[]> => {
  const { TIKTOK_ACCESS_TOKEN } = process.env;
  if (!TIKTOK_ACCESS_TOKEN) return [];
  const posts = forPlatform("tiktok");
  const out: Snapshot[] = [];
  for (let i = 0; i < posts.length; i += 20) {
    const chunk = posts.slice(i, i + 20);
    const body = await getJson(
      "https://open.tiktokapis.com/v2/video/query/?fields=id,create_time,duration,view_count,like_count,comment_count,share_count",
      {
        method: "POST",
        headers: { authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ filters: { video_ids: chunk.map((c) => c.id) } }),
      },
    );
    for (const v of body.data?.videos ?? []) {
      const c = chunk.find((x) => x.id === v.id);
      if (!c) continue;
      out.push({
        postId: c.entry.postId,
        platform: "tiktok",
        platformId: v.id,
        fetchedAt: now.toISOString(),
        ageHours: ageHours(new Date(v.create_time * 1000).toISOString()),
        views: v.view_count ?? 0,
        likes: v.like_count ?? 0,
        comments: v.comment_count ?? 0,
        shares: v.share_count ?? 0,
        saves: 0, // not exposed by the Display API
      });
    }
  }
  return out;
};

const results = await Promise.allSettled([youtube(), instagram(), tiktok()]);
const rows: Snapshot[] = [];
results.forEach((r, i) => {
  const name = ["youtube", "instagram", "tiktok"][i];
  if (r.status === "fulfilled") {
    rows.push(...r.value);
    console.log(`  ${name}: ${r.value.length} snapshots`);
  } else console.warn(`  ${name} failed:`, r.reason?.message ?? r.reason);
});
appendSnapshots(rows);
console.log(`✓ appended ${rows.length} snapshots to data/snapshots.jsonl`);
