#!/usr/bin/env bash
# 宣传片字幕用的字体子集：从仓库的 fonts-src/（npm run fonts 下载的原版字体），
# 按 scripts/promo-text.ts 列出的文字（字幕 + 按日期算出来的文字）分别做子集，输出到 src/fonts/，
# 再用 scripts/check-glyphs.py 检查每种字体都收全了（不会有字回退到别的字体）。
# 改了字幕文字、日期或加了新段落后重新运行：bash scripts/fonts.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=..
PY="$ROOT/.venv-tools/bin/python"
mkdir -p src/fonts out
npx tsx scripts/promo-text.ts > out/promo-text.json
EXTRA='0123456789 ·:：,.，。、—–-+()（）《》「」/'
text_of() { python3 -c "import json,sys;d=json.load(open('out/promo-text.json'));print(''.join(sorted(set(''.join(d[sys.argv[1]])+sys.argv[2]))))" "$1" "$2"; }
"$PY" -m fontTools.subset "$ROOT/fonts-src/MaShanZheng-Regular.ttf" --text="$(text_of brush "$EXTRA")" --flavor=woff2 --output-file=src/fonts/promo-brush.woff2 --layout-features='*'
"$PY" -m fontTools.subset "$ROOT/fonts-src/LXGWWenKai-Regular.ttf" --text="$(text_of kai "$EXTRA")" --flavor=woff2 --output-file=src/fonts/promo-kai.woff2 --layout-features='*'
"$PY" -m fontTools.subset "$ROOT/fonts-src/EBGaramond.ttf" --text="$(text_of garamond "$EXTRA&'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")" --flavor=woff2 --output-file=src/fonts/promo-garamond.woff2 --layout-features='*'
"$PY" scripts/check-glyphs.py out/promo-text.json
ls -la src/fonts/*.woff2
