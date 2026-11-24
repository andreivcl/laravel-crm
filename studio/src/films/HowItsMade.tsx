import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TAU } from "../lib/loop";
import { Finish } from "../overlay/Finish";
import { KineticLine, SANS } from "../overlay/KineticText";
import { ClayScene } from "../scenes/ClayScene";
import { GlassScene } from "../scenes/GlassScene";
import { GridScene } from "../scenes/GridScene";
import {
  DUR,
  FPS,
  LOOKS,
  MONTAGE,
  PANELS_AT,
  palette,
  SECTIONS,
  TEXTS,
  type Look,
  type MontageStyle,
} from "./howItsMade";
import { KnotStage } from "./KnotStage";

const f = (s: number) => Math.round(s * FPS);
const SEED = 7;
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Global time in seconds for something mounted inside a <Sequence from={fromFrame}>. */
const useGlobalT = (fromFrame: number) => (useCurrentFrame() + fromFrame) / FPS;

const KnotShot: React.FC<{ look: Look; fromFrame: number }> = ({ look, fromFrame }) => {
  const { width, height } = useVideoConfig();
  const t = useGlobalT(fromFrame);
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true }} dpr={1}>
      <KnotStage look={look} t={t} palette={palette} seed={SEED} />
    </ThreeCanvas>
  );
};

const MontageShot: React.FC<{ style: MontageStyle; fromFrame: number }> = ({ style, fromFrame }) => {
  const { width, height } = useVideoConfig();
  const t = useGlobalT(fromFrame);
  const angle = (TAU * t) / (DUR / 4);
  const props = { palette, angle, seed: SEED };
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true }} dpr={1}>
      {style === "clay" ? <ClayScene {...props} /> : style === "grid" ? <GridScene {...props} /> : <GlassScene {...props} />}
    </ThreeCanvas>
  );
};

/** Diagonal reveal of the incoming look, with a light bar on the edge. */
const Wipe: React.FC<{ durFrames: number; children: React.ReactNode }> = ({ durFrames, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const p = interpolate(frame, [0, durFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const d = H * 0.12;
  const Y = (H + d) - p * (H + 2 * d);
  const done = p >= 1;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: done ? undefined : `polygon(0px ${Y + d}px, ${W}px ${Y - d}px, ${W}px ${H}px, 0px ${H}px)`,
        }}
      >
        {children}
      </AbsoluteFill>
      {!done && p > 0 && (
        <div
          style={{
            position: "absolute",
            left: -W * 0.1,
            width: W * 1.2,
            top: Y - 40,
            height: 80,
            rotate: `${(-Math.atan2(2 * d, W) * 180) / Math.PI}deg`,
            background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, ${palette.c}aa 46%, #ffffffee 50%, ${palette.b}aa 54%, rgba(255,255,255,0) 100%)`,
            mixBlendMode: "screen",
            filter: "blur(6px)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/** Chapter chip with five progress dots – the film's open loop ("5 steps"). */
const Chip: React.FC<{ label: string; step: number; dur: number }> = ({ label, step, dur }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const exit = interpolate(frame, [dur - 6, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 170 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: "0.22em",
          color: palette.text,
          padding: "16px 30px",
          borderRadius: 999,
          border: `1.5px solid ${palette.text}40`,
          background: `${palette.bg}80`,
          backdropFilter: "blur(14px)",
          opacity: enter * (1 - exit),
          translate: `0px ${(1 - enter) * -24}px`,
        }}
      >
        <span>
          PASUL {step}/5 · {label}
        </span>
        <span style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                background: i <= step ? palette.c : `${palette.text}30`,
                scale: i === step ? interpolate(frame, [4, 16], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.55, 0, 0.2, 1.4) }) : 1,
              }}
            />
          ))}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/**
 * The lighting chapter's five panels, as soft light strips at the frame edges
 * (where a real softbox would sit). One lands per beat; the chrome's
 * reflections brighten with them (KnotStage).
 */
