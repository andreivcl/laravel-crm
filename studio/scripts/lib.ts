import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Brief } from "../src/brief.ts";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const P = {
  config: path.join(ROOT, "content/config.json"),
  ideas: path.join(ROOT, "content/ideas.json"),
  trends: path.join(ROOT, "content/trends.md"),
  posts: path.join(ROOT, "content/posts"),
  registry: path.join(ROOT, "data/registry.json"),
  snapshots: path.join(ROOT, "data/snapshots.jsonl"),
  insights: path.join(ROOT, "data/insights.json"),
  out: path.join(ROOT, "out"),
};

export const readJson = <T>(file: string, fallback: T): T => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = (file: string, data: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
};

export const today = () => new Date().toISOString().slice(0, 10);

export const arg = (name: string, fallback?: string) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split("=").slice(1).join("=");
  return process.argv.includes(`--${name}`) ? "true" : fallback;
};

/** First positional argument that looks like a date, else today. */
export const dateArg = () =>
  process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? today();

export const hashSeed = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

// ---------- shared types ----------

export type Platform = "tiktok" | "instagram" | "youtube";
export const PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube"];

export type Idea = {
  id: string;
  pillar: string;
  hookType: string;
  /** optional: lock the idea to a scene style when the text describes it */
  style?: string | null;
  hook: string;
  beats: string[];
  cta: string;
  caption: string;
  hashtags: string[];
  usedOn?: string;
};

export type Config = {
  niche: string;
  audience: string;
  language: string;
  series: string;
  pillars: { id: string; name: string; description: string }[];
  hookTypes: { id: string; description: string }[];
  platforms: Record<Platform, { baseHashtags: string[]; postAt: string; maxHashtags: number }>;
};

/** Attributes we learn from. Every post records them so analytics can attribute performance. */
export type Features = {
  style: string;
  palette: string;
  pillar: string;
  hookType: string;
  beats: string; // count, as string
  length: string; // duration bucket
  weekday: string;
};

export type PostFile = {
  date: string;
  brief: Brief;
  features: Features;
  captions: Record<Platform, string>;
  ideaId: string;
};

export type RegistryEntry = {
  postId: string; // = date
  publishedAt: Partial<Record<Platform, string>>;
  ids: Partial<Record<Platform, string>>;
  features: Features;
  durationSec: number;
};

export type Snapshot = {
  postId: string;
  platform: Platform;
  platformId: string;
  fetchedAt: string;
  ageHours: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  /** 0..1 – share of the video watched on average, when the platform exposes it */
  avgWatchRatio?: number;
  /** 0..1 – Instagram: share of plays that skipped in the first 3 s */
  skipRate?: number;
  demo?: boolean;
};

export const readSnapshots = (): Snapshot[] => {
  if (!fs.existsSync(P.snapshots)) return [];
  return fs
    .readFileSync(P.snapshots, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Snapshot);
};

export const appendSnapshots = (rows: Snapshot[]) => {
  fs.mkdirSync(path.dirname(P.snapshots), { recursive: true });
  fs.appendFileSync(P.snapshots, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
};
