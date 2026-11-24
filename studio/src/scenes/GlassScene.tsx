import React, { useMemo } from "react";
import * as THREE from "three";
import type { Palette } from "../brief";
import { rng, TAU } from "../lib/loop";
import { Backdrop, CameraRig, PaletteEnvironment } from "./shared";

/** Iridescent, dispersive glass tinted by the palette. */
export const GlassMaterial: React.FC<{ palette: Palette; envMapIntensity?: number }> = ({
  palette,
  envMapIntensity = 1.5,
}) => (
  <meshPhysicalMaterial
    color={new THREE.Color(palette.c).lerp(new THREE.Color("#ffffff"), 0.75)}
    transmission={1}
    thickness={1.6}
    roughness={0.06}
    ior={1.5}
    dispersion={0.35}
    iridescence={1}
    iridescenceIOR={1.45}
    iridescenceThicknessRange={[120, 820]}
    clearcoat={1}
    clearcoatRoughness={0.04}
    envMapIntensity={envMapIntensity}
    attenuationColor={new THREE.Color(palette.a)}
    attenuationDistance={6}
  />
);

export const Satellites: React.FC<{
  palette: Palette;
  angle: number;
  seed: number;
  /** 0..1 per satellite (staggered entrance); defaults to fully in */
  appear?: (i: number) => number;
}> = ({ palette, angle, seed, appear }) => {
  const satellites = useMemo(() => {
    const r = rng(seed);
    return new Array(7).fill(0).map((_, i) => ({
      radius: 2.1 + r() * 1.3,
      height: 0.6 + r() * 1.1,
      size: 0.12 + r() * 0.22,
      phase: r() * TAU,
      kOrbit: i % 3 === 0 ? -1 : 1, // integer orbit frequency, direction varies
      kBob: 1 + Math.floor(r() * 3),
      chrome: i % 2 === 0,
      tint: [palette.a, palette.b, palette.c][i % 3],
    }));
  }, [seed, palette]);
  return (
    <>
      {satellites.map((s, i) => {
        const a = angle * s.kOrbit + s.phase;
        const k = appear ? appear(i) : 1;
        if (k <= 0.001) return null;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * s.radius,
              Math.sin(angle * s.kBob + s.phase) * s.height,
              Math.sin(a) * s.radius * 0.7,
            ]}
            scale={s.size * k}
          >
            <sphereGeometry args={[1, 48, 48]} />
            {s.chrome ? (
              <meshPhysicalMaterial
                color={s.tint}
                metalness={1}
                roughness={0.12}
                clearcoat={1}
                envMapIntensity={1.6}
              />
            ) : (
              <meshPhysicalMaterial
                color="#ffffff"
                transmission={1}
                thickness={0.6}
                roughness={0.03}
                ior={1.4}
                iridescence={0.8}
                envMapIntensity={1.4}
              />
            )}
          </mesh>
        );
      })}
    </>
  );
};

/** Floating light dust in the background. */
export const Dust: React.FC<{ palette: Palette; angle: number; seed: number; opacity?: number }> = ({
  palette,
  angle,
  seed,
  opacity = 1,
}) => {
  const dust = useMemo(() => {
    const r = rng(seed * 31 + 3);
    return new Array(46).fill(0).map(() => ({
      base: new THREE.Vector3((r() - 0.5) * 9, (r() - 0.5) * 12, -2 - r() * 6),
      amp: 0.15 + r() * 0.4,
      phase: r() * TAU,
      size: 0.015 + r() * 0.035,
      k: 1 + Math.floor(r() * 2),
    }));
  }, [seed]);
  if (opacity <= 0.001) return null;
  return (
    <>
      {dust.map((d, i) => (
        <mesh
          key={i}
          position={[
            d.base.x + Math.sin(angle * d.k + d.phase) * d.amp,
            d.base.y + Math.cos(angle * d.k + d.phase) * d.amp,
            d.base.z,
          ]}
          scale={d.size * opacity * (0.75 + 0.25 * Math.sin(angle * 2 + d.phase))}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={new THREE.Color(palette.c).multiplyScalar(2.2)} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
};

/**
 * "Liquid glass": an iridescent, dispersive glass knot with chrome and glass
 * satellites on integer-frequency orbits. Reads as a premium product shot.
 */
export const GlassScene: React.FC<{
  palette: Palette;
  angle: number; // loop phase 0..2π
  seed: number;
}> = ({ palette, angle, seed }) => {
  const heroY = -0.55;
  // Gentle camera drift: one full ellipse per loop.
  const camPos: [number, number, number] = [
    Math.sin(angle) * 1.1,
    0.35 + Math.sin(angle * 2) * 0.18,
    10.5 + Math.cos(angle) * 0.4,
  ];

  return (
    <>
      <CameraRig position={camPos} target={[0, 0, 0]} fov={34} />
      <PaletteEnvironment palette={palette} />
      <Backdrop
        palette={palette}
        angle={angle}
        strength={1.1}
        glow={{ dir: [0, -0.05, -1], width: 0.22, strength: 1.25 }}
      />
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} />
      <directionalLight position={[-5, -2, 3]} intensity={0.8} color={palette.b} />

      {/* Hero knot – exactly one full turn (plus a tilt wobble) per loop */}
      <group position={[0, heroY, 0]} scale={0.62}>
        <mesh
          rotation={[0.35 + Math.sin(angle) * 0.18, angle, Math.cos(angle * 2) * 0.12]}
          scale={1 + Math.sin(angle * 2) * 0.025}
        >
          <torusKnotGeometry args={[1.15, 0.4, 360, 72, 2, 3]} />
          <GlassMaterial palette={palette} />
        </mesh>
        <Satellites palette={palette} angle={angle} seed={seed} />
      </group>
      <Dust palette={palette} angle={angle} seed={seed} />
    </>
  );
};
