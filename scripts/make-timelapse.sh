#!/usr/bin/env bash
# Compile front-view progress photos into a timelapse video with week number
# and weight overlaid on each frame. Runs on the Mac (photos live in iCloud).
#
# Usage:
#   ./scripts/make-timelapse.sh [FITTRACK_DIR] [OUTPUT.mp4]
#
# Defaults:
#   FITTRACK_DIR = ~/Library/Mobile Documents/com~apple~CloudDocs/FitTrack
#   OUTPUT       = ./timelapse.mp4
#
# Requires: ffmpeg (brew install ffmpeg), python3.

set -euo pipefail

ROOT="${1:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/FitTrack}"
OUT="${2:-timelapse.mp4}"
START="2026-07-09" # program start (week 1); earlier photos = Week 0 baseline
FPS=2              # frames (weeks) per second

PHOTOS="$ROOT/photos/progress"
PROGRESS_JSON="$ROOT/data/progress.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Pick an ffmpeg that has drawtext (slim homebrew builds lack it; ffmpeg-full has it).
FFMPEG=""
for cand in ffmpeg /opt/homebrew/opt/ffmpeg-full/bin/ffmpeg /usr/local/opt/ffmpeg-full/bin/ffmpeg; do
  # plain grep (not -q): early exit would SIGPIPE ffmpeg and trip pipefail
  if command -v "$cand" >/dev/null && "$cand" -hide_banner -filters 2>/dev/null | grep drawtext >/dev/null; then
    FFMPEG="$cand"; break
  fi
done
DRAW=1
if [ -z "$FFMPEG" ]; then
  FFMPEG="$(command -v ffmpeg || true)"
  [ -n "$FFMPEG" ] || { echo "ffmpeg not found — brew install ffmpeg-full"; exit 1; }
  DRAW=0
  echo "⚠️  This ffmpeg build lacks drawtext — video will have no week/weight overlay (brew install ffmpeg-full to get it)."
fi
ls "$PHOTOS"/*_front.jpg >/dev/null 2>&1 || { echo "No *_front.jpg photos in $PHOTOS"; exit 1; }

i=0
for f in $(ls "$PHOTOS"/*_front.jpg | sort); do
  base="$(basename "$f")"
  date="${base%%_*}"
  label="$(python3 - "$date" "$START" "$PROGRESS_JSON" <<'PY'
import json, sys, datetime
date, start, pj = sys.argv[1], sys.argv[2], sys.argv[3]
d = datetime.date.fromisoformat(date)
s = datetime.date.fromisoformat(start)
week = 0 if d < s else (d - s).days // 7 + 1
kg = ""
try:
    for p in json.load(open(pj)):
        if p.get("date") == date and p.get("angle") == "front" and p.get("kg"):
            kg = f"  {p['kg']}kg"
except Exception:
    pass
print(f"Week {week}{kg}")
PY
)"
  n=$(printf "%04d" "$i")
  VF="scale=1080:1440:force_original_aspect_ratio=increase,crop=1080:1440"
  if [ "$DRAW" = 1 ]; then
    VF="$VF,drawtext=text='${label}':fontcolor=white:fontsize=56:borderw=3:bordercolor=black:x=40:y=h-th-40"
  fi
  "$FFMPEG" -loglevel error -y -i "$f" -vf "$VF" -q:v 2 "$TMP/frame_$n.jpg"
  echo "frame $n  $base  ($label)"
  i=$((i + 1))
done

"$FFMPEG" -loglevel error -y -framerate "$FPS" -i "$TMP/frame_%04d.jpg" \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$OUT"

echo "✅ $OUT ($i frames)"
