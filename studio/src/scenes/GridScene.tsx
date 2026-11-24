import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Palette } from "../brief";
import { rng } from "../lib/loop";
import { Backdrop, CameraRig, PaletteEnvironment } from "./shared";

/**
 * "Kinetic sculpture": a field of glossy rounded pillars driven by two
 * interfering ripples, with a chrome ball surfing the wave. Satisfying-loop
 * content in the style of high-end studio idents.
 */
const N = 11;
const CELL = 0.5;

export const GridScene: React.FC<{
  palette: Palette;
  angle: number;
  seed: number;
}> = ({ palette, angle, seed }) => {
  const geometry = useMemo(() => new RoundedBoxGeometry(0.44, 1, 0.44, 4, 0.08), []);

  const { origin2, ramp } = useMemo(() => {
    const r = rng(seed + 7);
    return {
      origin2: [(r() - 0.5) * 4, (r() - 0.5) * 4] as const,
      ramp: [palette.ink, palette.a, palette.b, palette.c].map(
        (c) => new THREE.Color(c),
      ),
    };
  }, [seed, palette]);

  const colorAt = (t: number) => {
    const x = Math.min(0.999, Math.max(0, t)) * (ramp.length - 1);
    const i = Math.floor(x);
    return ramp[i].clone().lerp(ramp[i + 1], x - i);
  };

  // Integer temporal frequencies (2 and 3) keep the field loop-perfect.
  const heightAt = (x: number, z: number) => {
    const d1 = Math.hypot(x, z);
    const d2 = Math.hypot(x - origin2[0], z - origin2[1]);
    const w = 0.6 * Math.sin(d1 * 1.7 - angle * 2) + 0.4 * Math.sin(d2 * 2.3 - angle * 3);
    return 0.5 + 0.5 * w; // 0..1
  };

  const cells: { x: number; z: number; h: number }[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = (i - (N - 1) / 2) * CELL;
      const z = (j - (N - 1) / 2) * CELL;
      cells.push({ x, z, h: heightAt(x, z) });
    }
  }

  // Ball rides the surface along a closed figure-eight.
  const bx = Math.sin(angle) * 1.5;
  const bz = Math.sin(angle * 2) * 1.1;
  const by = 0.25 + heightAt(bx, bz) * 1.6 + 0.55;

  const camAngle = Math.PI / 4 + Math.sin(angle) * 0.22;
  return (
    <>
      <CameraRig
        position={[Math.cos(camAngle) * 14, 9.6, Math.sin(camAngle) * 14]}
        target={[0, 0.4, 0]}
        fov={30}
      />
      <PaletteEnvironment palette={palette} />
      <Backdrop palette={palette} angle={angle} strength={0.6} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 8, 3]} intensity={2} />
      <directionalLight position={[-6, 3, -4]} intensity={0.9} color={palette.b} />

      <group position={[0, -2.2, 0]}>
        {cells.map((c, k) => {
          const height = 0.25 + c.h * 1.6;
          return (
            <mesh
              key={k}
              geometry={geometry}
              position={[c.x, height / 2, c.z]}
              scale={[1, height, 1]}
            >
              <meshPhysicalMaterial
                color={colorAt(c.h * 0.85 + 0.12)}
                roughness={0.28}
                metalness={0.15}
                clearcoat={1}
                clearcoatRoughness={0.1}
                envMapIntensity={1.2}
              />
            </mesh>
          );
        })}
        <mesh position={[bx, by, bz]} scale={0.42} rotation={[angle * 2, angle, 0]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshPhysicalMaterial
            color="#ffffff"
            metalness={1}
            roughness={0.05}
            envMapIntensity={1.8}
          />
        </mesh>
      </group>
      {/* faint glow ring under the field */}
      <mesh position={[0, -2.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.9, 4.05, 128]} />
        <meshBasicMaterial
          color={new THREE.Color(palette.c).multiplyScalar(1.8)}
          toneMapped={false}
          transparent
          opacity={0.6}
        />
      </mesh>
    </>
  );
};
