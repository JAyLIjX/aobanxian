#!/usr/bin/env bash
# 宣传片字幕用的字体子集：从仓库的 fonts-src/（npm run fonts 下载的原版字体）按 src/captions.ts 里的字做子集，
# 输出到 src/fonts/。改了字幕文字后重新运行：bash scripts/fonts.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=..
PY="$ROOT/.venv-tools/bin/python"
mkdir -p src/fonts
TEXT=$(node -e '
const s = require("fs").readFileSync("src/captions.ts", "utf8");
const strs = [...s.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("");
process.stdout.write([...new Set(strs + "0123456789 ·:：,.，。、—–-()（）《》「」/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\x27&")].join(""));
')
sub() { "$PY" -m fontTools.subset "$1" --text="$TEXT" --flavor=woff2 --output-file="$2" --layout-features='*' 2>/dev/null; }
sub "$ROOT/fonts-src/MaShanZheng-Regular.ttf" src/fonts/promo-brush.woff2
sub "$ROOT/fonts-src/LXGWWenKai-Regular.ttf" src/fonts/promo-kai.woff2
sub "$ROOT/fonts-src/EBGaramond.ttf" src/fonts/promo-garamond.woff2
ls -la src/fonts
