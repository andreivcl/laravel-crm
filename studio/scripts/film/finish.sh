#!/usr/bin/env bash
# Lens bloom + light grade applied after rendering (WebGL post-processing doesn't
# run in Remotion's frame-by-frame renderer, so we do it in ffmpeg instead).
#   scripts/film/finish.sh in.mp4 out.mp4 [bloom_opacity=0.55]
set -euo pipefail
in="$1"; out="$2"; k="${3:-0.55}"
ffmpeg -v error -y -i "$in" -filter_complex \
  "[0:v]format=gbrp,split[base][hi];[hi]curves=all='0/0 0.72/0 1/1',gblur=sigma=22[glow];[base][glow]blend=all_mode=screen:all_opacity=${k},eq=contrast=1.04:saturation=1.08,format=yuv420p[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a copy -movflags +faststart "$out"
echo "✓ $out"
