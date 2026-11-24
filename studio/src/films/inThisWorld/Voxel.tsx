import React from "react";

/**
 * Original voxel ("made of cubes") cast and props for the "În lumea asta…"
 * series. Everything is built from boxes; poses are plain numbers so the
 * caller can drive them from time.
 */

type V3 = [number, number, number];

export const Box: React.FC<{
  p?: V3;
  s: V3;
  c: string;
  r?: V3;
  rough?: number;
  emissive?: string;
}> = ({ p = [0, 0, 0], s, c, r, rough = 0.85, emissive }) => (
  <mesh position={p} rotation={r} castShadow receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={rough} emissive={emissive ?? "#000000"} emissiveIntensity={emissive ? 1 : 0} />
  </mesh>
);

export type Pose = {
  walk?: number; // walk-cycle phase in radians (0 = standing)
  armUp?: number; // 0..1: right arm raised to grab something above
  blink?: number; // 0..1 eyelid
  look?: number; // head yaw in radians
};

export type Outfit = { skin: string; top: string; legs: string; hat?: string; shoes: string };

export const CUBI: Outfit = { skin: "#ffd2a8", top: "#2ec4b6", legs: "#3d5a80", hat: "#ff9f1c", shoes: "#22223b" };
export const NEIGHBOUR: Outfit = { skin: "#c68b59", top: "#e63946", legs: "#4a4e69", shoes: "#22223b" };

/** Cube person, ~1.7 units tall, origin at the feet. */
export const CubePerson: React.FC<{ outfit: Outfit; pose?: Pose }> = ({ outfit, pose = {} }) => {
  const w = pose.walk ?? 0;
  const swing = Math.sin(w) * 0.55;
  const bob = Math.abs(Math.sin(w)) * 0.05;
  const armUp = pose.armUp ?? 0;
  const blink = pose.blink ?? 0;
  return (
    <group position={[0, bob, 0]}>
      {/* legs (pivot at hip) */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.13, 0.62, 0]} rotation={[side * swing, 0, 0]}>
          <Box p={[0, -0.27, 0]} s={[0.22, 0.54, 0.24]} c={outfit.legs} />
          <Box p={[0, -0.57, 0.03]} s={[0.24, 0.1, 0.3]} c={outfit.shoes} />
        </group>
      ))}
      {/* body */}
      <Box p={[0, 0.9, 0]} s={[0.52, 0.58, 0.32]} c={outfit.top} />
      {/* arms (pivot at shoulder) */}
      <group position={[-0.34, 1.13, 0]} rotation={[-swing, 0, 0.06]}>
        <Box p={[0, -0.24, 0]} s={[0.16, 0.5, 0.18]} c={outfit.top} />
        <Box p={[0, -0.53, 0]} s={[0.16, 0.12, 0.18]} c={outfit.skin} />
      </group>
      <group position={[0.34, 1.13, 0]} rotation={[swing * (1 - armUp) - armUp * 2.9, 0, -0.06 - armUp * 0.15]}>
        <Box p={[0, -0.24, 0]} s={[0.16, 0.5, 0.18]} c={outfit.top} />
        <Box p={[0, -0.53, 0]} s={[0.16, 0.12, 0.18]} c={outfit.skin} />
      </group>
      {/* head */}
      <group position={[0, 1.45, 0]} rotation={[0, pose.look ?? 0, 0]}>
        <Box s={[0.5, 0.46, 0.46]} c={outfit.skin} />
        {/* eyes: square pupils with a highlight */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.12, 0.03, 0.235]}>
            <Box s={[0.1, 0.12 * (1 - blink * 0.85), 0.02]} c="#1b1b2f" />
            <Box p={[0.025, 0.03, 0.012]} s={[0.03, 0.03 * (1 - blink), 0.01]} c="#ffffff" />
          </group>
        ))}
        <Box p={[0, -0.12, 0.235]} s={[0.14, 0.03, 0.02]} c="#b5654a" />
        {outfit.hat && (
          <>
            <Box p={[0, 0.27, 0]} s={[0.54, 0.12, 0.5]} c={outfit.hat} />
            <Box p={[0, 0.36, 0]} s={[0.12, 0.08, 0.12]} c="#ffffff" />
          </>
        )}
      </group>
    </group>
  );
};

