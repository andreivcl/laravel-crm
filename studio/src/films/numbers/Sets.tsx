import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "../../lib/loop";
import { Box, Car } from "../inThisWorld/Voxel";

/** Emissive panel that never casts shadows (windows, signs, neon). */
export const Glow: React.FC<{ p: [number, number, number]; s: [number, number, number]; c: string; k?: number; r?: [number, number, number] }> = ({
  p,
  s,
  c,
  k = 1.6,
  r,
}) => (
  <mesh position={p} rotation={r}>
    <boxGeometry args={s} />
    <meshBasicMaterial color={new THREE.Color(c).multiplyScalar(k)} toneMapped={false} />
  </mesh>
);

/** Text drawn on a canvas texture (signs, the arena screen). `draw` runs every frame it changes. */
export const CanvasPlane: React.FC<{
  w: number;
  h: number;
  px: number;
  p: [number, number, number];
  r?: [number, number, number];
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
  drawKey: string;
  intensity?: number;
}> = ({ w, h, px, p, r, draw, drawKey, intensity = 1.4 }) => {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = px;
    c.height = Math.round((px * h) / w);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, tex: t };
  }, [w, h, px]);
  useLayoutEffect(() => {
    const ctx = canvas.getContext("2d")!;
    draw(ctx, canvas.width, canvas.height);
    tex.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawKey, canvas, tex]);
  return (
    <mesh position={p} rotation={r}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} color={new THREE.Color(1, 1, 1).multiplyScalar(intensity)} toneMapped={false} />
    </mesh>
  );
};

