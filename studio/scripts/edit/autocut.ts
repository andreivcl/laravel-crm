/**
 * Auto-edit real footage for vertical platforms:
 *   node scripts/edit/autocut.ts in.mp4 out.mp4 [--reframe=blur|crop|none]
 *        [--min-silence=0.45] [--threshold=-35] [--pad=0.08] [--punch=1.08]
 *
 * 1. finds silences (ffmpeg silencedetect) and keeps the spoken parts → jump cuts
 * 2. alternates 100 % / `punch` zoom on every other segment, so cuts read as intentional
 * 3. reframes to 1080×1920 (blur-fill or centre crop)
 * 4. loudness-normalises the speech to −14 LUFS
 * Writes out.mp4 and out.cuts.json (segment map: source in/out → output in/out),
 * which captions, SFX or a Remotion overlay can be timed against.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const args = process.argv.slice(2);
const [input, output] = args.filter((a) => !a.startsWith("--"));
if (!input || !output) {
  console.error("usage: node scripts/edit/autocut.ts in.mp4 out.mp4 [--reframe=blur|crop|none] [--min-silence=0.45] [--threshold=-35] [--pad=0.08] [--punch=1.08]");
  process.exit(2);
}
const opt = (name: string, d: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? d;
const reframe = opt("reframe", "blur");
const minSilence = Number(opt("min-silence", "0.45"));
const threshold = Number(opt("threshold", "-35"));
const pad = Number(opt("pad", "0.08"));
const punch = Number(opt("punch", "1.08"));
const W = 1080;
const H = 1920;

const probe = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", input]).toString(),
);
const duration = Number(probe.format.duration);
const vstream = probe.streams.find((s: any) => s.codec_type === "video");
if (!vstream) throw new Error("no video stream");
if (!probe.streams.some((s: any) => s.codec_type === "audio")) throw new Error("no audio stream: nothing to detect silences in");

// 1. silences
const log = execFileSync("sh", [
  "-c",
  `ffmpeg -hide_banner -nostats -i "${input}" -af silencedetect=noise=${threshold}dB:d=${minSilence} -f null - 2>&1`,
]).toString();
const silences: [number, number][] = [];
let open: number | null = null;
for (const line of log.split("\n")) {
  const s = line.match(/silence_start: (-?[\d.]+)/);
  const e = line.match(/silence_end: ([\d.]+)/);
  if (s) open = Math.max(0, Number(s[1]));
  if (e && open != null) {
    silences.push([open, Number(e[1])]);
    open = null;
  }
}
if (open != null) silences.push([open, duration]);

// keep = complement of silences, padded, merged, tiny bits dropped
let keep: [number, number][] = [];
let cursor = 0;
for (const [a, b] of silences) {
  if (a > cursor) keep.push([cursor, a]);
  cursor = b;
}
if (cursor < duration) keep.push([cursor, duration]);
keep = keep
  .map(([a, b]) => [Math.max(0, a - pad), Math.min(duration, b + pad)] as [number, number])
  .reduce<[number, number][]>((acc, seg) => {
    const last = acc.at(-1);
    if (last && seg[0] - last[1] < 0.12) last[1] = seg[1];
    else acc.push(seg);
    return acc;
  }, [])
  .filter(([a, b]) => b - a >= 0.25);
if (!keep.length) throw new Error("everything is below the silence threshold – try a lower --threshold");

// 2–3. per-segment video chain
const frameChain = (zoom: number) => {
  const z = zoom !== 1 ? `,scale=iw*${zoom}:ih*${zoom},crop=${W}:${H}` : "";
  if (reframe === "crop") return `scale=-2:${H},crop=${W}:${H}${z},setsar=1`;
  if (reframe === "none") return `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2${z},setsar=1`;
  // blur-fill: blurred cover behind, full frame on top
  return `split[bg][fg];[bg]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=40:2[bgb];[fg]scale=${W}:-2[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2${z},setsar=1`;
};

const parts: string[] = [];
keep.forEach(([a, b], i) => {
  const zoom = i % 2 === 1 ? punch : 1;
  parts.push(`[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS,fps=30,${frameChain(zoom)}[v${i}]`);
  parts.push(
    `[0:a]atrim=start=${a.toFixed(3)}:end=${b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, b - a - 0.012).toFixed(3)}:d=0.012[a${i}]`,
  );
});
const concatIn = keep.map((_, i) => `[v${i}][a${i}]`).join("");
parts.push(`${concatIn}concat=n=${keep.length}:v=1:a=1[vc][ac]`);
parts.push(`[ac]loudnorm=I=-14:TP=-1.5:LRA=11[aout]`);

const graphFile = `${output}.filtergraph.txt`;
fs.writeFileSync(graphFile, parts.join(";\n"));
execFileSync(
  "ffmpeg",
  [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", input,
    "-filter_complex_script", graphFile,
    "-map", "[vc]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart",
    output,
  ],
  { stdio: "inherit" },
);
fs.rmSync(graphFile);

// segment map
let t = 0;
const segments = keep.map(([a, b], i) => {
  const s = { index: i, sourceIn: +a.toFixed(3), sourceOut: +b.toFixed(3), outIn: +t.toFixed(3), outOut: +(t + b - a).toFixed(3), zoom: i % 2 === 1 ? punch : 1 };
  t += b - a;
  return s;
});
fs.writeFileSync(output.replace(/\.[^.]+$/, "") + ".cuts.json", JSON.stringify({ input, duration, segments }, null, 2));

const meter = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "${output}" -af ebur128=peak=true -f null - 2>&1 | tail -12`]).toString();
console.log(
  `✓ ${output}: ${keep.length} segments, ${duration.toFixed(1)} s → ${t.toFixed(1)} s (removed ${(duration - t).toFixed(1)} s of silence), ` +
    `${meter.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]} LUFS, peak ${meter.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]} dBFS`,
);
