/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Use a locally installed Chrome Headless Shell when REMOTION_BROWSER is set
// (e.g. in CI / sandboxes without access to remotion.media).
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
// WebGL: "angle" uses the GPU when present; "swangle" = software (no GPU).
Config.setChromiumOpenGlRenderer(
  (process.env.REMOTION_GL as "angle" | "swangle" | undefined) ?? "angle",
);
