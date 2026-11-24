import React from "react";
import { Box } from "../inThisWorld/Voxel";

/**
 * Blocky cast with faces that act. Original designs; proportions chosen for
 * readability on a phone: big head, clear brows and mouth.
 */
export type Expr = "neutral" | "happy" | "sad" | "shock" | "angry" | "smirk" | "determined" | "laugh";

export type Look = {
  skin: string;
  top: string;
  legs: string;
  shoes: string;
  hair: string;
  hairStyle: "spiky" | "flat" | "cap" | "chef" | "none";
  accent?: string; // trim / tie / badge colour
  scale?: number;
};

export const LOOKS: Record<string, Look> = {
  cubi: { skin: "#ffd2a8", top: "#2ec4b6", legs: "#2b2d42", shoes: "#14213d", hair: "#6f4518", hairStyle: "spiky", accent: "#ff9f1c" },
  vex: { skin: "#e0ac69", top: "#f8f9fa", legs: "#f8f9fa", shoes: "#d4a017", hair: "#111111", hairStyle: "flat", accent: "#d4a017", scale: 1.15 },
  baker: { skin: "#f1c27d", top: "#ffffff", legs: "#495057", shoes: "#343a40", hair: "#ffffff", hairStyle: "chef", accent: "#e9c46a" },
  cop: { skin: "#8d5524", top: "#1d3557", legs: "#1d3557", shoes: "#111111", hair: "#1d3557", hairStyle: "cap", accent: "#ffd166" },
};

export type Pose = {
  walk?: number; // phase (radians)
  push?: number; // 0..1 both arms forward
  punch?: number; // 0..1 right arm forward
  fist?: number; // 0..1 right arm bent, fist up
  kneel?: number; // 0..1
  lie?: number; // 0..1 lying on the back (handled by caller rotation) – arms out
  flex?: number; // 0..1 both arms up flexing
  tremble?: number; // 0..1 shaking
  headYaw?: number;
  headPitch?: number;
  t?: number; // time, for breathing/blinks/tremble
};

const FaceBox: React.FC<{ p: [number, number, number]; s: [number, number, number]; c: string; r?: number }> = ({ p, s, c, r = 0 }) => (
  <Box p={p} s={s} c={c} r={[0, 0, r]} rough={0.6} />
);

const Face: React.FC<{ expr: Expr; t: number }> = ({ expr, t }) => {
  const ink = "#1b1b2f";
  const blink = ((t * 0.43) % 1) < 0.04 ? 0.15 : 1;
  const z = 0.256;
  const eyeH = (expr === "shock" ? 0.15 : expr === "laugh" || expr === "happy" ? 0.06 : 0.12) * blink;
  const browTilt = expr === "angry" || expr === "determined" ? 0.35 : expr === "sad" ? -0.3 : expr === "shock" ? -0.1 : 0;
  const browY = expr === "shock" ? 0.17 : expr === "angry" || expr === "determined" ? 0.11 : 0.14;
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <FaceBox p={[s * 0.12, 0.04, z]} s={[expr === "shock" ? 0.12 : 0.1, eyeH, 0.02]} c={ink} />
          {blink === 1 && expr !== "laugh" && <FaceBox p={[s * 0.12 + 0.025, 0.04 + eyeH * 0.25, z + 0.012]} s={[0.03, 0.03, 0.01]} c="#ffffff" />}
          <FaceBox p={[s * 0.12, browY, z]} s={[0.13, 0.03, 0.02]} c={ink} r={s * browTilt} />
        </group>
      ))}
      {expr === "happy" || expr === "laugh" ? (
        <>
          <FaceBox p={[0, -0.11, z]} s={[0.18, expr === "laugh" ? 0.08 : 0.03, 0.02]} c={expr === "laugh" ? "#6a040f" : ink} />
          <FaceBox p={[-0.1, -0.09, z]} s={[0.03, 0.04, 0.02]} c={ink} />
          <FaceBox p={[0.1, -0.09, z]} s={[0.03, 0.04, 0.02]} c={ink} />
        </>
      ) : expr === "sad" ? (
        <>
          <FaceBox p={[0, -0.13, z]} s={[0.14, 0.03, 0.02]} c={ink} />
          <FaceBox p={[-0.08, -0.15, z]} s={[0.03, 0.04, 0.02]} c={ink} />
          <FaceBox p={[0.08, -0.15, z]} s={[0.03, 0.04, 0.02]} c={ink} />
        </>
      ) : expr === "shock" ? (
        <FaceBox p={[0, -0.13, z]} s={[0.08, 0.1, 0.02]} c="#6a040f" />
      ) : expr === "smirk" ? (
        <FaceBox p={[0.03, -0.12, z]} s={[0.15, 0.03, 0.02]} c={ink} r={0.18} />
      ) : expr === "angry" ? (
        <FaceBox p={[0, -0.13, z]} s={[0.16, 0.05, 0.02]} c="#f8f9fa" />
      ) : (
        <FaceBox p={[0, -0.12, z]} s={[expr === "determined" ? 0.16 : 0.12, 0.03, 0.02]} c={ink} />
      )}
    </group>
  );
};

