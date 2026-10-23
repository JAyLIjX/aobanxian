/**
 * 求签用的像素签筒和掉出来的那根签，用代码画（不用图片素材）。
 * 和道士一样按格画：每格的设备像素取整，image-rendering: pixelated。
 */

const PALETTE: Record<string, string> = {
  o: "#3b2414", // 描边
  b: "#8b3a22", // 筒身
  B: "#b5532f", // 筒身亮面
  d: "#5e2716", // 筒身暗面
  g: "#d9a441", // 金箍
  G: "#a8771f", // 金箍暗
  s: "#ead39c", // 竹签
  S: "#c9a865", // 竹签暗
  r: "#c0392b", // 签头红漆
  p: "#f4e8c8", // 签筒上的纸
  k: "#2b2b2b", // 墨
};

/** 签筒正面小牌子的范围（格，含金边） */
const LABEL = { x0: 7, x1: 12, y0: 17, y1: 25 };

/** 小牌子上写的字：繁体界面写「籤」，其他写「签」 */
export const CYLINDER_LABEL = {
  "zh-CN": "签",
  "zh-TW": "籤",
  en: "签",
} as const;

export const CYLINDER_W = 20;
export const CYLINDER_H = 34;

/** 签筒：20×34 格 */
export function cylinderGrid(): string[] {
  const g = Array.from({ length: CYLINDER_H }, () =>
    Array<string>(CYLINDER_W).fill("."),
  );
  // 竹签：x 位置和顶端高度
  const sticks: [number, number][] = [
    [5, 3],
    [7, 1],
    [9, 0],
    [10, 4],
    [12, 2],
    [14, 3],
  ];
  for (const [x, top] of sticks) {
    for (let y = top; y < 9; y++)
      g[y][x] = y < top + 2 ? "r" : x === 10 ? "S" : "s";
  }
  // 筒口金箍
  for (let x = 2; x <= 17; x++) {
    g[8][x] = x === 2 || x === 17 ? "o" : "g";
    g[9][x] = x === 2 || x === 17 ? "o" : "G";
  }
  // 筒身
  for (let y = 10; y < CYLINDER_H; y++) {
    for (let x = 3; x <= 16; x++) {
      if (x === 3 || x === 16 || y === CYLINDER_H - 1) g[y][x] = "o";
      else if (x <= 5) g[y][x] = "B";
      else if (x >= 14) g[y][x] = "d";
      else g[y][x] = "b";
    }
  }
  // 两道金箍
  for (const y of [13, 29])
    for (let x = 4; x <= 15; x++) g[y][x] = x === 4 || x === 15 ? "G" : "g";
  // 中间贴的纸（小牌子）；上面的「签」字由 drawCylinderLabel 用像素字画
  for (let y = LABEL.y0; y <= LABEL.y1; y++) {
    for (let x = LABEL.x0; x <= LABEL.x1; x++) {
      const edge =
        y === LABEL.y0 || y === LABEL.y1 || x === LABEL.x0 || x === LABEL.x1;
      g[y][x] = edge ? "G" : "p";
    }
  }
  return g.map((row) => row.join(""));
}

export const STICK_W = 3;
export const STICK_H = 24;

/** 掉出来的签：3×24 格，红漆签头 */
export function stickGrid(): string[] {
  return Array.from({ length: STICK_H }, (_, y) => {
    if (y === 0) return ".o.";
    if (y < 4) return "oro";
    if (y === STICK_H - 1) return ".o.";
    return y % 6 === 5 ? "oSo" : "oso";
  });
}

/** 把格子画到 canvas 上；返回 CSS 尺寸 */
export function drawGrid(
  canvas: HTMLCanvasElement,
  grid: string[],
  cssCell: number,
  palette: Record<string, string> = PALETTE,
): { w: number; h: number } {
  const dpr = window.devicePixelRatio || 1;
  const px = Math.max(1, Math.round(cssCell * dpr));
  const w = grid[0].length;
  const h = grid.length;
  canvas.width = w * px;
  canvas.height = h * px;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = palette[grid[y][x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x * px, y * px, px, px);
    }
  }
  const size = { w: (w * px) / dpr, h: (h * px) / dpr };
  canvas.style.width = `${size.w}px`;
  canvas.style.height = `${size.h}px`;
  return size;
}

/**
 * 在已经画好的签筒（drawGrid）上，往小牌子里写一个字：用幡上的像素字 Fusion Pixel 12px，
 * 按整数倍放大（不平滑），墨色，在牌子里居中。字体要先加载好（document.fonts.load）。
 */
export function drawCylinderLabel(
  canvas: HTMLCanvasElement,
  cssCell: number,
  text: string,
): void {
  const dpr = window.devicePixelRatio || 1;
  const px = Math.max(1, Math.round(cssCell * dpr));
  const innerW = (LABEL.x1 - LABEL.x0 - 1) * px;
  const innerH = (LABEL.y1 - LABEL.y0 - 1) * px;
  const k = Math.max(1, Math.floor(Math.min(innerW, innerH) / 12));
  const glyph = document.createElement("canvas");
  glyph.width = 16;
  glyph.height = 16;
  const g = glyph.getContext("2d", { willReadFrequently: true })!;
  g.font = '12px "WX FusionPixel12"';
  g.textBaseline = "top";
  g.fillStyle = "#000";
  g.fillText(text, 2, 2);
  const data = g.getImageData(0, 0, 16, 16).data;
  // 量墨迹，居中
  let x0 = 16,
    y0 = 16,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      if (data[(y * 16 + x) * 4 + 3] >= 128) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return;
  const w = (x1 - x0 + 1) * k;
  const h = (y1 - y0 + 1) * k;
  const left = (LABEL.x0 + 1) * px + Math.floor((innerW - w) / 2);
  const top = (LABEL.y0 + 1) * px + Math.floor((innerH - h) / 2);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PALETTE.k;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (data[(y * 16 + x) * 4 + 3] >= 128)
        ctx.fillRect(left + (x - x0) * k, top + (y - y0) * k, k, k);
}
