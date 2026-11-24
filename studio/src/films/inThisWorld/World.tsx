import React, { useMemo } from "react";
import type { Palette } from "../../brief";
import { rng, TAU } from "../../lib/loop";
import { Backdrop, CameraRig } from "../../scenes/shared";
import { CAMERA, DUR, T } from "./spec";
import { Bench, Box, Car, ClockTower, CubeDog, CubePerson, CUBI, House, LampPost, NEIGHBOUR, Tree } from "./Voxel";

export const SKY: Palette = {
  name: "golden-hour",
  bg: "#1c2a5c",
  a: "#ff8fab",
  b: "#ffc971",
  c: "#8ecae6",
  ink: "#14142b",
  text: "#fffaf0",
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x: number) => {
  const c = clamp01(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
/** periodic in film time, so the loop seam is clean */
const wave = (t: number, cycles: number, phase = 0) => Math.sin((TAU * t * cycles) / DUR + phase);

/** Camera from the keyed path (same rules as the knot film: `cut` keys are jumped to). */
export const cameraAt = (t: number) => {
  let i = 0;
  while (i < CAMERA.length - 2 && t >= CAMERA[i + 1].t) i++;
  const a = CAMERA[i];
  const b = CAMERA[i + 1];
  const x = b.t > a.t ? clamp01((t - a.t) / (b.t - a.t)) : 0;
  const k = b.cut ? 0 : 0.5 * x + 0.5 * easeInOut(x);
  const lerp = (u: number, v: number) => u + (v - u) * k;
  const target: [number, number, number] = [lerp(a.target[0], b.target[0]), lerp(a.target[1], b.target[1]), lerp(a.target[2], b.target[2])];
  const az = (lerp(a.az, b.az) * Math.PI) / 180;
  const el = (lerp(a.el, b.el) * Math.PI) / 180;
  const d = lerp(a.dist, b.dist);
  const position: [number, number, number] = [
    target[0] + Math.sin(az) * Math.cos(el) * d,
    target[1] + Math.sin(el) * d,
    target[2] + Math.cos(az) * Math.cos(el) * d,
  ];
  return { position, target };
};

/**
 * How far object `i` has floated (0 = on the ground, 1 = fully up).
 * Hook shows the floating world; 11:58–12:00 grounded; 12:00 everything
 * rises (staggered); 13:00 everything falls (landings accelerate); during
 * the CTA it all lifts again so the last frame matches frame 0.
 */
export const floatK = (t: number, i: number, n: number) => {
  if (t < T.setup) return 1;
  if (t < T.float) return 0;
  if (t < T.fall) return easeOut((t - T.float - 0.06 * i) / 1.3);
  if (t < T.cta) {
    // landing times accelerate: gaps shrink geometrically across the 4 s window
    const u = (i + 1) / n;
    const landAt = T.fall + 0.25 + 3.2 * (1 - Math.pow(1 - u, 1.8));
    const fallDur = 0.55;
    if (t < landAt - fallDur) return 1;
    const x = clamp01((t - (landAt - fallDur)) / fallDur);
    return 1 - x * x; // gravity: accelerating fall
  }
  return easeInOut((t - T.cta) / (DUR - T.cta));
};

type Prop = {
  kind: "car" | "bench" | "tree" | "pot" | "mailbox";
  p: [number, number, number];
  ry: number;
  h: number; // float height
  c?: string;
};

export const World: React.FC<{ t: number }> = ({ t }) => {
  const props = useMemo<Prop[]>(() => {
    const r = rng(11);
    const list: Prop[] = [
      { kind: "car", p: [-4.6, 0, 1.0], ry: 0, h: 2.4, c: "#ef476f" },
      { kind: "car", p: [4.4, 0, 0.9], ry: Math.PI, h: 3.0, c: "#118ab2" },
      { kind: "bench", p: [-3.8, 0, 3.5], ry: 0, h: 2.0 },
      { kind: "bench", p: [3.3, 0, 3.5], ry: 0, h: 2.6 },
      { kind: "tree", p: [-6.0, 0, 3.6], ry: 0.2, h: 3.4 },
      { kind: "tree", p: [0.2, 0, -0.9], ry: -0.4, h: 2.8 },
      { kind: "tree", p: [5.8, 0, 3.4], ry: 0.6, h: 3.8 },
      { kind: "tree", p: [6.0, 0, -3.8], ry: 0.1, h: 3.2 },
      { kind: "mailbox", p: [-1.7, 0, 2.2], ry: 0, h: 2.2 },
      { kind: "pot", p: [-5.3, 0, -1.0], ry: 0, h: 1.8, c: "#f4a261" },
      { kind: "pot", p: [-2.3, 0, -1.0], ry: 0, h: 2.3, c: "#e76f51" },
      { kind: "pot", p: [1.6, 0, -1.2], ry: 0, h: 2.0, c: "#f4a261" },
    ];
    return list.map((x) => ({ ...x, h: x.h + r() * 0.6 }));
  }, []);
  const n = props.length + 2; // + Cubi + neighbour

  const cam = cameraAt(t);
  const angle = (TAU * t) / (DUR / 2);

  // ---- Cubi
  const walkStart = T.setup + 0.4;
  const walkEnd = T.countdown - 0.4;
  const walking = t >= walkStart && t < walkEnd;
  const wx = -3.4 + (0.24 + 3.4) * clamp01((t - walkStart) / (walkEnd - walkStart));
  const phase = TAU * 1.9 * t;
  const turn = clamp01((t - walkEnd) / 0.4); // turn from +x to face the camera (+z)
  const armUp = t < T.setup ? 1 : easeOut((t - (T.countdown + 1.2)) / 0.5);
  const cubiK = floatK(t, props.length, n);
  const blink = Math.max(0, 1 - Math.abs(((t * 0.37) % 1) - 0.5) * 40); // ~every 2.7 s, 2 frames
  const flagAngle = cubiK * (2.5 + 0.18 * wave(t, 6));

  // ---- Bobo
  const bx = t < T.setup ? 1.5 : -2.6 + (1.5 + 2.6) * clamp01((t - walkStart) / (walkEnd - walkStart));
  const boboWalking = walking;
  const sit = t < T.setup ? 1 : easeOut((t - walkEnd) / 0.5);
  const wink = clamp01(1 - Math.abs(t - (T.hero + 7.0)) / 0.25);

  // ---- neighbour: crosses the street, then floats away higher than anything else
  const nk = floatK(t, props.length + 1, n);
  const nx = 4.2 - 2.0 * clamp01((t - walkStart) / (walkEnd - walkStart));

  // clock time in hours: 11:58 → 11:59 → 12:00, time-lapse to 13:00, then on.
  // The hook shows the same time as the last frame, so the loop seam matches.
  const after13 = (x: number) => 13 + (x - T.fall) / 600;
  const hours =
    t < T.setup
      ? after13(t + DUR)
      : t < T.countdown
        ? 11 + 58 / 60 + (1 / 60) * clamp01((t - T.setup) / (T.countdown - T.setup)) * 0.5
        : t < T.float
          ? 11 + 59 / 60 + (1 / 60) * clamp01((t - T.countdown) / (T.float - T.countdown))
          : t < T.fall
            ? 12 + easeInOut((t - T.float) / (T.fall - T.float))
            : after13(t);

  return (
    <>
      <CameraRig position={cam.position} target={cam.target} fov={34} />
      <Backdrop palette={SKY} angle={angle} strength={1.0} />
      <hemisphereLight args={["#cfe8ff", "#6a4c93", 0.9]} />
      <directionalLight
        position={[8, 14, 9]}
        intensity={2.4}
        color="#fff1d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-8, 4, -6]} intensity={0.6} color={SKY.a} />

      {/* the floating island */}
      <group>
        <Box p={[0, -0.2, 0]} s={[14, 0.4, 10]} c="#80b918" />
        <Box p={[0, -0.8, 0]} s={[13.2, 0.8, 9.2]} c="#9c6644" />
        <Box p={[0.3, -1.6, -0.2]} s={[11, 0.8, 7.6]} c="#7f5539" />
        <Box p={[-0.2, -2.4, 0.1]} s={[8, 0.8, 5.2]} c="#6f4e37" />
        <Box p={[0.4, -3.2, 0]} s={[4.2, 0.8, 2.8]} c="#5e3c2c" />
        {/* road, lane marks, sidewalk */}
        <Box p={[0, 0.02, 1.0]} s={[14, 0.05, 1.5]} c="#495057" rough={0.95} />
        {[-5.5, -3, -0.5, 2, 4.5].map((x) => (
          <Box key={x} p={[x, 0.06, 1.0]} s={[1.0, 0.02, 0.1]} c="#f8f9fa" />
        ))}
        <Box p={[0, 0.04, 2.6]} s={[14, 0.08, 1.4]} c="#dee2e6" />
      </group>

      {/* clouds drift on loops */}
      {[
        [-8, 6.5, -6, 1.2],
        [7, 5.2, -5, 0.9],
        [-3, 8, -9, 1.5],
        [9, 7.4, 2, 1.0],
      ].map(([x, y, z, s], i) => (
        <group key={i} position={[x + wave(t, 1, i) * 0.8, y + wave(t, 2, i) * 0.2, z]} scale={s}>
          <Box s={[2.2, 0.7, 1.2]} c="#ffffff" />
          <Box p={[0.5, 0.45, 0]} s={[1.2, 0.6, 1.0]} c="#ffffff" />
        </group>
      ))}

      {/* anchored town */}
      <House p={[-4.6, 0, -2.6]} wall="#ffb4a2" roof="#6d597a" />
      <House p={[-1.4, 0, -2.6]} wall="#bde0fe" roof="#e56b6f" h={2.0} />
      <group position={[3.1, 0, -2.6]}>
        <ClockTower hours={hours} />
      </group>
      <group position={[0.6, 0, 2.6]}>
        <LampPost />
      </group>

      {/* loose props float */}
      {props.map((pr, i) => {
        const k = floatK(t, i, n);
        const y = k * (pr.h + 0.25 * wave(t, 4, i * 1.7));
        const spin = k * 0.5 * wave(t, 2, i);
        return (
          <group key={i} position={[pr.p[0], pr.p[1] + y, pr.p[2]]} rotation={[spin * 0.6, pr.ry + spin, spin * 0.4]}>
            {pr.kind === "car" && <Car c={pr.c!} />}
            {pr.kind === "bench" && <Bench />}
            {pr.kind === "tree" && <Tree />}
            {pr.kind === "mailbox" && (
              <group>
                <Box p={[0, 0.45, 0]} s={[0.1, 0.9, 0.1]} c="#343a40" />
                <Box p={[0, 1.0, 0]} s={[0.4, 0.3, 0.55]} c="#e63946" />
              </group>
            )}
            {pr.kind === "pot" && (
              <group>
                <Box p={[0, 0.2, 0]} s={[0.4, 0.4, 0.4]} c={pr.c!} />
                <Box p={[0, 0.55, 0]} s={[0.5, 0.35, 0.5]} c="#2d6a4f" />
              </group>
            )}
          </group>
        );
      })}

      {/* Cubi: walks, grabs the lamp post, then flies like a flag from it */}
      {t >= T.setup && t < walkEnd ? (
        <group position={[wx, 0, 2.6]} rotation={[0, Math.PI / 2, 0]}>
          <CubePerson outfit={CUBI} pose={{ walk: walking ? phase : 0, blink }} />
        </group>
      ) : (
        <group position={[0.6, 1.68, 2.6]} rotation={[0, 0, flagAngle]}>
          <group position={[-0.36, -1.68, 0]} rotation={[0, (Math.PI / 2) * (1 - turn) * (t < T.setup ? 0 : 1), 0]}>
            <CubePerson outfit={CUBI} pose={{ armUp, blink, look: 0.3 * wave(t, 8) * cubiK }} />
          </group>
        </group>
      )}

      {/* Bobo walks, then sits – and never floats */}
      <group position={[bx, 0, 3.05]} rotation={[0, t < T.setup ? 0 : (Math.PI / 2) * (1 - turn), 0]}>
        <CubeDog walk={boboWalking ? phase * 1.3 : 0} wag={TAU * 3 * t} sit={sit} wink={wink} />
      </group>

      {/* the neighbour who didn't hold on */}
      <group position={[nx + nk * 1.5 * (1 + 0.2 * wave(t, 3)), nk * (6.0 + 0.3 * wave(t, 5)), 1.0]} rotation={[0, -Math.PI / 2, nk * 1.2 * wave(t, 3, 1)]}>
        <CubePerson outfit={NEIGHBOUR} pose={{ walk: walking ? phase + 1 : 0, armUp: nk }} />
      </group>
    </>
  );
};