/** Bobo, the cube dog. Origin at the paws, facing +z. */
export const CubeDog: React.FC<{ walk?: number; wag?: number; sit?: number; wink?: number }> = ({
  walk = 0,
  wag = 0,
  sit = 0,
  wink = 0,
}) => {
  const swing = Math.sin(walk) * 0.5;
  const body = "#f2e3c6";
  const patch = "#9c6644";
  return (
    <group>
      {/* legs */}
      {[
        [-0.15, 0.25],
        [0.15, 0.25],
        [-0.15, -0.25],
        [0.15, -0.25],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.28, z]} rotation={[(i % 2 === 0 ? 1 : -1) * swing * (1 - sit), 0, 0]}>
          <Box p={[0, -0.14, 0]} s={[0.12, 0.28 * (z < 0 ? 1 - sit * 0.6 : 1), 0.12]} c={body} />
        </group>
      ))}
      {/* body tilts back when sitting */}
      <group position={[0, 0.42 - sit * 0.08, 0]} rotation={[-sit * 0.45, 0, 0]}>
        <Box s={[0.42, 0.3, 0.68]} c={body} />
        <Box p={[0.12, 0.08, -0.1]} s={[0.2, 0.16, 0.26]} c={patch} />
        {/* tail */}
        <group position={[0, 0.12, -0.34]} rotation={[0.6, Math.sin(wag) * 0.7, 0]}>
          <Box p={[0, 0.12, 0]} s={[0.08, 0.26, 0.08]} c={patch} />
        </group>
      </group>
      {/* head */}
      <group position={[0, 0.72 + sit * 0.04, 0.38]}>
        <Box s={[0.4, 0.36, 0.36]} c={body} />
        <Box p={[0, -0.06, 0.22]} s={[0.22, 0.16, 0.12]} c={body} />
        <Box p={[0, -0.02, 0.29]} s={[0.08, 0.06, 0.04]} c="#1b1b2f" />
        {/* ears */}
        {[-1, 1].map((side) => (
          <Box key={side} p={[side * 0.2, 0.08, -0.02]} s={[0.06, 0.22, 0.14]} c={patch} />
        ))}
        {/* eyes – the right one winks */}
        <Box p={[-0.1, 0.06, 0.185]} s={[0.07, 0.08, 0.02]} c="#1b1b2f" />
        <Box p={[0.1, 0.06, 0.185]} s={[0.07, 0.08 * (1 - wink * 0.85), 0.02]} c="#1b1b2f" />
      </group>
    </group>
  );
};

export const House: React.FC<{ p: V3; wall: string; roof: string; h?: number; anchors?: boolean }> = ({
  p,
  wall,
  roof,
  h = 2.4,
  anchors = true,
}) => (
  <group position={p}>
    <Box p={[0, h / 2, 0]} s={[2.4, h, 2.2]} c={wall} />
    {/* stepped voxel roof */}
    <Box p={[0, h + 0.2, 0]} s={[2.7, 0.4, 2.5]} c={roof} />
    <Box p={[0, h + 0.55, 0]} s={[2.0, 0.3, 1.8]} c={roof} />
    <Box p={[0, h + 0.82, 0]} s={[1.2, 0.24, 1.0]} c={roof} />
    {/* door + windows */}
    <Box p={[0, 0.55, 1.11]} s={[0.55, 1.1, 0.04]} c="#5c3d2e" />
    {[-0.75, 0.75].map((x) => (
      <Box key={x} p={[x, h * 0.62, 1.11]} s={[0.5, 0.5, 0.04]} c="#ffe8a3" emissive="#6b5320" />
    ))}
    {/* the "ancore": chains from the roof corners into the ground */}
    {anchors &&
      [-1, 1].map((side) => (
        <group key={side}>
          {new Array(6).fill(0).map((_, i) => (
            <Box
              key={i}
              p={[side * 1.32, h - 0.05 - i * (h / 6), 1.18]}
              s={[0.09, 0.16, 0.09]}
              c={i % 2 ? "#6c757d" : "#adb5bd"}
              rough={0.4}
            />
          ))}
          <Box p={[side * 1.32, 0.05, 1.18]} s={[0.3, 0.1, 0.3]} c="#495057" />
        </group>
      ))}
  </group>
);

