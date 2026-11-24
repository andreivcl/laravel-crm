/**
 * Publishes a rendered post and records the platform IDs in data/registry.json
 * (that registry is what analytics uses to attribute performance):
 *   node scripts/publish.ts [YYYY-MM-DD] --platforms=youtube,instagram,tiktok [--dry-run]
 *
 * If you post manually from the apps (recommended when you want to add a
 * trending sound natively), just record the IDs instead:
 *   node scripts/publish.ts 2026-11-24 --link --tiktok=7311… --instagram=1789… --youtube=dQw4…
 *
 * Credentials:
 *   YouTube   – YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (scope youtube.upload)
 *   Instagram – IG_ACCESS_TOKEN, IG_USER_ID (instagram_business_content_publish)
 *   TikTok    – TIKTOK_ACCESS_TOKEN (video.publish). Unaudited apps can only post
 *               privately: TIKTOK_PRIVACY defaults to SELF_ONLY.
 */
import fs from "node:fs";
import path from "node:path";
import { arg, dateArg, P, readJson, writeJson, type Platform, type PostFile, type RegistryEntry } from "./lib.ts";

const date = dateArg();
const post = readJson<PostFile | null>(path.join(P.posts, `${date}.json`), null);
if (!post) throw new Error(`No plan for ${date}`);
const video = path.join(P.out, date, "video.mp4");
const dry = arg("dry-run") === "true";
const durationSec = post.brief.hookSeconds + post.brief.beats.length * post.brief.beatSeconds + post.brief.ctaSeconds;

const registry = readJson<RegistryEntry[]>(P.registry, []);
const entry: RegistryEntry =
  registry.find((r) => r.postId === date) ??
  (() => {
    const e: RegistryEntry = { postId: date, publishedAt: {}, ids: {}, features: post.features, durationSec };
    registry.push(e);
    return e;
  })();
const record = (p: Platform, id: string) => {
  entry.ids[p] = id;
  entry.publishedAt[p] = new Date().toISOString();
  writeJson(P.registry, registry);
  console.log(`  ✓ ${p}: ${id}`);
};

if (arg("link") === "true") {
  for (const p of ["tiktok", "instagram", "youtube"] as Platform[]) {
    const id = arg(p);
    if (id) record(p, id);
  }
  process.exit(0);
}

if (!fs.existsSync(video)) throw new Error(`Render first: ${video} missing`);
const bytes = fs.readFileSync(video);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${res.url.split("?")[0]}: ${JSON.stringify(body).slice(0, 400)}`);
  return body as any;
};

const uploaders: Record<Platform, () => Promise<string>> = {
  async youtube() {
    const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
    if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) throw new Error("YT_* credentials missing");
    const { access_token } = await json(
      await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({ client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, refresh_token: YT_REFRESH_TOKEN, grant_type: "refresh_token" }),
      }),
    );
    const [title, ...rest] = post.captions.youtube.split("\n");
    const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        authorization: `Bearer ${access_token}`,
        "content-type": "application/json",
        "x-upload-content-type": "video/mp4",
        "x-upload-content-length": String(bytes.length),
      },
      body: JSON.stringify({
        snippet: { title: title.slice(0, 100), description: rest.join("\n").trim(), categoryId: "1" },
        status: { privacyStatus: process.env.YT_PRIVACY ?? "public", selfDeclaredMadeForKids: false },
      }),
    });
    if (!init.ok) await json(init);
    const uploaded = await json(
      await fetch(init.headers.get("location")!, { method: "PUT", headers: { "content-type": "video/mp4" }, body: bytes }),
    );
    return uploaded.id as string;
  },

  async instagram() {
    const { IG_ACCESS_TOKEN, IG_USER_ID } = process.env;
    if (!IG_ACCESS_TOKEN || !IG_USER_ID) throw new Error("IG_ACCESS_TOKEN / IG_USER_ID missing");
    const v = process.env.IG_GRAPH_VERSION ?? "v24.0";
    const base = process.env.IG_GRAPH_HOST ?? "https://graph.instagram.com";
    // 1. container with resumable upload (no public URL needed)
    const container = await json(
      await fetch(`${base}/${v}/${IG_USER_ID}/media`, {
        method: "POST",
        body: new URLSearchParams({ media_type: "REELS", upload_type: "resumable", caption: post.captions.instagram, share_to_feed: "true", access_token: IG_ACCESS_TOKEN }),
      }),
    );
    // 2. upload bytes
    await json(
      await fetch(`https://rupload.facebook.com/ig-api-upload/${v}/${container.id}`, {
        method: "POST",
        headers: { authorization: `OAuth ${IG_ACCESS_TOKEN}`, offset: "0", file_size: String(bytes.length) },
        body: bytes,
      }),
    );
    // 3. wait for processing, then publish
    for (let i = 0; i < 40; i++) {
      const st = await json(await fetch(`${base}/${v}/${container.id}?fields=status_code&access_token=${IG_ACCESS_TOKEN}`));
      if (st.status_code === "FINISHED") break;
      if (st.status_code === "ERROR") throw new Error("Instagram processing failed");
      await sleep(6000);
    }
    const published = await json(
      await fetch(`${base}/${v}/${IG_USER_ID}/media_publish`, {
        method: "POST",
        body: new URLSearchParams({ creation_id: container.id, access_token: IG_ACCESS_TOKEN }),
      }),
    );
    return published.id as string;
  },

  async tiktok() {
    const { TIKTOK_ACCESS_TOKEN } = process.env;
    if (!TIKTOK_ACCESS_TOKEN) throw new Error("TIKTOK_ACCESS_TOKEN missing");
    const headers = { authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`, "content-type": "application/json; charset=UTF-8" };
    const init = await json(
      await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
        method: "POST",
        headers,
        body: JSON.stringify({
          post_info: { title: post.captions.tiktok.slice(0, 2200), privacy_level: process.env.TIKTOK_PRIVACY ?? "SELF_ONLY", disable_comment: false },
          source_info: { source: "FILE_UPLOAD", video_size: bytes.length, chunk_size: bytes.length, total_chunk_count: 1 },
        }),
      }),
    );
    const { publish_id, upload_url } = init.data;
    const put = await fetch(upload_url, {
      method: "PUT",
      headers: { "content-type": "video/mp4", "content-range": `bytes 0-${bytes.length - 1}/${bytes.length}` },
      body: bytes,
    });
    if (!put.ok) throw new Error(`TikTok upload ${put.status}`);
    for (let i = 0; i < 30; i++) {
      await sleep(5000);
      const st = await json(
        await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", { method: "POST", headers, body: JSON.stringify({ publish_id }) }),
      );
      const ids = st.data?.publicaly_available_post_id; // (sic) TikTok's field name
      if (ids?.length) return String(ids[0]);
      if (st.data?.status === "FAILED") throw new Error(`TikTok: ${st.data?.fail_reason}`);
    }
    console.warn("  TikTok still processing; link the post id later with --link --tiktok=<id>");
    return `pending:${publish_id}`;
  },
};

const platforms = (arg("platforms", "youtube,instagram,tiktok") as string).split(",").filter(Boolean) as Platform[];
for (const p of platforms) {
  if (entry.ids[p]) {
    console.log(`  – ${p}: already published (${entry.ids[p]})`);
    continue;
  }
  if (dry) {
    console.log(`  [dry-run] would upload ${video} to ${p}`);
    continue;
  }
  try {
    record(p, await uploaders[p]());
  } catch (e) {
    console.error(`  ✗ ${p}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}
