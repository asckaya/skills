#!/usr/bin/env bash
# One-shot setup: install deps, then build assets into ${PAPER_HTML:-./html}.
set -euo pipefail
cd "$(dirname "$0")/.."
if command -v bun >/dev/null; then bun install; else npm install; fi
node scripts/build.mjs
