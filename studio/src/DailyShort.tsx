import { ThreeCanvas } from "@remotion/three";
import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Brief, briefTimeline } from "./brief";
import { loopAngle } from "./lib/loop";
import { Finish } from "./overlay/Finish";
import { KineticLine, SANS } from "./overlay/KineticText";
import { ClayScene } from "./scenes/ClayScene";
import { GlassScene } from "./scenes/GlassScene";
import { GridScene } from "./scenes/GridScene";

export const calculateDailyMetadata: CalculateMetadataFunction<Brief> = ({
  props,
}) => {
  const { total } = briefTimeline(props);
  return { durationInFrames: total };
};

const Scene: React.FC<{ brief: Brief }> = ({ brief }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const angle = loopAngle(frame, durationInFrames);
  const shared = { palette: brief.palette, angle, seed: brief.seed };
  switch (brief.style) {
    case "glass":
      return <GlassScene {...shared} />;
    case "clay":
      return <ClayScene {...shared} />;
    case "grid":
      return <GridScene {...shared} />;
  }
};

/** Safe zone: TikTok/Reels/Shorts UI covers ~480px at the bottom and ~140px on the right. */
const TEXT_TOP = 290;
const TEXT_HEIGHT = 460;

export const DailyShort: React.FC<Brief> = (brief) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = briefTimeline(brief);
  const lines = [
    { text: brief.hook, dur: t.hook, size: 104, instant: true },
    ...brief.beats.map((b) => ({ text: b, dur: t.beat, size: 88, instant: false })),
    { text: brief.cta, dur: t.cta, size: 84, instant: false },
  ];
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: brief.palette.bg }}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ antialias: true }}
        dpr={1}
      >
        <Scene brief={brief} />
      </ThreeCanvas>

      {/* readability scrim behind the text zone */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${brief.palette.bg}d9 0%, ${brief.palette.bg}80 26%, rgba(0,0,0,0) 44%)`,
        }}
      />

      {/* series kicker – constant brand anchor */}
      <AbsoluteFill style={{ alignItems: "center", top: 170 }}>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: "0.28em",
            color: brief.palette.text,
            padding: "14px 30px",
            borderRadius: 999,
            border: `1.5px solid ${brief.palette.text}40`,
            background: `${brief.palette.bg}66`,
            backdropFilter: "blur(14px)",
            scale: interpolate(frame, [0, 10], [0.96, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {brief.series}
        </div>
      </AbsoluteFill>

      {lines.map((l, i) => {
        const from = cursor;
        cursor += l.dur;
        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={l.dur}
            name={i === 0 ? "Hook" : i === lines.length - 1 ? "CTA" : `Beat ${i}`}
          >
            <AbsoluteFill
              style={{
                top: TEXT_TOP,
                height: TEXT_HEIGHT,
                padding: "0 90px",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <KineticLine
                line={l.text}
                duration={l.dur}
                palette={brief.palette}
                size={l.size}
                instant={l.instant}
                isLast={false}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <Finish />
    </AbsoluteFill>
  );
};
