#!/usr/bin/env bash
# 下载三套字体的完整原版到 fonts-src/（已加入 .gitignore，不进仓库）。
# 子集化前运行一次即可；已存在的文件会跳过。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/fonts-src"
mkdir -p "$DEST"

LXGW_VERSION="v1.530"
FUSION_VERSION="2026.10.16"

fetch() {
  local url="$1" out="$2"
  if [[ -s "$DEST/$out" ]]; then
    echo "已存在 $out，跳过"
  else
    echo "下载 $out ..."
    curl -fL --retry 3 -o "$DEST/$out.part" "$url"
    mv "$DEST/$out.part" "$DEST/$out"
  fi
}

fetch "https://github.com/lxgw/LxgwWenKai/releases/download/$LXGW_VERSION/LXGWWenKai-Regular.ttf" LXGWWenKai-Regular.ttf
fetch "https://raw.githubusercontent.com/lxgw/LxgwWenKai/$LXGW_VERSION/OFL.txt" LXGWWenKai-OFL.txt
fetch "https://github.com/google/fonts/raw/main/ofl/mashanzheng/MaShanZheng-Regular.ttf" MaShanZheng-Regular.ttf
fetch "https://github.com/google/fonts/raw/main/ofl/mashanzheng/OFL.txt" MaShanZheng-OFL.txt
fetch "https://github.com/google/fonts/raw/main/ofl/zhimangxing/ZhiMangXing-Regular.ttf" ZhiMangXing-Regular.ttf
fetch "https://github.com/google/fonts/raw/main/ofl/zhimangxing/OFL.txt" ZhiMangXing-OFL.txt

# 像素字体 Fusion Pixel（幡上 A 版）：12px 用于半格网格，10px 用于整格网格
fetch_zip() {
  local url="$1" name="$2"
  if [[ -d "$DEST/$name" ]]; then
    echo "已存在 $name，跳过"
  else
    echo "下载 $name ..."
    curl -fL --retry 3 -o "$DEST/$name.zip" "$url"
    mkdir -p "$DEST/$name"
    unzip -q -o "$DEST/$name.zip" -d "$DEST/$name"
    rm "$DEST/$name.zip"
  fi
}
FUSION="https://github.com/TakWolf/fusion-pixel-font/releases/download/$FUSION_VERSION"
fetch_zip "$FUSION/fusion-pixel-font-12px-monospaced-otf.woff2-v$FUSION_VERSION.zip" fusion-pixel-12px
fetch_zip "$FUSION/fusion-pixel-font-10px-monospaced-otf.woff2-v$FUSION_VERSION.zip" fusion-pixel-10px

# 英文正文衬线体 EB Garamond
fetch "https://github.com/google/fonts/raw/main/ofl/ebgaramond/EBGaramond%5Bwght%5D.ttf" EBGaramond.ttf
fetch "https://github.com/google/fonts/raw/main/ofl/ebgaramond/OFL.txt" EBGaramond-OFL.txt

echo "完成：$DEST"
