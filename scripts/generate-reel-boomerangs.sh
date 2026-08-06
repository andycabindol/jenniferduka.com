#!/usr/bin/env bash
# Generate boomerang GIFs from the middle of each reels YouTube video.
# Requires: yt-dlp, ffmpeg, ffprobe
#
# Usage:
#   ./scripts/generate-reel-boomerangs.sh
#   ./scripts/generate-reel-boomerangs.sh --from-dir /path/to/mp4s
#
# Optional cookies if YouTube bot-checks your IP:
#   export YT_COOKIES=~/cookies.txt
#   yt-dlp --cookies-from-browser chrome ...

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/assets/img/reels"
SRC_DIR="${TMPDIR:-/tmp}/jennifer-reels-src"
CLIP_SEC="${CLIP_SEC:-1.2}"
FPS="${FPS:-12}"
WIDTH="${WIDTH:-360}"

IDS=(
  hZtK_oCr8tA
  CdDNb8_sn9g
  8_vyovvaN5c
  PeIDBB_2Bz0
  zLc9qh3LOyg
)

FROM_DIR=""
if [[ "${1:-}" == "--from-dir" ]]; then
  FROM_DIR="${2:?path required}"
fi

mkdir -p "$OUT_DIR" "$SRC_DIR"

download() {
  local id="$1"
  local out="$SRC_DIR/$id.%(ext)s"
  local args=(
    -f "best[height<=720][ext=mp4]/best[height<=720]/best"
    -o "$out"
    --no-playlist
  )
  if [[ -n "${YT_COOKIES:-}" ]]; then
    args+=(--cookies "$YT_COOKIES")
  fi
  yt-dlp "${args[@]}" "https://www.youtube.com/watch?v=$id"
}

make_boomerang() {
  local id="$1"
  local src
  src="$(ls -1 "$SRC_DIR/$id".* 2>/dev/null | head -1 || true)"
  if [[ -z "$src" && -n "$FROM_DIR" ]]; then
    src="$(ls -1 "$FROM_DIR/$id".* 2>/dev/null | head -1 || true)"
  fi
  if [[ -z "$src" || ! -f "$src" ]]; then
    echo "Missing source for $id" >&2
    return 1
  fi

  local duration mid start
  duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")"
  mid="$(python3 -c "print(max(0.05, float('$duration')/2))")"
  start="$(python3 -c "print(max(0.05, float('$mid') - float('$CLIP_SEC')/2))")"

  local clip="$SRC_DIR/${id}_mid.mp4"
  local fwd="$SRC_DIR/${id}_fwd.mp4"
  local rev="$SRC_DIR/${id}_rev.mp4"
  local boom="$SRC_DIR/${id}_boom.mp4"
  local palette="$SRC_DIR/${id}_palette.png"
  local gif="$OUT_DIR/${id}.gif"

  ffmpeg -y -ss "$start" -t "$CLIP_SEC" -i "$src" \
    -vf "scale=${WIDTH}:-2:flags=lanczos" -an "$clip"

  # forward + reversed (boomerang)
  ffmpeg -y -i "$clip" -c copy -an "$fwd"
  ffmpeg -y -i "$clip" -vf reverse -an "$rev"
  ffmpeg -y -i "$fwd" -i "$rev" -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0" -an "$boom"

  ffmpeg -y -i "$boom" -vf "fps=${FPS},scale=${WIDTH}:-2:flags=lanczos,palettegen=stats_mode=diff" "$palette"
  ffmpeg -y -i "$boom" -i "$palette" \
    -lavfi "fps=${FPS},scale=${WIDTH}:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" \
    -loop 0 "$gif"

  echo "Wrote $gif ($(wc -c < "$gif") bytes) from ${duration}s video @ ${start}s"
}

for id in "${IDS[@]}"; do
  echo "=== $id ==="
  if [[ -z "$FROM_DIR" ]]; then
    if ! ls "$SRC_DIR/$id".* >/dev/null 2>&1; then
      download "$id"
    fi
  fi
  make_boomerang "$id"
done

echo "Done. GIFs in $OUT_DIR"
