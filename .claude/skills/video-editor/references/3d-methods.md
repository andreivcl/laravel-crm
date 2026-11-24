# Every way to make 3D for short-form (and how to use it here)

Pick by what the shot needs: control and volume (code), photoreal hero shots
(DCC), assets you don't have time to model (AI 3D), or live-action-like footage
(AI video). Most strong channels mix them.

## 1. Code (this repo): Remotion + Three.js / React Three Fiber
- **Use it for**: daily volume, parametrised templates, perfect loops, kinetic
  type, data-driven or generated variations, and anything that must be
  deterministic and re-renderable from a JSON brief.
- **How**: wrap the scene in `<ThreeCanvas>` and drive *everything* from
  `useCurrentFrame()`. `useFrame()` is forbidden. Lighting is a baked PMREM
  environment generated from the palette (`scenes/shared.tsx`).
- **Proven looks here**:
  - glass (transmission, dispersion, iridescence);
  - toon/NPR (band shading, halftone, inverted-hull ink outline);
  - kinetic instanced fields;
  - chrome with coloured reflections;
  - blueprint wireframe.
- **Bring in models**: export GLB, put it in `studio/public/models/`, load it
  with drei `useGLTF(staticFile(...))`, and animate rigs by setting
  `mixer.setTime(t)` from the frame, never by letting the mixer run.
- **Limits**:
  - no path tracing;
  - software WebGL is slow (~1.5 s/frame for glass at 1080×1920);
  - on a GPU or Remotion Lambda it is 10–50× faster.
- **Related**: Motion Canvas and Manim (2D/explainer), and HyperFrames
  (HTML → video). Same idea of deterministic, code-driven frames.

## 2. Blender (free, scriptable)
- **Use it for**: photoreal or path-traced hero shots (Cycles), simulations
  (cloth, fluid, rigid-body chain reactions), Geometry Nodes procedural
  motion, and Grease Pencil 2D-over-3D.
- **Automation**: `bpy` can run headless (`blender -b file.blend -P script.py
  -a`), or as a Python module (`pip install bpy`), to batch-render variants from
  JSON. That makes it a good server-side renderer next to Remotion.
- **Pipeline**: render a PNG sequence or ProRes with alpha → drop it into
  Remotion as `<Video>` / image sequence → add type, sound and captions here.
- Cycles on CPU is minutes per frame at 1080×1920. Use a GPU machine or EEVEE.

## 3. Pro DCC and real-time engines
- **Cinema 4D + Redshift/Octane**: the motion-design industry standard
  (MoGraph cloners and effectors).
- **Houdini**: procedural FX, simulations and "satisfying" particle work.
- **Unreal Engine 5**: real-time cinematics (Sequencer and Movie Render Queue),
  photoreal environments, MetaHumans. Good for many variants fast on a GPU.
- **Spline**: browser 3D for UI-style scenes. Export to code or video.

## 4. AI 3D assets (text/image → mesh)
| Tool | Strength (per 2026 roundups, mostly vendor-written) |
|---|---|
| Meshy (7.x) | Most complete pipeline: auto-rigging, a large animation preset library, engine plugins |
| Tripo (v3.x) | Fast meshes (~10 s Turbo), game-ready topology, rigging in Studio |
| Rodin (Hyper3D Gen-2.5) | Dense, clean quads for sculpting or retopology |
| Hunyuan3D (Tencent) | Open weights (geo-restricted) |

Workflow:
1. Generate the asset → GLB.
2. Check the topology and the scale.
3. Re-texture or toon-shade it to fit the series look.
4. Animate it in Remotion or Blender.

Use your own or original characters only; never a recognisable IP.

## 5. AI video generation (for B-roll and "impossible" shots)
| Model | Per 2026 comparisons |
|---|---|
| Veo 3.1 (Google) | Quality leader: temporal consistency, native audio, 4K |
| Kling 3.x | Best value; strong action and motion |
| Runway Gen-4.5 | Control: motion brushes, persistent characters across shots |
| Sora 2 | Reported discontinued in 2026; don't plan on it |

How to use it:
- Generate 4–8 s clips for B-roll, establishing shots or transitions.
- Cut them on the beat in Remotion with `<Video>` from `@remotion/media`, and
  keep all text and captions in code so they stay sharp and editable.
- Prompt with numbers (lens, move, duration), one subject and one action per
  clip.
- Mark AI content where the platform requires it.

## 6. Motion capture and animation helpers
- **Mixamo**: free rigs and mocap clips for humanoids.
- **Rokoko, Move AI**: phone or suit mocap.
- **Cascadeur**: physics-assisted keyframing.
- Retarget in Blender, export GLB, then drive the playback time from the
  Remotion frame.

## 7. Captured 3D
- **Gaussian splats / NeRF** (Luma, Polycam, Postshot): scan a real place or
  object and fly a camera through it. This trend reads well because it is real
  but impossible.
- **Photogrammetry** for props.

## What looks "made by a team" (applies to every method)
- **Light and camera**: a lit hero (key + rim) and a backdrop that is never a
  flat fill; one motivated camera move per shot, settled before reveals.
- **Material contrast and texture**: glass against matte, chrome against clay;
  real-world scale cues; subtle grain or texture so it doesn't look AI-smooth.
- **Edit and sound**: sound designed on the same grid as the picture, with
  a silence before the payoff.
- **Loops**: a seamless loop, with every periodic motion using integer
  frequencies of the film length.

## Sources
- [Meshy vs Rodin (Meshy)](https://www.meshy.ai/compare/meshy-vs-rodin)
- [Best AI 3D generators 2026 (Krea)](https://www.krea.ai/blog/best-ai-3d-model-generators-2026)
- [Stress-testing 3 AI 3D generators (HackerNoon)](https://hackernoon.com/lang/so/how-i-stress-tested-3-ai-3d-generators-on-the-same-inputs-what-the-numbers-actually-show)
- [Veo 3.1 vs Runway Gen-4.5 vs Kling 3.0 (DEV)](https://dev.to/tekmag/veo-31-vs-runway-gen-45-vs-kling-30-best-ai-video-generator-compared-2026-14bl)
- [AI video generation 2026 compared (DEV)](https://dev.to/moksh/ai-video-generation-in-2026-runway-veo-wan-and-more-compared-2ab3)
- [Blender as a Python module](https://docs.blender.org/api/4.0/info_advanced_blender_as_bpy.html)
- [Programmatic rendering in Blender (CGWire)](https://blog.cg-wire.com/blender-programmatic-rendering)
- [Remotion vs Motion Canvas vs Manim](https://beginnersinai.org/remotion-vs-motion-canvas-vs-manim/)
- [Three.js renderer for recurring-character shorts](https://discourse.threejs.org/t/script-in-vertical-episode-out-a-three-js-renderer-for-recurring-character-shorts/96760)
- [Animation trends 2026 (GarageFarm)](https://garagefarm.net/blog/animation-trends-to-watch)
- [Motion graphics trends 2026 (Videobolt)](https://blog.videobolt.net/post/top-motion-graphics-trends-2026)
