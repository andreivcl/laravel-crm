import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Finish } from "../../overlay/Finish";
import { KineticLine, SANS } from "../../overlay/KineticText";
import { EPISODE, FPS, T, TEXTS } from "./spec";
import { SKY, World } from "./World";

const f = (s: number) => Math.round(s * FPS);

const Scene: React.FC = () => {
  const { width, height } = useVideoConfig();
  const t = useCurrentFrame() / FPS;
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true }} dpr={1} shadows>
      <World t={t} />
    </ThreeCanvas>
  );
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 3, 6], [0, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#fff", opacity: o, mixBlendMode: "screen" }} />;
};

/** Series chip – the constant brand anchor of every episode. */
const SeriesChip: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", top: 170 }}>
    <div
      style={{
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 32,
        letterSpacing: "0.24em",
        color: SKY.text,
        padding: "14px 30px",
        borderRadius: 999,
        border: `1.5px solid ${SKY.text}55`,
        background: `${SKY.bg}88`,
        backdropFilter: "blur(14px)",
      }}
    >
      {EPISODE.series} · EP. {EPISODE.number}
    </div>
  </AbsoluteFill>
);

export const InThisWorldEp1: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: SKY.bg }}>
    <Scene />

    {/* readability scrim behind the text zone */}
    <AbsoluteFill
      style={{ background: `linear-gradient(180deg, ${SKY.bg}e0 0%, ${SKY.bg}88 24%, rgba(0,0,0,0) 42%)` }}
    />

    <Sequence from={f(T.setup) - 3} durationInFrames={7} name="Flash (time cut)">
      <Flash />
    </Sequence>

    <SeriesChip />

    {TEXTS.map((tx) => (
      <Sequence key={tx.id} from={f(tx.from)} durationInFrames={f(tx.to) - f(tx.from)} name={`Text ${tx.id}`}>
        <AbsoluteFill style={{ top: 300, height: 470, padding: "0 80px", justifyContent: "center", textAlign: "center" }}>
          <KineticLine
            line={tx.text}
            duration={f(tx.to) - f(tx.from)}
            palette={SKY}
            size={tx.size}
            instant={tx.instant}
            isLast={tx.id === "hookLoop"}
          />
        </AbsoluteFill>
      </Sequence>
    ))}

    <Audio src={staticFile("audio/in-this-world-01.wav")} />
    <Finish grain={0.06} />
  </AbsoluteFill>
);
