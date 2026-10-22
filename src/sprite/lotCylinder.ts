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

export const CYLINDER_W = 20;
export const CYLINDER_H = 34;

/** 签筒：20×34 格 */
export function cylinderGrid(): string[] {
  const g = Array.from({ length: CYLINDER_H }, () => Array<string>(CYLINDER_W).fill("."));
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
    for (let y = top; y < 9; y++) g[y][x] = y < top + 2 ? "r" : x === 10 ? "S" : "s";
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
  for (const y of [13, 29]) for (let x = 4; x <= 15; x++) g[y][x] = x === 4 || x === 15 ? "G" : "g";
  // 中间贴的纸，上面三行墨字的意思
  for (let y = 17; y <= 25; y++) {
    for (let x = 7; x <= 12; x++) {
      const edge = y === 17 || y === 25 || x === 7 || x === 12;
      g[y][x] = edge ? "G" : "p";
    }
  }
  for (const y of [19, 20, 22, 23]) for (const x of [9, 10]) g[y][x] = "k";
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
export function drawGrid(canvas: HTMLCanvasElement, grid: string[], cssCell: number): { w: number; h: number } {
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
      const c = PALETTE[grid[y][x]];
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
