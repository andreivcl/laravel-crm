import React, { useMemo } from "react";
import * as THREE from "three";
import type { Palette } from "../brief";
import { SIMPLEX_3D } from "../lib/glsl";
import { rng, TAU } from "../lib/loop";
import { Backdrop, CameraRig, Halo } from "./shared";

/**
 * "Ink & clay" NPR look (Spider-Verse-style stylised 3D): toon bands,
 * halftone dots in the shadows, hand-drawn style ink outline, and a
 * noise-morphing blob that squashes & stretches on a perfect loop.
 */

const vertex = /* glsl */ `
uniform float uAngle;
uniform float uAmp;
uniform float uFreq;
uniform float uOutline;
varying vec3 vNormalV;
varying vec3 vViewPos;
${SIMPLEX_3D}
vec3 displace(vec3 p) {
  if (uAmp == 0.0) return p;
  vec3 n = normalize(p);
  vec3 off = vec3(cos(uAngle), sin(uAngle), 0.0) * 0.9;
  float d = snoise(n * uFreq + off) * uAmp
          + snoise(n * uFreq * 2.3 - off.yxz + 5.0) * uAmp * 0.3;
  return p + n * d;
}
void main() {
  vec3 n = normalize(normal);
  vec3 t = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 b = cross(n, t);
  float e = 0.01;
  vec3 p0 = displace(position);
  vec3 p1 = displace(position + t * e);
  vec3 p2 = displace(position + b * e);
  vec3 nn = normalize(cross(p1 - p0, p2 - p0));
  if (dot(nn, n) < 0.0) nn = -nn;
  p0 += nn * uOutline;
  vec4 mv = modelViewMatrix * vec4(p0, 1.0);
  vViewPos = mv.xyz;
  vNormalV = normalize(normalMatrix * nn);
  gl_Position = projectionMatrix * mv;
}
`;

