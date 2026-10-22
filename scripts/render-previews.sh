#!/usr/bin/env bash
# 用无头 Chrome 截开发预览页，生成 preview/banner-A.png、banner-B.png、banner-size.png（2 倍像素 = Retina 下的默认中号）。
# 需要先运行开发服务器：npm run dev（或 npm run tauri dev）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
URL="${URL:-http://localhost:1420}"
shot() {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="${3:-760,560}" --virtual-time-budget=4000 \
    --screenshot="$ROOT/preview/$2" "$URL/?view=preview&font=$1" >/dev/null 2>&1
  echo "→ preview/$2"
}
shot pixel banner-A.png
shot brush banner-B.png
shot both banner-size.png 960,600