const PANEL_GLOWS: { x: number; y: number; w: number; h: number; color: string }[] = [
  { x: -260, y: 880, w: 560, h: 1000, color: palette.a }, // left strip
  { x: 780, y: 820, w: 560, h: 1000, color: palette.b }, // right strip
  { x: 140, y: 1640, w: 800, h: 420, color: palette.c }, // floor bounce
  { x: 240, y: 960, w: 600, h: 600, color: "#ffffff" }, // back light behind the knot
  { x: 620, y: 700, w: 420, h: 360, color: "#ffffff" }, // kicker, upper right
];
const LightStrips: React.FC<{ fromFrame: number; durFrames: number }> = ({ fromFrame, durFrames }) => {
  const frame = useCurrentFrame();
  const t = (frame + fromFrame) / FPS;
  const fade = interpolate(frame, [durFrames - 12, durFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {PANEL_GLOWS.map((p, i) => {
        const k = interpolate(t, [PANELS_AT[i], PANELS_AT[i] + 0.3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE_OUT,
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.w,
              height: p.h,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at center, ${p.color}${i === 3 ? "55" : "aa"} 0%, ${p.color}33 38%, transparent 70%)`,
              opacity: k * fade,
              scale: 0.7 + 0.3 * k,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Brief white flash straddling a time cut (≤ 3 frames each side). */
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 3, 6], [0, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#fff", opacity: o, mixBlendMode: "screen" }} />;
};

export const HowItsMade: React.FC = () => {
  // Knot shots: each look runs from its `at` until the next look's wipe has finished.
  const knot = LOOKS.map((l, i) => {
    const next = LOOKS[i + 1];
    const montageStart = MONTAGE[0].from;
    let end = next ? next.at + next.wipe : DUR;
    if (l.at < montageStart && end > montageStart) end = montageStart;
    return { ...l, from: f(l.at), dur: f(end) - f(l.at) };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      {knot.map((k, i) =>
        k.wipe > 0 ? (
          <Sequence key={`k${i}`} from={k.from} durationInFrames={k.dur} name={`Knot: ${k.look}`}>
            <Wipe durFrames={f(k.wipe)}>
              <KnotShot look={k.look} fromFrame={k.from} />
            </Wipe>
          </Sequence>
        ) : (
          <Sequence key={`k${i}`} from={k.from} durationInFrames={k.dur} name={`Knot: ${k.look}`}>
            <KnotShot look={k.look} fromFrame={k.from} />
          </Sequence>
        ),
      )}

      {MONTAGE.map((m, i) => (
        <Sequence key={`m${i}`} from={f(m.from)} durationInFrames={f(m.to) - f(m.from)} name={`Montage: ${m.style}`}>
          <MontageShot style={m.style} fromFrame={f(m.from)} />
        </Sequence>
      ))}

      {(() => {
        const lit = knot.find((k) => k.look === "lit")!;
        return (
          <Sequence from={lit.from} durationInFrames={lit.dur} name="Light strips">
            <LightStrips fromFrame={lit.from} durFrames={lit.dur} />
          </Sequence>
        );
      })()}

      {/* readability scrim behind the text zone */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${palette.bg}d9 0%, ${palette.bg}80 24%, rgba(0,0,0,0) 42%)`,
        }}
      />

      <Sequence from={f(LOOKS[1].at) - 3} durationInFrames={7} name="Flash (time cut)">
        <Flash />
      </Sequence>

      {SECTIONS.filter((s) => s.chip).map((s) => (
        <Sequence key={s.id} from={f(s.from)} durationInFrames={f(s.to) - f(s.from)} name={`Chip ${s.id}`}>
          <Chip label={s.chip!} step={s.step!} dur={f(s.to) - f(s.from)} />
        </Sequence>
      ))}

      {TEXTS.map((tx) => (
        <Sequence key={tx.id} from={f(tx.from)} durationInFrames={f(tx.to) - f(tx.from)} name={`Text ${tx.id}`}>
          <AbsoluteFill style={{ top: 300, height: 470, padding: "0 90px", justifyContent: "center", textAlign: "center" }}>
            <KineticLine
              line={tx.text}
              duration={f(tx.to) - f(tx.from)}
              palette={palette}
              size={tx.size}
              instant={tx.instant}
              isLast={tx.id === "hookLoop"}
            />
          </AbsoluteFill>
        </Sequence>
      ))}

      <Audio src={staticFile("audio/how-its-made.wav")} />
      <Finish />
    </AbsoluteFill>
  );
};
