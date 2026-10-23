"""检查宣传片每种字幕字体都包含它要显示的每一个字（缺字会让浏览器逐字回退到别的字体，字形不一致）。
python3 scripts/check-glyphs.py out/promo-text.json"""
import json, sys
from fontTools.ttLib import TTFont

FONTS = {"brush": "src/fonts/promo-brush.woff2", "kai": "src/fonts/promo-kai.woff2", "garamond": "src/fonts/promo-garamond.woff2"}
texts = json.load(open(sys.argv[1]))
bad = 0
for key, path in FONTS.items():
    cmap = TTFont(path).getBestCmap()
    for s in texts[key]:
        missing = sorted({ch for ch in s if not ch.isspace() and ord(ch) not in cmap})
        if missing:
            bad += 1
            print(f"缺字 {key}: {''.join(missing)} ← {s}")
    print(f"{key}: {len(texts[key])} 段文字，{len(cmap)} 个字形")
sys.exit(1 if bad else 0)