const sign = (text: string, bg: string, fg: string) => (ctx: CanvasRenderingContext2D, W: number, H: number) => {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = fg;
  ctx.font = `800 ${Math.round(H * 0.62)}px "Inter Tight"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2 + H * 0.04);
};

// ---------------------------------------------------------------- street
type Building = { x: number; z: number; w: number; d: number; h: number; c: string; seed: number };

export const Street: React.FC<{ t: number }> = ({ t }) => {
  const buildings = useMemo<Building[]>(() => {
    const r = rng(5);
    const out: Building[] = [];
    for (const side of [-1, 1]) {
      let z = 12;
      while (z > -58) {
        const d = 4 + r() * 3;
        out.push({ x: side * (6.8 + r() * 0.6), z: z - d / 2, w: 3.2 + r() * 1.2, d, h: 5 + r() * 7, c: ["#8d6e63", "#6d4c41", "#a1887f", "#7b6d8d", "#5d576b"][Math.floor(r() * 5)], seed: Math.floor(r() * 1e6) });
        z -= d + 0.15;
      }
    }
    return out;
  }, []);
  const flags = useMemo(() => {
    const r = rng(9);
    return new Array(4).fill(0).map((_, k) => ({ z: -4 - k * 11, cols: new Array(14).fill(0).map(() => ["#e63946", "#2a9d8f", "#e9c46a", "#457b9d", "#f4a261"][Math.floor(r() * 5)]) }));
  }, []);
  return (
    <group>
      {/* ground */}
      <Box p={[0, -0.05, -20]} s={[40, 0.1, 100]} c="#3b3b4f" />
      <Box p={[0, 0.0, -20]} s={[6, 0.02, 100]} c="#2b2b3a" rough={0.95} />
      {[-10, -4, 2, 8, -16, -22, -28, -34, -40, -46].map((z) => (
        <Box key={z} p={[0, 0.02, z]} s={[0.15, 0.02, 2.2]} c="#e9ecef" />
      ))}
      {[-1, 1].map((s) => (
        <Box key={s} p={[s * 4.1, 0.08, -20]} s={[2.2, 0.16, 100]} c="#6c757d" />
      ))}
      {/* buildings with lit windows */}
      {buildings.map((b, i) => {
        const r = rng(b.seed);
        const rows = Math.floor(b.h / 1.3);
        const cols = Math.max(2, Math.floor(b.d / 1.2));
        const face = b.x < 0 ? b.x + b.w / 2 + 0.01 : b.x - b.w / 2 - 0.01;
        return (
          <group key={i}>
            <Box p={[b.x, b.h / 2, b.z]} s={[b.w, b.h, b.d]} c={b.c} />
            <Box p={[b.x, b.h + 0.15, b.z]} s={[b.w + 0.2, 0.3, b.d + 0.2]} c="#3d3d4e" />
            {new Array(rows).fill(0).flatMap((_, ry) =>
              new Array(cols).fill(0).map((__, cx) => {
                const lit = r() > 0.3;
                return (
                  <Glow
                    key={`${ry}-${cx}`}
                    p={[face, 1.4 + ry * 1.3, b.z - b.d / 2 + (cx + 0.5) * (b.d / cols)]}
                    s={[0.02, 0.62, 0.55]}
                    c={lit ? (r() > 0.2 ? "#ffd27a" : "#9ad1ff") : "#2a2a3a"}
                    k={lit ? 1.5 : 1}
                  />
                );
              }),
            )}
          </group>
        );
      })}
      {/* string flags on ropes tied between the buildings */}
      {flags.map((f, k) => {
        const sagY = (x: number) => 5.2 - 0.6 * (1 - Math.pow(x / 6, 2));
        const pts: [number, number][] = [];
        for (let x = -6.6; x <= 6.6001; x += 0.6) pts.push([x, sagY(Math.max(-6, Math.min(6, x))) + 0.05]);
        return (
          <group key={k}>
            {pts.slice(1).map(([x1, y1], i) => {
              const [x0, y0] = pts[i];
              const len = Math.hypot(x1 - x0, y1 - y0);
              return (
                <mesh key={`r${i}`} position={[(x0 + x1) / 2, (y0 + y1) / 2, f.z]} rotation={[0, 0, Math.atan2(y1 - y0, x1 - x0)]}>
                  <boxGeometry args={[len, 0.03, 0.03]} />
                  <meshStandardMaterial color="#2b2b2b" />
                </mesh>
              );
            })}
            {[-1, 1].map((sd) => (
              <Box key={sd} p={[sd * 6.55, 5.35, f.z]} s={[0.18, 0.18, 0.18]} c="#3d3d4e" />
            ))}
            {f.cols.map((c, i) => {
              const x = -6 + (i + 0.5) * (12 / f.cols.length);
              return (
                <group key={i} position={[x, sagY(x), f.z]} rotation={[0, 0, Math.sin(t * 2 + i + k) * 0.08]}>
                  <Box p={[0, -0.24, 0]} s={[0.4, 0.45, 0.04]} c={c} />
                </group>
              );
            })}
          </group>
        );
      })}
      {/* street lamps */}
      {[-6, -18, -30].flatMap((z) =>
        [-1, 1].map((s) => (
          <group key={`${z}${s}`} position={[s * 3.4, 0, z]}>
            <Box p={[0, 1.6, 0]} s={[0.12, 3.2, 0.12]} c="#343a40" />
            <Glow p={[0, 3.3, 0]} s={[0.35, 0.3, 0.35]} c="#ffe8a3" k={2.2} />
          </group>
        )),
      )}
      {/* bakery */}
      <group position={[-5.4, 0, -6]}>
        <Box p={[0.3, 1.2, 0]} s={[0.4, 2.4, 3.2]} c="#f6bd60" />
        {new Array(6).fill(0).map((_, i) => (
          <Box key={i} p={[0.9, 2.55, -1.35 + i * 0.54]} s={[1.3, 0.1, 0.54]} c={i % 2 ? "#ffffff" : "#e63946"} r={[0, 0, -0.35]} />
        ))}
        <CanvasPlane w={2.4} h={0.6} px={512} p={[0.52, 3.05, 0]} r={[0, Math.PI / 2, 0]} draw={sign("BAKERY", "#3d2b1f", "#ffd27a")} drawKey="bakery" />
        <Glow p={[0.52, 1.3, 0]} s={[0.02, 1.4, 1.8]} c="#ffcf8b" k={1.3} />
      </group>
      {/* police car */}
      <group position={[3.0, 0, -11]} rotation={[0, Math.PI / 2, 0]}>
        <Car c="#1d3557" />
        <Glow p={[-0.05, 1.0, -0.2]} s={[0.25, 0.1, 0.3]} c={Math.sin(t * 12) > 0 ? "#ff1744" : "#2979ff"} k={2.5} />
        <Glow p={[-0.05, 1.0, 0.2]} s={[0.25, 0.1, 0.3]} c={Math.sin(t * 12) > 0 ? "#2979ff" : "#ff1744"} k={2.5} />
      </group>
      {/* where the high numbers live: gold towers at the end of the street */}
      {[-9, -4, 2, 7, 12].map((x, i) => (
        <group key={i} position={[x, 0, -72 - (i % 2) * 6]}>
          <Box p={[0, 9 + i * 1.5, 0]} s={[3.2, 18 + i * 3, 3.2]} c="#2b2d42" />
          {new Array(12 + i * 2).fill(0).map((_, k) => (
            <Glow key={k} p={[0, 1.5 + k * 1.4, 1.62]} s={[2.4, 0.3, 0.02]} c="#ffcf5c" k={1.8} />
          ))}
          <Glow p={[0, 18.4 + i * 3, 0]} s={[0.6, 1.4, 0.6]} c="#fff3b0" k={2.5} />
        </group>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- arena
export type CrowdMember = { pos: THREE.Vector3; yaw: number; top: THREE.Color; skin: THREE.Color; phase: number };

export const CROWD: CrowdMember[] = (() => {
    const r = rng(21);
    const out: CrowdMember[] = [];
    const tops = ["#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#f4a261", "#8338ec", "#3a86ff", "#ff006e", "#ffbe0b", "#fb5607"];
    const skins = ["#ffd2a8", "#e0ac69", "#c68b59", "#8d5524", "#f1c27d"];
    for (let row = 0; row < 9; row++) {
      const radius = 10.5 + row * 1.25;
      const y = row * 0.75;
      const n = Math.floor(radius * 3.2);
      for (let i = 0; i < n; i++) {
        const ang = -2.55 + (5.1 * (i + 0.5)) / n; // leave the back (screen) open
        if (r() < 0.06) continue;
        const pos = new THREE.Vector3(Math.sin(ang) * radius, y, Math.cos(ang) * radius);
        out.push({
          pos,
          yaw: Math.atan2(-pos.x, -pos.z),
          top: new THREE.Color(tops[Math.floor(r() * tops.length)]),
          skin: new THREE.Color(skins[Math.floor(r() * skins.length)]),
          phase: r() * Math.PI * 2,
        });
      }
    }
    return out;
})();

/** Instanced crowd: one draw call for bodies, one for heads. `bounce` = laughing / cheering amount. */
export const Crowd: React.FC<{ members: CrowdMember[]; t: number; bounce: number }> = ({ members, t, bounce }) => {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const eyes = useRef<THREE.InstancedMesh>(null);
  const mouths = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const local = (c: CrowdMember, hop: number, x: number, y: number, z: number) =>
      new THREE.Vector3(x, y, z).applyAxisAngle(up, c.yaw).add(new THREE.Vector3(c.pos.x, c.pos.y + hop, c.pos.z));
    const laugh = bounce > 0.5;
    members.forEach((c, i) => {
      const hop = bounce * Math.max(0, Math.sin(t * 13 + c.phase)) * 0.12;
      q.setFromAxisAngle(up, c.yaw);
      m.compose(local(c, hop, 0, 0.75, 0), q, one);
      bodies.current!.setMatrixAt(i, m);
      m.compose(local(c, hop, 0, 1.3, 0), q, one);
      heads.current!.setMatrixAt(i, m);
      // a face on every head: two eyes + a mouth that opens when the crowd laughs
      m.compose(local(c, hop, -0.09, 1.34, 0.205), q, one);
      eyes.current!.setMatrixAt(i * 2, m);
      m.compose(local(c, hop, 0.09, 1.34, 0.205), q, one);
      eyes.current!.setMatrixAt(i * 2 + 1, m);
      m.compose(local(c, hop, 0, 1.22, 0.205), q, new THREE.Vector3(1, laugh ? 2.6 : 1, 1));
      mouths.current!.setMatrixAt(i, m);
      bodies.current!.setColorAt(i, c.top);
      heads.current!.setColorAt(i, c.skin);
    });
    for (const r of [bodies, heads, eyes, mouths]) r.current!.instanceMatrix.needsUpdate = true;
    if (bodies.current!.instanceColor) bodies.current!.instanceColor.needsUpdate = true;
    if (heads.current!.instanceColor) heads.current!.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, undefined, members.length]} castShadow>
        <boxGeometry args={[0.55, 0.9, 0.32]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, members.length]} castShadow>
        <boxGeometry args={[0.42, 0.4, 0.4]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={eyes} args={[undefined, undefined, members.length * 2]}>
        <boxGeometry args={[0.07, 0.09, 0.02]} />
        <meshBasicMaterial color="#1b1b2f" />
      </instancedMesh>
      <instancedMesh ref={mouths} args={[undefined, undefined, members.length]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshBasicMaterial color="#3b1020" />
      </instancedMesh>
    </>
  );
};

export const ArenaSet: React.FC<{
  t: number;
  members: CrowdMember[];
  bounce: number;
  screen: (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
  screenKey: string;
  beamAngle: number;
}> = ({ t, members, bounce, screen, screenKey, beamAngle }) => (
  <group>
    {/* floor + tiers */}
    <Box p={[0, -0.05, 0]} s={[70, 0.1, 70]} c="#1a1033" rough={0.4} />
    {new Array(9).fill(0).map((_, row) => (
      <mesh key={row} position={[0, row * 0.75 - 0.4 + 0.375, 0]} receiveShadow>
        <cylinderGeometry args={[11 + row * 1.25, 11 + row * 1.25, 0.75, 64, 1, true, Math.PI - 2.6 + Math.PI, 5.2]} />
        <meshStandardMaterial color="#2a1b4d" side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
    ))}
    {/* stage */}
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[7, 7.3, 0.5, 96]} />
      <meshStandardMaterial color="#9a92b8" metalness={0.45} roughness={0.22} />
    </mesh>
    <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[6.75, 6.95, 128]} />
      <meshBasicMaterial color={new THREE.Color("#ffcf5c").multiplyScalar(2)} toneMapped={false} />
    </mesh>
    <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[3.1, 3.2, 128]} />
      <meshBasicMaterial color={new THREE.Color("#5ce1ff").multiplyScalar(2)} toneMapped={false} />
    </mesh>
    {/* pillars with neon strips */}
    {[-1, 1].flatMap((s) =>
      [0, 1, 2].map((k) => (
        <group key={`${s}${k}`} position={[s * (7 + k * 4), 0, -12 + k * 1.5]}>
          <Box p={[0, 7, 0]} s={[1.2, 14, 1.2]} c="#2a1b4d" />
          <Glow p={[0.62 * -s, 7, 0]} s={[0.04, 13, 0.18]} c={k % 2 ? "#c04bff" : "#5ce1ff"} k={2} />
        </group>
      )),
    )}
    {/* giant screen */}
    <Box p={[0, 8.3, -11.2]} s={[10.8, 8.6, 0.3]} c="#0b0b14" />
    <CanvasPlane w={10} h={8} px={1000} p={[0, 8.3, -11.0]} draw={screen} drawKey={screenKey} intensity={1.6} />
    {/* exit door (walk away) */}
    <group position={[-14, 0, -6]} rotation={[0, 0.9, 0]}>
      <Box p={[0, 2.0, 0]} s={[3.0, 4.0, 0.3]} c="#2a1b4d" />
      <Glow p={[0, 1.8, 0.17]} s={[1.8, 3.4, 0.02]} c="#fff1c1" k={1.9} />
      <Glow p={[0, 3.9, 0.17]} s={[2.4, 0.12, 0.04]} c="#ffcf5c" k={2.2} />
      <CanvasPlane w={1.6} h={0.5} px={256} p={[0, 4.4, 0.2]} draw={sign("EXIT", "#0b0b14", "#ffcf5c")} drawKey="exit" />
    </group>
    {/* volumetric beams (additive cones) */}
    {[-1, 1].flatMap((s) =>
      [0, 1].map((k) => {
        const yaw = s * (0.25 + 0.15 * Math.sin(beamAngle + k * 1.3 + s));
        return (
          <group key={`${s}${k}`} position={[s * (5 + k * 4), 13, -8]} rotation={[0.55, yaw, 0]}>
            <mesh position={[0, -7, 0]}>
              <coneGeometry args={[2.4, 14, 32, 1, true]} />
              <meshBasicMaterial
                color={new THREE.Color(k ? "#c04bff" : "#ffd27a").multiplyScalar(0.35)}
                transparent
                opacity={0.55}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      }),
    )}
    <Crowd members={members} t={t} bounce={bounce} />
  </group>
);
