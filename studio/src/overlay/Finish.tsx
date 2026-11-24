import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

/**
 * Finishing layer: animated film grain + vignette. The subtle "imperfect"
 * texture is what separates crafted motion from sterile AI-smooth renders.
 */
export const Finish: React.FC<{ grain?: number }> = ({ grain = 0.09 }) => {
  const frame = useCurrentFrame();
  const seed = frame % 12; // grain flickers on 12 states → no seam on loop
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: grain, mixBlendMode: "overlay" }}
      >
        <filter id={`grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