export const Tree: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <group scale={s}>
    <Box p={[0, 0.6, 0]} s={[0.3, 1.2, 0.3]} c="#7f5539" />
    <Box p={[0, 1.55, 0]} s={[1.3, 0.9, 1.3]} c="#52b788" />
    <Box p={[0.15, 2.2, -0.1]} s={[0.9, 0.6, 0.9]} c="#74c69d" />
  </group>
);

export const Car: React.FC<{ c: string }> = ({ c }) => (
  <group>
    <Box p={[0, 0.38, 0]} s={[1.5, 0.42, 0.8]} c={c} rough={0.5} />
    <Box p={[-0.05, 0.75, 0]} s={[0.85, 0.36, 0.74]} c={c} rough={0.5} />
    <Box p={[0.38, 0.75, 0]} s={[0.04, 0.28, 0.66]} c="#cfe8ff" emissive="#22303f" />
    {[
      [-0.45, 0.42],
      [0.45, 0.42],
      [-0.45, -0.42],
      [0.45, -0.42],
    ].map(([x, z], i) => (
      <Box key={i} p={[x, 0.16, z]} s={[0.32, 0.32, 0.1]} c="#212529" />
    ))}
  </group>
);

export const Bench: React.FC = () => (
  <group>
    <Box p={[0, 0.42, 0]} s={[1.3, 0.1, 0.42]} c="#bc6c25" />
    <Box p={[0, 0.72, -0.18]} s={[1.3, 0.36, 0.08]} c="#bc6c25" />
    {[-0.55, 0.55].map((x) => (
      <Box key={x} p={[x, 0.2, 0]} s={[0.08, 0.4, 0.38]} c="#343a40" />
    ))}
  </group>
);

export const LampPost: React.FC = () => (
  <group>
    <Box p={[0, 0.06, 0]} s={[0.36, 0.12, 0.36]} c="#343a40" />
    <Box p={[0, 1.4, 0]} s={[0.14, 2.7, 0.14]} c="#495057" rough={0.5} />
    <Box p={[0, 2.82, 0]} s={[0.4, 0.28, 0.4]} c="#fff3bf" emissive="#ffd43b" />
  </group>
);

export const ClockTower: React.FC<{ hours: number }> = ({ hours }) => {
  const minuteA = -(hours % 1) * Math.PI * 2;
  const hourA = -((hours % 12) / 12) * Math.PI * 2;
  return (
    <group>
      <Box p={[0, 2.8, 0]} s={[1.6, 5.6, 1.6]} c="#e9c46a" />
      <Box p={[0, 5.85, 0]} s={[1.9, 0.5, 1.9]} c="#264653" />
      <Box p={[0, 6.4, 0]} s={[1.3, 0.6, 1.3]} c="#264653" />
      <Box p={[0, 6.95, 0]} s={[0.6, 0.5, 0.6]} c="#264653" />
      {/* clock face */}
      <Box p={[0, 4.6, 0.81]} s={[1.2, 1.2, 0.04]} c="#fdfcdc" emissive="#3a3a2a" />
      {[0, 1, 2, 3].map((k) => (
        <Box key={k} p={[Math.sin((k * Math.PI) / 2) * 0.48, 4.6 + Math.cos((k * Math.PI) / 2) * 0.48, 0.84]} s={[0.08, 0.08, 0.02]} c="#264653" />
      ))}
      <group position={[0, 4.6, 0.85]} rotation={[0, 0, minuteA]}>
        <Box p={[0, 0.24, 0]} s={[0.06, 0.5, 0.02]} c="#1b1b2f" />
      </group>
      <group position={[0, 4.6, 0.86]} rotation={[0, 0, hourA]}>
        <Box p={[0, 0.16, 0]} s={[0.08, 0.34, 0.02]} c="#e63946" />
      </group>
    </group>
  );
};
