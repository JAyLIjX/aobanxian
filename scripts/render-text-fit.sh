#!/usr/bin/env bash
# 书写物上字号的效果图：preview/text-fit/<角色>-area.png（写字区域）、<角色>.png（小中大 × 3 字 / 4 字 × 像素字 / 行书）。
# 用无头 Chrome 按 2 倍屏截开发预览页，需要先运行开发服务器：npm run dev
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
URL="${URL:-http://localhost:1420}"
mkdir -p "$ROOT/preview/text-fit"
shot() {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="$3" --virtual-time-budget=6000 \
    --screenshot="$ROOT/preview/text-fit/$2" "$URL/?view=textfit&$1" >/dev/null 2>&1
  echo "→ preview/text-fit/$2"
}
for id in ${@:-daoshi shusheng guanyuan heshang}; do
  shot "id=$id&what=area" "$id-area.png" 860,1060
  shot "id=$id" "$id.png" 1400,1180
done
