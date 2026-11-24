import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { Palette } from "../brief";
import { SIMPLEX_3D } from "../lib/glsl";

/**
 * Studio lighting generated from the palette: a soft top box plus coloured
 * light strips, baked once into a PMREM environment map. This is what gives
 * glass/chrome its "product shot" reflections without downloading any HDRI.
 */
export const PaletteEnvironment: React.FC<{ palette: Palette }> = ({
  palette,
}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  const envMap = useMemo(() => {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(palette.bg).multiplyScalar(0.6);
    const geo = new THREE.PlaneGeometry(1, 1);
    const panel = (
      color: string,
      intensity: number,
      pos: [number, number, number],
      scale: [number, number],
    ) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.scale.set(scale[0], scale[1], 1);
      mesh.lookAt(0, 0, 0);
      envScene.add(mesh);
    };
    panel("#ffffff", 2.6, [0, 6, 1], [9, 9]); // key softbox
    panel(palette.a, 3.2, [-6, 1, 2], [2.2, 9]); // left strip
    panel(palette.b, 3.0, [6, 0.5, -1], [2.2, 9]); // right strip
    panel(palette.c, 2.2, [0, -4, 5], [9, 1.6]); // floor bounce
    panel("#ffffff", 1.4, [2, 2, -6], [3, 3]); // back kicker

    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(envScene, 0.035);
    pmrem.dispose();
    geo.dispose();
    return rt.texture;
  }, [gl, palette]);

  useLayoutEffect(() => {
    scene.environment = envMap;
    return () => {
      scene.environment = null;
    };
  }, [scene, envMap]);

  return null;
};

/** Positions the default camera deterministically for the current frame. */
export const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}> = ({ position, target, fov = 32 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.near = 0.1;
    camera.far = 200;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  });
  return null;
};

const backdropVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const backdropFragment = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform float uAngle;
uniform float uStrength;
uniform vec3 uGlowDir;
uniform float uGlowWidth;
uniform float uGlow;
varying vec3 vDir;
${SIMPLEX_3D}
void main() {
  vec3 d = normalize(vDir);
  // circular path through noise space => perfectly periodic in uAngle
  vec3 off = vec3(cos(uAngle), sin(uAngle), 0.0) * 0.55;
  float n1 = snoise(d * 1.3 + off);
  float n2 = snoise(d * 2.1 - off.yxz + 3.7);
  vec3 col = uBg;
  col = mix(col, uA, smoothstep(0.05, 0.95, n1) * 0.55 * uStrength);
  col = mix(col, uB, smoothstep(0.25, 1.0, n2) * 0.45 * uStrength);
  col = mix(col, uC, smoothstep(0.6, 1.2, n1 + n2 * 0.6) * 0.25 * uStrength);
  col *= mix(0.45, 1.0, smoothstep(-0.9, 0.5, d.y));
  // light "halo" painted into the backdrop itself, so refractive (glass)
  // materials have something bright to bend
  float ga = acos(clamp(dot(d, normalize(uGlowDir)), -1.0, 1.0)) / uGlowWidth;
  float glow = exp(-ga * ga) * uGlow * (0.92 + 0.08 * sin(uAngle * 2.0));
  col += mix(uA, uC, exp(-ga * ga * 3.0)) * glow;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/** Huge inside-out sphere with a slowly flowing, loop-safe gradient. */
export const Backdrop: React.FC<{
  palette: Palette;
  angle: number;
  strength?: number;
  /** optional glow behind the hero: direction from origin, width (rad), strength */
  glow?: { dir: [number, number, number]; width: number; strength: number };
}> = ({ palette, angle, strength = 1, glow }) => {
  const uniforms = useMemo(
    () => ({
      uBg: { value: new THREE.Color(palette.bg) },
      uA: { value: new THREE.Color(palette.a) },
      uB: { value: new THREE.Color(palette.b) },
      uC: { value: new THREE.Color(palette.c) },
      uAngle: { value: 0 },
      uStrength: { value: strength },
      uGlowDir: { value: new THREE.Vector3(...(glow?.dir ?? [0, 0, -1])) },
      uGlowWidth: { value: glow?.width ?? 1 },
      uGlow: { value: glow?.strength ?? 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [palette, strength, glow?.dir.join(), glow?.width, glow?.strength],
  );
  uniforms.uAngle.value = angle;

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[60, 64, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={backdropVertex}
        fragmentShader={backdropFragment}
      />
    </mesh>
  );
};

const haloFragment = /* glsl */ `
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uPulse;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float core = exp(-r * r * 3.2);
  float ring = exp(-pow((r - 0.62) * 7.0, 2.0)) * 0.35;
  vec3 col = mix(uColB, uColA, core) * (core * (0.9 + 0.1 * uPulse) + ring);
  col *= 1.0 - smoothstep(0.55, 0.98, r); // fade to exactly 0 before the quad edge
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * Soft light disc placed behind a hero object. Glass needs something bright
 * behind it to refract – this is the classic product-render trick.
 */
export const Halo: React.FC<{
  palette: Palette;
  angle: number;
  position: [number, number, number];
  size: number;
  intensity?: number;
}> = ({ palette, angle, position, size, intensity = 1 }) => {
  const uniforms = useMemo(
    () => ({
      uColA: { value: new THREE.Color(palette.c).multiplyScalar(1.4 * intensity) },
      uColB: { value: new THREE.Color(palette.a).multiplyScalar(1.1 * intensity) },
      uPulse: { value: 0 },
    }),
    [palette, intensity],
  );
  uniforms.uPulse.value = Math.sin(angle * 2);
  return (
    <mesh position={position} scale={size}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={haloFragment}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};
