import React from "react";
import { Composition, Folder } from "remotion";
import { Brief, briefSchema, defaultBrief, FPS, PALETTES } from "./brief";
import { calculateDailyMetadata, DailyShort } from "./DailyShort";

const vertical = { fps: FPS, width: 1080, height: 1920 } as const;

const preset = (over: Partial<Brief>): Brief => ({ ...defaultBrief, ...over });

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* The pipeline renders this one with --props=content/posts/<date>.json */}
      <Composition
        id="DailyShort"
        component={DailyShort}
        schema={briefSchema}
        defaultProps={defaultBrief}
        calculateMetadata={calculateDailyMetadata}
        durationInFrames={300}
        {...vertical}
      />
      <Folder name="Styles">
        <Composition
          id="Glass"
          component={DailyShort}
          schema={briefSchema}
          defaultProps={preset({ style: "glass", palette: PALETTES[0] })}
          calculateMetadata={calculateDailyMetadata}
          durationInFrames={300}
          {...vertical}
        />
        <Composition
          id="Clay"
          component={DailyShort}
          schema={briefSchema}
          defaultProps={preset({
            style: "clay",
            palette: PALETTES[1],
            hook: "*Spider-Verse* look, din cod",
            beats: ["Toon shading + halftone", "Contur de cerneală", "Buclă *perfectă*"],
          })}
          calculateMetadata={calculateDailyMetadata}
          durationInFrames={300}
          {...vertical}
        />
        <Composition
          id="Grid"
          component={DailyShort}
          schema={briefSchema}
          defaultProps={preset({
            style: "grid",
            palette: PALETTES[3],
            hook: "Cel mai *satisfying* loop",
            beats: ["121 de piloni", "2 valuri care se ciocnesc", "0 tăieturi"],
          })}
          calculateMetadata={calculateDailyMetadata}
          durationInFrames={300}
          {...vertical}
        />
      </Folder>
    </>
  );
};
