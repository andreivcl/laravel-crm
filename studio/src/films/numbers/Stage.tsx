import React, { useMemo } from "react";
import * as THREE from "three";
import type { Palette } from "../../brief";
import { rng } from "../../lib/loop";
import { Backdrop, CameraRig, PaletteEnvironment } from "../../scenes/shared";
import { Expr, Figure, LOOKS, Look, Pose, tagHeight } from "./Cast";
import { ArenaSet, CROWD, Street } from "./Sets";
import { ARENA, at, EV, heroNumber, SHOTS, shotAt, V3 } from "./timeline";

export const DUSK: Palette = { name: "dusk", bg: "#241b3a", a: "#ff8fab", b: "#ffb86b", c: "#7aa2ff", ink: "#120c1f", text: "#ffffff" };
export const NEON: Palette = { name: "neon", bg: "#0d0820", a: "#c04bff", b: "#5ce1ff", c: "#ffcf5c", ink: "#07040f", text: "#ffffff" };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const c = clamp01(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/**
 * Camera for time t. Every shot moves the whole time:
 *  - authored dolly p0→p1 (ease that never fully stops),
 *  - an extra push toward the subject (8–18 %),
 *  - an arc around the subject that alternates direction shot to shot,
 *  - a slow "operator" float of a few centimetres.
 */
export const cameraAt = (t: number) => {
  const { shot, index, k } = shotAt(t);
  const kk = 0.5 * k + 0.5 * ease(k);
  const target = lerp3(shot.t0, shot.t1 ?? shot.t0, kk);
  const base = lerp3(shot.p0, shot.p1, kk);
  let off = new THREE.Vector3(base[0] - target[0], base[1] - target[1], base[2] - target[2]);
  const d = off.length();
  const push = d < 4 ? 0.08 : 0.18;
  off.multiplyScalar(1 - push * kk);
  const arcDeg = d < 4 ? 8 : 14;
  off = off.applyAxisAngle(new THREE.Vector3(0, 1, 0), ((arcDeg * Math.PI) / 180) * (index % 2 ? 1 : -1) * (kk - 0.5));
  const position: V3 = [
    target[0] + off.x + 0.04 * Math.sin(t * 0.9 + index),
    target[1] + off.y + 0.03 * Math.sin(t * 1.3 + index * 2),
    target[2] + off.z + 0.03 * Math.sin(t * 0.7 + index * 3),
  ];
  return { shot, position, target, fov: shot.fov ?? 38 };
};

// ---------------------------------------------------------------- characters as functions of time
export type Actor = { id: string; look: Look; pos: V3; rotY: number; rotZ?: number; lift?: number; expr: Expr; pose: Pose; number: number; set: "street" | "arena"; glow?: number };

const STAGE_Y = 0.5;
const PUSH = EV.push;
const VY = 4.8;
const VX = -4.6;
const G = 14;
const T_AIR = (2 * VY) / G;
const DECEL = 8;
const X0 = -1.4;
const X_LAND = X0 + VX * T_AIR;
const T_SLIDE = Math.abs(VX) / DECEL;
export const X_REST = X_LAND - (VX * VX) / (2 * DECEL);

/** Cubi on stage: shove → ballistic flight with tumble → slide → lie → get up → two hits. */
const cubiArena = (t: number): Partial<Actor> => {
  const a = (x: number, y: number, z: number): V3 => [ARENA[0] + x, ARENA[1] + y, ARENA[2] + z];
  if (t < at("push")) return { pos: a(-6.5, 0, 8.0), rotY: Math.atan2(6.5, -8.0), expr: t >= at("name", "mine") ? "shock" : "sad", pose: {} };
  const t0 = PUSH + 0.12;
  if (t < t0) return { pos: a(X0, STAGE_Y, 0), rotY: Math.PI / 2, expr: "sad", pose: {} };
  const tau = t - t0;
  const PIV = 0.9; // tumble / lie around the body centre
  const LOW = -0.65; // centre 0.25 m above the floor when lying
  if (tau < T_AIR) {
    const x = X0 + VX * tau;
    const y = STAGE_Y + VY * tau - (G * tau * tau) / 2 + LOW * easeOut(tau / T_AIR);
    return { pos: a(x, y, 0), rotY: Math.PI / 2, rotZ: (Math.PI / 2 + Math.PI * 2) * easeOut(tau / T_AIR), lift: PIV, expr: "shock", pose: { lie: 0.6 } };
  }
  const ts = tau - T_AIR;
  if (ts < T_SLIDE) {
    const x = X_LAND + VX * ts + (DECEL * ts * ts) / 2;
    return { pos: a(x, STAGE_Y + LOW, 0), rotY: Math.PI / 2, rotZ: Math.PI / 2, lift: PIV, expr: "sad", pose: { lie: 1 } };
  }
  if (t < EV.getUp) return { pos: a(X_REST, STAGE_Y + LOW, 0), rotY: Math.PI / 2, rotZ: Math.PI / 2, lift: PIV, expr: "sad", pose: { lie: 1 } };
  // get up: roll to knees, then stand
  const g = (t - EV.getUp) / 1.6;
  if (g < 1) {
    const r = ease(g * 2);
    const kn = g < 0.5 ? 1 : 1 - ease((g - 0.5) * 2);
    return { pos: a(X_REST, STAGE_Y + LOW * (1 - r), 0), rotY: Math.PI / 2, rotZ: (Math.PI / 2) * (1 - r), lift: PIV, expr: g < 0.6 ? "sad" : "determined", pose: { kneel: kn, lie: 1 - r } };
  }
  // hits: knocked back, recover
  const knock = (th: number) => {
    const d = t - th;
    if (d < 0 || d > 0.9) return { dx: 0, kneel: 0 };
    return { dx: -0.6 * Math.sin(Math.PI * Math.min(1, d / 0.9)), kneel: 0.6 * Math.sin(Math.PI * Math.min(1, d / 0.9)) };
  };
  const k1 = knock(EV.hit1 + 0.05);
  const k2 = knock(EV.hit2 + 0.05);
  const fist = t >= at("choice") && t < at("choice", "or") ? ease((t - at("choice")) / 0.25) : 0;
  const lookExit = t >= at("choice", "or") && t < EV.countdown ? -0.9 * ease((t - at("choice", "or")) / 0.4) : 0;
  return {
    pos: a(X_REST + k1.dx + k2.dx, STAGE_Y, 0),
    rotY: Math.PI / 2,
    expr: k1.kneel + k2.kneel > 0.1 ? "angry" : "determined",
    pose: { kneel: k1.kneel + k2.kneel, fist, headYaw: lookExit },
    glow: t >= EV.reveal ? clamp01((t - EV.reveal) / 3) : 0,
  };
};

const vexArena = (t: number): Partial<Actor> => {
  const a = (x: number, y: number, z: number): V3 => [ARENA[0] + x, ARENA[1] + y, ARENA[2] + z];
  const flex = t >= at("vex") && t < at("vex", "champion") + 1.0 ? ease((t - at("vex")) / 0.6) * (1 - ease((t - at("vex", "champion") - 0.6) / 0.4)) : 0;
  if (t < at("push")) return { pos: a(1.4, STAGE_Y, 0), rotY: -0.2, expr: t >= at("laugh") ? "laugh" : "smirk", pose: { flex } };
  const push = t >= PUSH ? Math.sin(Math.PI * clamp01((t - PUSH) / 0.45)) : 0;
  if (t < at("two") + 0.2) return { pos: a(1.4, STAGE_Y, 0), rotY: -Math.PI / 2, expr: "smirk", pose: { push, headYaw: t < PUSH ? 0.9 : 0.9 * (1 - clamp01((t - PUSH) / 0.3)) } };
  // closes the gap, then two punches; from the silence on, he trembles
  const go = ease((t - (at("two") + 0.2)) / (EV.hit1 - 0.25 - (at("two") + 0.2)));
  const x = lerp(1.4, X_REST + 1.35, go);
  const p1 = Math.sin(Math.PI * clamp01((t - (EV.hit1 - 0.08)) / 0.3));
  const p2 = Math.sin(Math.PI * clamp01((t - (EV.hit2 - 0.08)) / 0.3));
  const shaken = t >= EV.silent;
  return {
    pos: a(x, STAGE_Y, 0),
    rotY: -Math.PI / 2,
    expr: shaken ? "shock" : "angry",
    pose: { punch: Math.max(p1, p2), walk: go > 0 && go < 1 ? t * 14 : 0, tremble: shaken ? 1 : 0 },
  };
};

const STREET_WALKERS = (() => {
  const r = rng(77);
  const looks: Look[] = [];
  const out: { look: Look; x: number; z0: number; v: number; n: number; phase: number }[] = [];
  const tops = ["#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#8338ec", "#ff006e", "#3a86ff"];
  for (let i = 0; i < 8; i++) {
    const look: Look = {
      skin: ["#ffd2a8", "#e0ac69", "#c68b59", "#8d5524"][i % 4],
      top: tops[i % tops.length],
      legs: ["#2b2d42", "#3d5a80", "#495057"][i % 3],
      shoes: "#212529",
      hair: ["#111111", "#6f4518", "#e9c46a", "#b5651d"][Math.floor(r() * 4)],
      hairStyle: r() > 0.4 ? "flat" : "spiky",
    };
    looks.push(look);
    const n = [3, 27, 58, 7, 140, 310, 15, 870, 44, 9, 230, 66][i];
    out.push({ look, x: (r() > 0.5 ? 1 : -1) * (1.2 + r() * 2.6), z0: -34 + r() * 30, v: (i % 4 === 3 ? -1 : 1) * (0.35 + r() * 0.3), n, phase: r() * 6 });
  }
  return out;
})();

const streetActors = (t: number): Actor[] => {
  const vexZ = -14 + (t - at("champ")) * 1.0;
  const actors: Actor[] = STREET_WALKERS.map((w, i) => {
    const z = w.z0 + w.v * t;
    let x = w.x;
    // step aside when Vex comes close (after he appears)
    if (t > at("champ")) {
      const d = Math.abs(z - vexZ);
      const away = (1 - Math.min(1, d / 4)) * (Math.abs(x) < 3.2 ? 1 : 0);
      x = x + Math.sign(x || 1) * away * 2.0;
    }
    return { id: `w${i}`, look: w.look, pos: [x, 0, z] as V3, rotY: w.v > 0 ? 0 : Math.PI, expr: "neutral" as Expr, pose: { walk: t * 6 + w.phase, t }, number: w.n, set: "street" as const };
  });
  actors.push({ id: "passer", look: { ...LOOKS.cubi, top: "#ff006e", hairStyle: "flat", hair: "#111111" }, pos: [1.2, 0, -5.4], rotY: 0.3, expr: "neutral", pose: { t }, number: 58, set: "street" });
  actors.push({ id: "strong", look: { ...LOOKS.cop, top: "#8338ec", legs: "#2b2d42", hairStyle: "flat", hair: "#111111" }, pos: [-3.2, 0, -9.5], rotY: 0.5, expr: "smirk", pose: { flex: 0.8, t }, number: 870, set: "street" });
  actors.push({ id: "weak", look: { ...LOOKS.cubi, top: "#adb5bd", hairStyle: "flat", hair: "#b5651d" }, pos: [4.4, 0, -14.2], rotY: -0.4, expr: "sad", pose: { t, headPitch: 0.3 }, number: 8, set: "street" });
  actors.push({ id: "baker", look: LOOKS.baker, pos: [-4.6, 0.16, -6.0], rotY: 0.7, expr: "happy", pose: { t }, number: 12, set: "street" });
  actors.push({ id: "cop", look: LOOKS.cop, pos: [4.0, 0.16, -10.0], rotY: -0.6, expr: "neutral", pose: { t }, number: 140, set: "street" });
  actors.push({ id: "vex", look: LOOKS.vex, pos: [0, 0, t < at("champ") ? -40 : vexZ], rotY: 0, expr: "smirk", pose: { walk: t * 5, t }, number: 9999, set: "street" });
  actors.push({ id: "cubi", look: LOOKS.cubi, pos: [-3.6, 0.0, 2.0], rotY: 0.3, expr: "sad", pose: { kneel: 0.75, t, headPitch: 0.25 }, number: 1, set: "street" });
  return actors;
};

export const arenaTagMembers = 26;

export const actorsAt = (t: number): Actor[] => {
  const { shot } = shotAt(t);
  if (shot.set === "street") return streetActors(t);
  const c = cubiArena(t);
  const v = vexArena(t);
  return [
    { id: "cubi", look: LOOKS.cubi, number: heroNumber(t), set: "arena", ...c, pose: { ...c.pose, t } } as Actor,
    { id: "vex", look: LOOKS.vex, number: 9999, set: "arena", ...v, pose: { ...v.pose, t } } as Actor,
  ];
};

/** Arena screen: a pure function of time. */
const drawScreen = (t: number) => (ctx: CanvasRenderingContext2D, W: number, H: number) => {
  const red = t >= EV.flash;
  ctx.fillStyle = red ? "#2a0008" : "#0b0620";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const big = (txt: string, y: number, size0: number, color: string) => {
    ctx.font = `800 ${size0}px "Inter Tight"`;
    // portrait frames only see the middle of the screen: keep every line within 72 % of its width
    const size = Math.min(size0, (size0 * W * 0.72) / Math.max(1, ctx.measureText(txt).width));
    ctx.font = `800 ${size}px "Inter Tight"`;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = color;
    ctx.fillText(txt, W / 2, y);
    ctx.shadowBlur = 0;
  };
  if (t < at("name")) {
    big("THE RISING", H * 0.42, H * 0.26, "#ffcf5c");
    big("ONE DAY. NUMBERS CAN CHANGE.", H * 0.72, H * 0.08, "#c9b6ff");
  } else if (t < EV.flash) {
    const names = ["MARA 412", "DEX 77", "IVO 1,204", "LENA 38", "BOGS 5", "CUBI 1"];
    const settle = at("name", "mine") - 0.25;
    const name = t < settle ? names[Math.floor(t * 12) % (names.length - 1)] : names[names.length - 1];
    big(name, H * 0.48, H * 0.3, t < settle ? "#ffffff" : "#5ce1ff");
    big(t < settle ? "CHALLENGER…" : "CHALLENGER", H * 0.18, H * 0.09, "#ffcf5c");
  } else if (t < EV.choices) {
    big("MAKE YOUR CHOICE", H * 0.5, H * 0.17, "#ff3b5c");
  } else {
    big("HIT BACK", W > 0 ? H * 0.36 : 0, H * 0.18, "#ff3b5c");
    big("WALK AWAY", H * 0.62, H * 0.18, "#ffcf5c");
    if (t >= EV.countdown) {
      const left = Math.max(0, 10 - Math.floor(t - EV.countdown));
      big(`00:${String(left).padStart(2, "0")}`, H * 0.88, H * 0.11, "#ffffff");
    }
  }
};

export const Stage: React.FC<{ t: number }> = ({ t }) => {
  const cam = cameraAt(t);
  const members = CROWD;
  const set = cam.shot.set;
  const bounce = (t >= at("laugh") && t < at("push")) || (t >= at("fly") && t < at("stay")) ? 1 : t >= EV.silent ? 0 : 0.15;
  const screenKey = String(Math.floor(t * 12));
  const screen = useMemo(() => drawScreen(t), [screenKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const actors = actorsAt(t);
  const palette = set === "street" ? DUSK : NEON;
  const ambientAngle = (Math.PI * 2 * t) / 40;

  return (
    <>
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
      <PaletteEnvironment palette={palette} />
      <hemisphereLight args={[set === "street" ? "#ffd9b3" : "#9d7bff", "#1a1033", set === "street" ? 0.7 : 0.5]} />
      {set === "street" ? (
        <>
          <Backdrop palette={DUSK} angle={ambientAngle} strength={1.0} />
          <directionalLight position={[-12, 18, 10]} intensity={1.8} color="#ffc18a" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-0.0004} />
          <group>
            <Street t={t} />
          </group>
        </>
      ) : (
        <>
          <Backdrop palette={NEON} angle={ambientAngle} strength={0.6} />
          <group position={ARENA}>
            <spotLight position={[0, 16, 8]} angle={0.45} penumbra={0.6} intensity={300} color="#fff1d6" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} target-position={[0, 0, 0]} />
            <pointLight position={[-8, 6, 6]} intensity={40} color="#c04bff" />
            <pointLight position={[8, 6, 6]} intensity={40} color="#5ce1ff" />
            <ArenaSet t={t} members={members} bounce={bounce} screen={screen} screenKey={screenKey} beamAngle={t * 0.8} />
          </group>
        </>
      )}
      {actors.map((ac) => (
        <group key={ac.id} position={ac.pos} rotation={[0, ac.rotY, 0]}>
          {/* tumble / lie: rotate backwards about the figure's own left-right axis, around a pivot at `lift` */}
          <group position={[0, ac.lift ?? 0, 0]} rotation={[-(ac.rotZ ?? 0), 0, 0]}>
            <group position={[0, -(ac.lift ?? 0), 0]}>
              <Figure look={ac.look} expr={ac.expr} pose={ac.pose} />
            </group>
          </group>
          {(ac.glow ?? 0) > 0 && (
            <mesh position={[0, 1.2, 0]}>
              <sphereGeometry args={[1.6, 32, 16]} />
              <meshBasicMaterial color={new THREE.Color("#5ce1ff").multiplyScalar(0.25 * (ac.glow ?? 0))} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
};

export { SHOTS, tagHeight };
