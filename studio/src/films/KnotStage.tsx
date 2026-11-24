import React, { useMemo } from "react";
import * as THREE from "three";
import type { Palette } from "../brief";
import { TAU } from "../lib/loop";
import { ToonMesh } from "../scenes/ClayScene";
import { Dust, GlassMaterial, Satellites } from "../scenes/GlassScene";
import { Backdrop, CameraRig, Halo, PaletteEnvironment } from "../scenes/shared";
import { CAMERA, DUR, HERO, PANELS_AT, type Look } from "./howItsMade";

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Ease-out with a small overshoot – for things that "land". */
const easeOutBack = (x: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Camera position from the keyed spherical path (pure function of t). */
export const cameraAt = (t: number) => {
  // segment = last key at or before t; a key marked `cut` is jumped to, never blended into
  let i = 0;
  while (i < CAMERA.length - 2 && t >= CAMERA[i + 1].t) i++;
  const a = CAMERA[i];
  const b = CAMERA[i + 1];
  const k = b.cut ? 0 : easeInOut(clamp01((t - a.t) / (b.t - a.t)));
  const lerp = (x: number, y: number) => x + (y - x) * k;
  const az = (lerp(a.az, b.az) * Math.PI) / 180;
  const el = (lerp(a.el, b.el) * Math.PI) / 180;
  const dist = lerp(a.dist, b.dist);
  const position: [number, number, number] = [
    Math.sin(az) * Math.cos(el) * dist,
    Math.sin(el) * dist,
    Math.cos(az) * Math.cos(el) * dist,
  ];
  return { position, fov: lerp(a.fov, b.fov) };
};

const dullPalette = (p: Palette): Palette => ({ ...p, a: "#3a3a44", b: "#2c2c34", c: "#4a4a55", bg: "#121216" });

/**
 * The film's one constant: the (2,3) torus knot, rendered in the look of the
 * current chapter. Everything is a pure function of global time `t`.
 */
export const KnotStage: React.FC<{ look: Look; t: number; palette: Palette; seed: number }> = ({
  look,
  t,
  palette,
  seed,
}) => {
  const cam = cameraAt(t);
  // the backdrop glow always sits behind the knot as seen from the camera,
  // so the glass always has something bright to refract
  const cl = Math.hypot(...cam.position);
  const glowDir: [number, number, number] = [
    -cam.position[0] / cl,
    -0.05 - cam.position[1] / cl,
    -cam.position[2] / cl,
  ];
  const angle = (TAU * t) / (DUR / 4); // background flow, 4 cycles per film → loops
  const knotRot: [number, number, number] = [
    0.35 + Math.sin((TAU * t) / DUR) * 0.18,
    (TAU * t) / (DUR / 2), // two full turns per film → loops
    Math.cos((TAU * t * 2) / DUR) * 0.12,
  ];
  const geoHi = useMemo(() => new THREE.TorusKnotGeometry(1.15, 0.4, 360, 72, 2, 3), []);
  const geoWire = useMemo(() => new THREE.TorusKnotGeometry(1.15, 0.4, 120, 16, 2, 3), []);

  const lit = PANELS_AT.map((at) => clamp01((t - at) / 0.35)).reduce((a, b) => a + b, 0) / PANELS_AT.length;
  const heroIn = (i: number) => easeOutBack(clamp01((t - HERO - 0.12 - i * 0.07) / 0.5));
  const satAppear = look === "final" ? undefined : look === "glass" ? heroIn : () => 0;

  return (
    <>
      <CameraRig position={cam.position} target={[0, 0, 0]} fov={cam.fov} />
      <ambientLight intensity={look === "grey" ? 0.35 : 0.15} />
      <directionalLight position={[3, 6, 5]} intensity={look === "grey" ? 2.2 : 1.6} />
      {look !== "grey" && <directionalLight position={[-5, -2, 3]} intensity={0.8} color={palette.b} />}

      {(look === "lit" || look === "glass" || look === "final") && <PaletteEnvironment palette={palette} />}

      {look === "wire" && (
        <>
          <Backdrop palette={palette} angle={angle} strength={0.25} />
          <gridHelper
            args={[40, 80, palette.a, "#231f45"]}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -6]}
          />
        </>
      )}
      {look === "grey" && <Backdrop palette={dullPalette(palette)} angle={angle} strength={0.5} />}
      {look === "toon" && (
        <>
          <Backdrop palette={palette} angle={angle} strength={0.75} />
          <Halo palette={palette} angle={angle} position={[0, -0.55, -4]} size={7} intensity={0.45} />
        </>
      )}
      {look === "lit" && <Backdrop palette={palette} angle={angle} strength={0.35 + 0.4 * lit} />}
      {(look === "glass" || look === "final") && (
        <Backdrop
          palette={palette}
          angle={angle}
          strength={1.1}
          glow={{ dir: glowDir, width: 0.22, strength: 1.25 }}
        />
      )}

      <group position={[0, -0.55, 0]} scale={0.62}>
        <group rotation={knotRot}>
          {look === "wire" && (
            <mesh geometry={geoWire}>
              <meshBasicMaterial color={palette.b} wireframe toneMapped={false} />
            </mesh>
          )}
          {look === "grey" && (
            <mesh geometry={geoHi}>
              <meshStandardMaterial color="#8d8d93" roughness={0.55} metalness={0} />
            </mesh>
          )}
          {look === "toon" && (
            <ToonMesh geometry={geoHi} color={palette.a} palette={palette} angle={angle} outline={0.04} />
          )}
          {look === "lit" && (
            <mesh geometry={geoHi}>
              <meshPhysicalMaterial
                color="#e9e9f2"
                metalness={1}
                roughness={0.07}
                clearcoat={1}
                envMapIntensity={0.12 + 1.5 * lit}
              />
            </mesh>
          )}
          {(look === "glass" || look === "final") && (
            <mesh geometry={geoHi}>
              <GlassMaterial palette={palette} />
            </mesh>
          )}
        </group>
        <Satellites palette={palette} angle={angle} seed={seed} appear={satAppear} />
      </group>

      {(look === "glass" || look === "final") && (
        <Dust palette={palette} angle={angle} seed={seed} opacity={look === "final" ? 1 : clamp01((t - HERO) / 1.2)} />
      )}
    </>
  );
};
