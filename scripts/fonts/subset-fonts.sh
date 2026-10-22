#!/usr/bin/env bash
# 按实际用到的字给三套字体做子集，输出 woff2 到 src/assets/fonts/。
# 用法：npm run fonts   （需要 python3；首次运行会建 .venv-fonts 并装 fonttools）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/fonts-src"
OUT="$ROOT/src/assets/fonts"
HERE="$ROOT/scripts/fonts"
VENV="$ROOT/.venv-fonts"

bash "$HERE/fetch-fonts.sh"

if [[ ! -x "$VENV/bin/pyftsubset" ]]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q fonttools brotli
fi

(cd "$ROOT" && npx tsx scripts/fonts/collect-glyphs.ts)

mkdir -p "$OUT"
subset() {
  local font="$1" glyphs="$2" out="$3"
  "$VENV/bin/pyftsubset" "$SRC/$font" \
    --text-file="$HERE/$glyphs" \
    --flavor=woff2 \
    --layout-features='*' \
    --no-hinting \
    --desubroutinize \
    --output-file="$OUT/$out"
  printf '%-28s %6s KB\n' "$out" "$(( $(wc -c < "$OUT/$out") / 1024 ))"
}

subset LXGWWenKai-Regular.ttf   glyphs-body.txt    LXGWWenKai-subset.woff2
subset MaShanZheng-Regular.ttf  glyphs-display.txt MaShanZheng-subset.woff2
subset ZhiMangXing-Regular.ttf  glyphs-display.txt ZhiMangXing-subset.woff2

cp "$SRC/LXGWWenKai-OFL.txt"  "$OUT/OFL-LXGWWenKai.txt"
cp "$SRC/MaShanZheng-OFL.txt" "$OUT/OFL-MaShanZheng.txt"
cp "$SRC/ZhiMangXing-OFL.txt" "$OUT/OFL-ZhiMangXing.txt"

# 检查缺字：字表里有、字体里没有的字会回退到系统字体
"$VENV/bin/python" - "$HERE" "$OUT" <<'PY'
import sys
from fontTools.ttLib import TTFont
here, out = sys.argv[1], sys.argv[2]
pairs = [
    ("LXGWWenKai-subset.woff2", "glyphs-body.txt"),
    ("MaShanZheng-subset.woff2", "glyphs-display.txt"),
    ("ZhiMangXing-subset.woff2", "glyphs-display.txt"),
]
for font, glyphs in pairs:
    cmap = TTFont(f"{out}/{font}").getBestCmap()
    text = open(f"{here}/{glyphs}", encoding="utf-8").read().strip()
    missing = [c for c in text if ord(c) not in cmap and not c.isspace()]
    print(f"{font}: 缺 {len(missing)} 字" + (f"（{''.join(missing)}）" if missing else ""))
PY
