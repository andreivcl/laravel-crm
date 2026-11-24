/**
 * Renders a planned post:
 *   node scripts/render.ts [YYYY-MM-DD]
 * Produces out/<date>/video.mp4, cover.png and captions.md.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { dateArg, P, PLATFORMS, readJson, ROOT, type PostFile } from "./lib.ts";

const date = dateArg();
const post = readJson<PostFile | null>(path.join(P.posts, `${date}.json`), null);
if (!post) throw new Error(`No plan for ${date} – run: node scripts/plan.ts ${date}`);

const dir = path.join(P.out, date);
fs.mkdirSync(dir, { recursive: true });
const props = path.join(dir, "props.json");
fs.writeFileSync(props, JSON.stringify(post.brief));

const remotion = (args: string[]) =>
  execFileSync("npx", ["remotion", ...args], { cwd: ROOT, stdio: "inherit" });

const concurrency = process.env.RENDER_CONCURRENCY ?? "50%";
remotion([
  "render",
  "DailyShort",
  path.join(dir, "video.mp4"),
  `--props=${props}`,
  `--concurrency=${concurrency}`,
  "--crf=18", // high quality: platforms re-encode anyway, give them a clean master
  "--pixel-format=yuv420p",
]);
remotion(["still", "DailyShort", path.join(dir, "cover.png"), `--props=${props}`, "--frame=0"]);

const md = [
  `# ${date} – ${post.brief.series}`,
  "",
  `Style: ${post.features.style} · Palette: ${post.features.palette} · Pillar: ${post.features.pillar} · Hook: ${post.features.hookType}`,
  "",
  ...PLATFORMS.flatMap((p) => [`## ${p}`, "", "```", post.captions[p], "```", ""]),
].join("\n");
fs.writeFileSync(path.join(dir, "captions.md"), md);
console.log(`✓ rendered ${dir}`);
