import { loadFont } from "@remotion/fonts";
import React from "react";
import { Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { Palette } from "../brief";

// Fonts are vendored in public/fonts (SIL OFL) so daily renders never depend
// on a network fetch. Full character sets include Romanian diacritics.
export const SANS = "Inter Tight";
export const SERIF = "Instrument Serif";

loadFont({
  family: SANS,
  url: staticFile("fonts/InterTight.ttf"),
  weight: "100 900",
});
loadFont({
  family: SERIF,
  url: staticFile("fonts/InstrumentSerif-Italic.ttf"),
  style: "italic",
  weight: "400",
});

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);

type Token = { text: string; em: boolean; tail?: string };

/**
 * "Asta e *100%* din cod" → tokens, emphasised words flagged. Punctuation
 * glued to an emphasised word ("*mâine*?") stays on the same line as `tail`.
 */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  line.split(/(\*[^*]+\*)/g).forEach((part) => {
    if (!part) return;
    const em = part.startsWith("*") && part.endsWith("*");
    const clean = em ? part.slice(1, -1) : part;
    const prevEm = out.length > 0 && out[out.length - 1].em;
    const glued = !em && prevEm && /^[^\s]/.test(clean) ? clean.match(/^[^\s]+/)?.[0] : undefined;
    if (glued) {
      out[out.length - 1].tail = (out[out.length - 1].tail ?? "") + glued;
    }
    (glued ? clean.slice(glued.length) : clean)
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => out.push({ text: w, em }));
  });
  return out;
};

/**
 * One line of kinetic type. Words fly in with a staggered blur-to-sharp
 * reveal and leave with a quick blur-up. `instant` shows the line fully on
 * its first frame (used for the hook, so frame 0 is never empty).
 */
export const KineticLine: React.FC<{
  line: string;
  duration: number;
  palette: Palette;
  size: number;
  instant?: boolean;
  isLast?: boolean;
}> = ({ line, duration, palette, size, instant = false, isLast = false }) => {
  const frame = useCurrentFrame();
  const tokens = tokenize(line);
  const exitStart = duration - 9;

  const exit = isLast
    ? 0
    : interpolate(frame, [exitStart, duration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: EASE_IN,
      });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: size * 0.26,
        rowGap: size * 0.02,
        opacity: 1 - exit,
        filter: `blur(${exit * 16}px)`,
        translate: `0px ${-exit * 40}px`,
      }}
    >
      {tokens.map((t, i) => {
        // word stagger 2 frames (0.067 s), 14-frame entrance: a 5-word line has fully landed by ~0.8 s
        const start = instant ? 0 : 2 + i * 2;
        const p = interpolate(frame, [start, start + (instant ? 12 : 14)], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE_OUT,
        });
        const enterOpacity = instant ? 1 : p;
        const blur = instant ? 0 : (1 - p) * 18;
        // instant lines are fully set on their first frame (cover + seamless loop)
        const dy = instant ? 0 : (1 - p) * 60;
        const rot = instant ? 0 : (1 - p) * (i % 2 === 0 ? -1 : 1) * 6;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: enterOpacity,
              filter: `blur(${blur}px)`,
              translate: `0px ${dy}px`,
              rotate: `${rot}deg`,
              fontFamily: t.em ? SERIF : SANS,
              fontStyle: t.em ? "italic" : "normal",
              fontWeight: t.em ? 400 : 800,
              fontSize: t.em ? size * 1.18 : size,
              letterSpacing: t.em ? "-0.01em" : "-0.035em",
              lineHeight: 1.04,
              color: t.em ? "transparent" : palette.text,
              backgroundImage: t.em
                ? `linear-gradient(100deg, ${palette.c}, ${palette.a} 55%, ${palette.b})`
                : undefined,
              backgroundClip: t.em ? "text" : undefined,
              WebkitBackgroundClip: t.em ? "text" : undefined,
              textShadow: t.em ? undefined : "0 6px 36px rgba(0,0,0,0.45)",
              paddingRight: t.em ? size * 0.06 : 0,
            }}
          >
            {t.text}
            {t.tail ? (
              <span
                style={{
                  fontFamily: SANS,
                  fontStyle: "normal",
                  fontWeight: 800,
                  fontSize: size,
                  color: palette.text,
                  WebkitTextFillColor: palette.text,
                }}
              >
                {t.tail}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
};
