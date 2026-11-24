import React from "react";
import { Composition, Folder } from "remotion";
import { Brief, briefSchema, defaultBrief, FPS, PALETTES } from "./brief";
import { calculateDailyMetadata, DailyShort } from "./DailyShort";
import { HowItsMade } from "./films/HowItsMade";
import { InThisWorldEp1 } from "./films/inThisWorld/Episode";
import { FRAMES as EP1_FRAMES } from "./films/inThisWorld/spec";
import { FPS as FILM_FPS, FRAMES as FILM_FRAMES } from "./films/howItsMade";

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
      {/* 60 s+ film: one shape through 5 build steps, music-grid montage */}
      <Folder name="Films">
        <Composition
          id="HowItsMade"
          component={HowItsMade}
          durationInFrames={FILM_FRAMES}
          fps={FILM_FPS}
          width={1080}
          height={1920}
        />
        {/* Series "În lumea asta…" – original voxel cast */}
        <Composition
          id="InThisWorldEp1"
          component={InThisWorldEp1}
          durationInFrames={EP1_FRAMES}
          fps={FILM_FPS}
          width={1080}
          height={1920}
        />
      </Folder>
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