const fragment = /* glsl */ `
uniform vec3 uShadow;
uniform vec3 uMid;
uniform vec3 uLight;
uniform vec3 uRim;
uniform vec3 uInk;
uniform float uIsOutline;
uniform float uDot;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  if (uIsOutline > 0.5) {
    gl_FragColor = vec4(uInk, 1.0);
    #include <colorspace_fragment>
    return;
  }
  vec3 L = normalize(vec3(0.55, 0.75, 0.55));
  vec3 N = normalize(vNormalV);
  vec3 V = normalize(-vViewPos);
  float ndl = dot(N, L);
  float lit = smoothstep(-0.04, 0.04, ndl);
  float hi = smoothstep(0.6, 0.66, ndl);
  vec3 col = mix(uShadow, uMid, lit);
  col = mix(col, uLight, hi);
  float spec = smoothstep(0.955, 0.965, dot(N, normalize(L + V)));
  col = mix(col, vec3(1.0), spec * 0.95);
  float rim = smoothstep(0.6, 0.68, 1.0 - max(dot(N, V), 0.0));
  col = mix(col, uRim, rim * 0.9 * (1.0 - hi));
  // halftone dots, denser where it's darker
  vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * (gl_FragCoord.xy / uDot);
  vec2 cell = fract(g) - 0.5;
  float darkness = 1.0 - smoothstep(-0.7, 0.05, ndl);
  float r = darkness * 0.45;
  float dotMask = 1.0 - smoothstep(r - 0.05, r + 0.05, length(cell));
  col = mix(col, uInk, dotMask * 0.6 * (1.0 - lit));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const useToon = (
  color: string,
  palette: Palette,
  opts: { amp: number; freq: number; outline: number; angle: number },
) => {
  const mats = useMemo(() => {
    const base = new THREE.Color(color);
    const ink = new THREE.Color(palette.ink);
    const common = {
      uAngle: { value: 0 },
      uAmp: { value: opts.amp },
      uFreq: { value: opts.freq },
      uShadow: { value: base.clone().lerp(ink, 0.5) },
      uMid: { value: base.clone() },
      uLight: { value: base.clone().lerp(new THREE.Color("#ffffff"), 0.45) },
      uRim: { value: new THREE.Color(palette.c).lerp(new THREE.Color("#ffffff"), 0.3) },
      uInk: { value: ink },
      uDot: { value: 13 },
    };
    const fill = new THREE.ShaderMaterial({
      uniforms: { ...common, uOutline: { value: 0 }, uIsOutline: { value: 0 } },
      vertexShader: vertex,
      fragmentShader: fragment,
      toneMapped: false,
    });
    const line = new THREE.ShaderMaterial({
      uniforms: {
        ...common,
        uOutline: { value: opts.outline },
        uIsOutline: { value: 1 },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.BackSide,
      toneMapped: false,
    });
    return { fill, line };
  }, [color, palette, opts.amp, opts.freq, opts.outline]);
  mats.fill.uniforms.uAngle.value = opts.angle;
  mats.line.uniforms.uAngle.value = opts.angle;
  return mats;
};

const ToonMesh: React.FC<{
  geometry: THREE.BufferGeometry;
  color: string;
  palette: Palette;
  angle: number;
  amp?: number;
  freq?: number;
  outline?: number;
} & Omit<React.ComponentProps<"group">, "children">> = ({
  geometry,
  color,
  palette,
  angle,
  amp = 0,
  freq = 1,
  outline = 0.035,
  ...group
}) => {
  const { fill, line } = useToon(color, palette, { amp, freq, outline, angle });
  return (
    <group {...group}>
      <mesh geometry={geometry} material={fill} />
      <mesh geometry={geometry} material={line} />
    </group>
  );
};

export const ClayScene: React.FC<{
  palette: Palette;
  angle: number;
  seed: number;
}> = ({ palette, angle, seed }) => {
  const geos = useMemo(
    () => ({
      blob: new THREE.IcosahedronGeometry(1.5, 72),
      torus: new THREE.TorusGeometry(0.34, 0.14, 48, 96),
      capsule: new THREE.CapsuleGeometry(0.16, 0.34, 16, 32),
      ball: new THREE.IcosahedronGeometry(0.2, 12),
    }),
    [],
  );

  const props = useMemo(() => {
    const r = rng(seed + 101);
    const kinds = ["torus", "capsule", "ball", "torus", "ball", "capsule"] as const;
    return kinds.map((kind, i) => ({
      kind,
      color: [palette.b, palette.c, palette.a][i % 3],
      radius: 1.75 + r() * 0.55,
      phase: (i / kinds.length) * TAU + r() * 0.4,
      height: (r() - 0.5) * 1.8,
      spinK: 1 + Math.floor(r() * 2),
    }));
  }, [seed, palette]);

  const blobY = -0.5;
  const squash = Math.sin(angle * 2) * 0.06; // squash & stretch, 2 beats per loop

  return (
    <>
      <CameraRig
        position={[Math.sin(angle) * 0.8, 0.6, 10.5]}
        target={[0, 0, 0]}
        fov={34}
      />
      <Backdrop palette={palette} angle={angle} strength={0.75} />
      <Halo palette={palette} angle={angle} position={[0, blobY, -4]} size={7} intensity={0.45} />

      <ToonMesh
        geometry={geos.blob}
        color={palette.a}
        palette={palette}
        angle={angle}
        amp={0.26}
        freq={1.1}
        outline={0.05}
        position={[0, blobY + squash * 0.6, 0]}
        rotation={[0.2, angle, 0]}
        scale={[0.78 * (1 - squash * 0.5), 0.78 * (1 + squash), 0.78 * (1 - squash * 0.5)]}
      />

      {props.map((p, i) => {
        const a = angle + p.phase;
        return (
          <ToonMesh
            key={i}
            geometry={geos[p.kind]}
            color={p.color}
            palette={palette}
            angle={angle}
            outline={0.028}
            position={[
              Math.cos(a) * p.radius,
              blobY + p.height + Math.sin(angle * 2 + p.phase) * 0.25,
              Math.sin(a) * p.radius * 0.6,
            ]}
            rotation={[angle * p.spinK + p.phase, angle * p.spinK, 0.4]}
          />
        );
      })}
    </>
  );
};