const Hair: React.FC<{ look: Look }> = ({ look }) => {
  const c = look.hair;
  switch (look.hairStyle) {
    case "spiky":
      return (
        <group position={[0, 0.27, 0]}>
          <Box s={[0.54, 0.1, 0.54]} c={c} />
          {[
            [-0.17, 0.1, 0.1, 0.3],
            [0, 0.12, 0.14, -0.1],
            [0.17, 0.1, 0.05, -0.35],
            [-0.08, 0.1, -0.15, 0.2],
            [0.1, 0.09, -0.12, -0.2],
          ].map(([x, y, z, r], i) => (
            <Box key={i} p={[x, y, z]} s={[0.16, 0.18, 0.16]} c={c} r={[0.3 * (z > 0 ? 1 : -1), 0, r]} />
          ))}
          <Box p={[0, -0.12, -0.24]} s={[0.54, 0.3, 0.08]} c={c} />
        </group>
      );
    case "flat":
      return (
        <group position={[0, 0.27, 0]}>
          <Box s={[0.56, 0.14, 0.56]} c={c} />
          <Box p={[0.05, 0.04, 0.2]} s={[0.4, 0.12, 0.2]} c={c} r={[-0.3, 0, 0]} />
          <Box p={[0, -0.12, -0.25]} s={[0.56, 0.3, 0.08]} c={c} />
        </group>
      );
    case "cap":
      return (
        <group position={[0, 0.27, 0]}>
          <Box s={[0.56, 0.16, 0.56]} c={c} />
          <Box p={[0, -0.05, 0.36]} s={[0.5, 0.04, 0.22]} c={c} />
          <Box p={[0, 0.02, 0.285]} s={[0.12, 0.1, 0.02]} c={look.accent ?? "#ffd166"} />
        </group>
      );
    case "chef":
      return (
        <group position={[0, 0.3, 0]}>
          <Box s={[0.5, 0.12, 0.5]} c="#ffffff" />
          <Box p={[0, 0.2, 0]} s={[0.62, 0.32, 0.62]} c="#ffffff" />
        </group>
      );
    default:
      return null;
  }
};

/** Origin at the feet, facing +z. */
export const Figure: React.FC<{ look: Look; expr?: Expr; pose?: Pose }> = ({ look, expr = "neutral", pose = {} }) => {
  const t = pose.t ?? 0;
  const w = pose.walk ?? 0;
  const swing = Math.sin(w) * 0.6;
  const bob = Math.abs(Math.sin(w)) * 0.05;
  const breathe = Math.sin(t * 2.2) * 0.012;
  const kneel = pose.kneel ?? 0;
  const push = pose.push ?? 0;
  const punch = pose.punch ?? 0;
  const fist = pose.fist ?? 0;
  const flex = pose.flex ?? 0;
  const lie = pose.lie ?? 0;
  const tr = (pose.tremble ?? 0) * 0.025;
  const shakeX = tr * Math.sin(t * 61);
  const shakeY = tr * Math.sin(t * 47 + 1);
  const s = look.scale ?? 1;

  // arm angles (x = forward/back, z = out to the side)
  const leftX = -swing * (1 - push) - push * 1.45 - flex * 2.6 - lie * 0.2;
  const rightX = swing * (1 - push - punch - fist) - push * 1.45 - punch * 1.55 - fist * 2.0 - flex * 2.6 - lie * 0.2;
  const leftZ = 0.08 + flex * 0.5 + lie * 1.1;
  const rightZ = -0.08 - flex * 0.5 - lie * 1.1;

  return (
    <group scale={s} position={[shakeX, bob - kneel * 0.42, 0]}>
      {/* legs */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.14, 0.66, 0]} rotation={[side * swing - kneel * (side < 0 ? 1.45 : 0.2), 0, 0]}>
          <Box p={[0, -0.3, 0]} s={[0.24, 0.6, 0.26]} c={look.legs} />
          <Box p={[0, -0.62, 0.04]} s={[0.26, 0.1, 0.32]} c={look.shoes} />
        </group>
      ))}
      <group position={[0, breathe + shakeY, 0]} rotation={[kneel * 0.25 - punch * 0.15 + push * 0.12, 0, 0]}>
        {/* torso */}
        <Box p={[0, 0.98, 0]} s={[0.6, 0.64, 0.34]} c={look.top} />
        {look.accent && <Box p={[0, 1.02, 0.175]} s={[0.08, 0.44, 0.02]} c={look.accent} />}
        {/* arms */}
        <group position={[-0.39, 1.24, 0]} rotation={[leftX, 0, leftZ]}>
          <Box p={[0, -0.27, 0]} s={[0.18, 0.56, 0.2]} c={look.top} />
          <Box p={[0, -0.59, 0]} s={[0.18, 0.12, 0.2]} c={look.skin} />
        </group>
        <group position={[0.39, 1.24, 0]} rotation={[rightX, 0, rightZ]}>
          <Box p={[0, -0.27, 0]} s={[0.18, 0.56, 0.2]} c={look.top} />
          <Box p={[0, -0.59, 0]} s={[0.2, 0.14, 0.22]} c={look.skin} />
        </group>
        {/* head */}
        <group position={[0, 1.6, 0]} rotation={[pose.headPitch ?? 0, pose.headYaw ?? 0, 0]}>
          <Box s={[0.52, 0.5, 0.5]} c={look.skin} />
          <Face expr={expr} t={t} />
          <Hair look={look} />
        </group>
      </group>
    </group>
  );
};

/** Height of the number tag above a figure's feet. */
export const tagHeight = (look: Look) => 2.35 * (look.scale ?? 1);
