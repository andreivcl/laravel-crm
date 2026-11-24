/**
 * The whole daily loop, in order:
 *   1. fetch analytics for everything already published
 *   2. analyze → data/insights.json + out/dashboard.html
 *   3. top up the idea backlog with Claude when it runs low (needs ANTHROPIC_API_KEY)
 *   4. plan today's post (Thompson sampling over what works)
 *   5. render video + cover + captions
 *   6. publish (only with --publish)
 *
 *   node scripts/daily.ts [YYYY-MM-DD] [--publish] [--platforms=youtube,instagram,tiktok]
 */
import { execFileSync } from "node:child_process";
import { arg, dateArg, P, readJson, ROOT, type Idea } from "./lib.ts";

const date = dateArg();
const run = (script: string, ...args: string[]) =>
  execFileSync(process.execPath, [script, ...args], { cwd: ROOT, stdio: "inherit", env: process.env });

console.log(`\n▶ daily run for ${date}\n`);
run("scripts/analytics/fetch.ts");
run("scripts/analytics/analyze.ts");

const unused = readJson<Idea[]>(P.ideas, []).filter((i) => !i.usedOn).length;
if (unused < 3) {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) run("scripts/ideas.ts", "--count=10");
  else console.warn(`⚠ only ${unused} unused ideas left and no ANTHROPIC_API_KEY – add ideas to content/ideas.json`);
}

run("scripts/plan.ts", date);
run("scripts/render.ts", date);
if (arg("publish") === "true") {
  run("scripts/publish.ts", date, `--platforms=${arg("platforms", "youtube,instagram,tiktok")}`);
}
console.log(`\n✓ done – out/${date}/ (video.mp4, cover.png, captions.md) and out/dashboard.html\n`);
