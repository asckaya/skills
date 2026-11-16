#!/usr/bin/env bash
# Convert every PDF figure in a TeX source dir into web-ready images
# usage: build_figs.sh <tex_src_dir> <out_figs_dir> [dpi]
set -euo pipefail

SRC=${1:?usage: build_figs.sh <tex_src_dir> <out_figs_dir> [dpi]}
OUT=${2:?usage: build_figs.sh <tex_src_dir> <out_figs_dir> [dpi]}
DPI=${3:-160}

# poppler (pdftoppm) is mandatory; ImageMagick may be `magick` (v7) or `convert` (v6)
command -v pdftoppm >/dev/null || { echo "need poppler-utils (pdftoppm): brew install poppler | apt install poppler-utils"; exit 1; }
if command -v $IM >/dev/null; then IM=magick
elif command -v convert >/dev/null; then IM=convert
else echo "need ImageMagick (magick/convert): brew install image$IM | apt install imagemagick"; exit 1; fi

mkdir -p "$OUT"
cd "$SRC"

shopt -s nullglob
pdfs=(*.pdf)
[ ${#pdfs[@]} -gt 0 ] || { echo "no PDF found in $SRC"; exit 0; }

for f in "${pdfs[@]}"; do
  base=${f%.pdf}
  # raster figures (photos/screenshots) become jpg; vector figures stay png
  tmp=$(mktemp -d)
  pdftoppm -png -r "$DPI" -aa yes -aaVector yes "$f" "$tmp/p" 2>/dev/null || { echo "SKIP $f"; rm -rf "$tmp"; continue; }
  for img in "$tmp"/p-*.png; do
    [ -f "$img" ] || continue
    # heuristic: very large rasters are photos -> jpg
    size=$($IM identify -format "%[fx:w*h]" "$img")
    if [ "$size" -gt 1500000 ]; then
      $IM "$img" -strip -resize '1100x>' -quality 88 "$OUT/${base}.jpg"
      rm -f "$img"
    else
      $IM "$img" -strip -resize '1600x>' -define png:compression-level=9 "$OUT/${base}.png"
      rm -f "$img"
    fi
  done
  rm -rf "$tmp"
done

# copy raster sources that already live in the package
for f in *.png *.jpg *.jpeg; do
  [ -f "$f" ] || continue
  case "$f" in *.pdf) continue;; esac
  case "$f" in
    *.png) $IM "$f" -strip -resize '1600x>' -define png:compression-level=9 "$OUT/$f" ;;
    *)     $IM "$f" -strip -resize '1600x>' -quality 88 "$OUT/${f%.*}.jpg" ;;
  esac
done

echo "done -> $OUT"
ls -la "$OUT" | tail -n +2 | awk '{printf "  %-40s %s\n", $9, $5}'
