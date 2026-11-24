import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { rng } from "../../lib/loop";
import { SANS } from "../../overlay/KineticText";
import { tagHeight } from "./Cast";
import { CROWD } from "./Sets";
import { actorsAt, cameraAt, Stage } from "./Stage";
import { ARENA, at, EV, FPS, LINES, SHOTS, shotAt } from "./timeline";

const W = 1080;
const H = 1920;

/** Project a world point with the same camera the 3D canvas uses this frame. */
const projector = (t: number) => {
  const c = cameraAt(t);
  const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.1, 300);
  cam.position.set(...c.position);
  cam.lookAt(...c.target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return (p: [number, number, number]) => {
    const v = new THREE.Vector3(...p);
    const depth = v.clone().applyMatrix4(cam.matrixWorldInverse).z * -1;
    v.project(cam);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, depth, visible: depth > 0.3 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2 };
  };
};

const tier = (n: number) => (n >= 1000 ? { c: "#ffe08a", g: "#ffb703" } : n >= 100 ? { c: "#d6f6ff", g: "#22d3ee" } : n >= 20 ? { c: "#ffffff", g: "#9d8cff" } : { c: "#e9ecef", g: "#6c757d" });
const fmt = (n: number) => n.toLocaleString("en-US");

/** Crowd members that carry a visible number (front rows); a cluster of 1s sits stage-left. */
const CROWD_TAGS = (() => {
  const r = rng(404);
  return CROWD.map((m, i) => ({ m, i }))
    .filter(({ m }) => m.pos.y < 1.6)
    .filter((_, k) => k % 3 === 0)
    .map(({ m, i }) => {
      const p = new THREE.Vector3(ARENA[0] + m.pos.x, ARENA[1] + m.pos.y, ARENA[2] + m.pos.z);
      const ones = p.x - ARENA[0] < -9 && p.z - ARENA[2] > 2;
      return { i, p: [p.x, p.y + 1.85, p.z] as [number, number, number], n: ones ? 1 : [4, 12, 37, 88, 150, 9, 21, 260, 63, 5, 410, 18][Math.floor(r() * 12)] };
    });
})();

const lastChange = (t: number, f: (x: number) => number) => {
  // find the most recent time (within 0.5 s) the value changed, for the pop animation
  const now = f(t);
  for (let d = 0; d <= 0.5; d += 1 / FPS) if (f(t - d) !== now) return d;
  return 99;
};

const Tag: React.FC<{ x: number; y: number; depth: number; n: number; pop: number; flicker?: number; hero?: boolean }> = ({ x, y, depth, n, pop, flicker = 0, hero }) => {
  const size = Math.max(26, Math.min(230, 900 / depth)) * (hero ? 1.1 : 1);
  const s = pop < 0.35 ? 1 + 0.6 * (1 - pop / 0.35) : 1;
  const { c, g } = tier(n);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: "-50% -100%",
        scale: s,
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.02em",
        color: c,
        opacity: 1 - flicker,
        textShadow: `0 0 ${size * 0.18}px ${g}, 0 0 ${size * 0.45}px ${g}aa, 0 ${size * 0.04}px ${size * 0.06}px #000a`,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {fmt(n)}
    </div>
  );
};

const NumberTags: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const project = projector(t);
  const { shot } = shotAt(t);
  const tags: React.ReactNode[] = [];
  // Clutter control: walkers only show numbers in the opening shot; the crowd only in the "ones" shot.
  const opening = shot.id === "street-crane";
  for (const ac of actorsAt(t)) {
    if (ac.id.startsWith("w") && !(opening && Number(ac.id.slice(1)) < 4)) continue;
    const lying = Math.abs(Math.sin(ac.rotZ ?? 0));
    const h = tagHeight(ac.look) * (1 - lying) + 1.6 * lying;
    const p = project([ac.pos[0], ac.pos[1] + h, ac.pos[2]]);
    if (!p.visible) continue;
    const hero = ac.id === "cubi" && ac.set === "arena";
    const flicker = hero && t >= at("getup", "and") && t < at("two") ? (Math.sin(t * 57) > 0.2 ? 0.85 : 0) : 0;
    const pop = hero ? lastChange(t, (x) => actorsAt(x).find((a) => a.id === "cubi")?.number ?? 0) : 99;
    tags.push(<Tag key={ac.id} x={p.x} y={p.y} depth={p.depth} n={ac.number} pop={pop} flicker={flicker} hero={hero} />);
  }
  if (shot.id === "ones") {
    for (const ct of CROWD_TAGS.filter((c) => c.n === 1).slice(0, 5)) {
      const p = project(ct.p);
      if (!p.visible || p.depth > 26) continue;
      tags.push(<Tag key={`c${ct.i}`} x={p.x} y={p.y} depth={p.depth * 1.25} n={ct.n} pop={99} />);
    }
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{tags}</AbsoluteFill>;
};

/** One word at a time, as spoken – lime with a heavy black outline, popping in. */
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  let word: { w: string; start: number } | null = null;
  for (const l of LINES) for (const w of l.words) if (t >= w.start - 0.02 && t < Math.max(w.end, w.start + 0.18)) word = w;
  if (!word) return null;
  const text = word.w.replace(/[.,!?;:]+$/g, "").replace(/^"|"$/g, "");
  const k = interpolate(t - word.start, [0, 0.09], [1.18, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: 330 }}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: text.length > 9 ? 112 : 132,
          color: "#e8ff3a",
          WebkitTextStroke: "14px #000",
          paintOrder: "stroke fill",
          textShadow: "0 8px 0 #000, 0 12px 24px rgba(0,0,0,0.55)",
          letterSpacing: "-0.01em",
          scale: k,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Screen-space punch: shake on impacts + 1-frame white impact flashes. */
const useShake = (t: number) => {
  const { shot } = shotAt(t);
  if (!shot.shake) return { x: 0, y: 0 };
  const d = t - shot.from;
  const a = shot.shake * Math.exp(-d * 9);
  return { x: a * Math.sin(d * 83), y: a * Math.cos(d * 71) };
};

const Flashes: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const hits = [EV.push, EV.hit1, EV.hit2, EV.flash, EV.reveal];
  const o = Math.max(...hits.map((h) => (t >= h && t < h + 2 / FPS ? 0.55 : 0)));
  const red = t >= EV.flash ? 0.18 + 0.08 * Math.sin(t * 9) : 0;
  return (
    <>
      <AbsoluteFill style={{ background: "#fff", opacity: o, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, #ff0033 130%)", opacity: red }} />
    </>
  );
};

export const NumbersFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / FPS;
  const sh = useShake(t);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0820" }}>
      <AbsoluteFill style={{ translate: `${sh.x}px ${sh.y}px`, scale: 1.04 }}>
        <ThreeCanvas width={width} height={height} gl={{ antialias: true }} dpr={1} shadows>
          <Stage t={t} />
        </ThreeCanvas>
        <NumberTags />
      </AbsoluteFill>
      {/* grade: vignette + slight warm lift */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 75% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      <Flashes />
      <Captions />
      <Audio src={staticFile("audio/numbers-mix.wav")} />
    </AbsoluteFill>
  );
};

export const SHOT_COUNT = SHOTS.length;
