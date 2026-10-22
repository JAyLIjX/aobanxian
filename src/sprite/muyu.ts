/**
 * 小和尚的木鱼和木槌，用代码画的像素图（不用图片素材）。画法和签筒一样：每个字符一格。
 */

export const MUYU_PALETTE: Record<string, string> = {
  o: "#3a1f12", // 描边
  b: "#9a5428", // 木色
  B: "#c27a3e", // 亮面
  d: "#6e3a1b", // 暗面
  k: "#24120a", // 鱼嘴的缝
  h: "#d8a46a", // 高光
  s: "#7a4a2a", // 槌柄
  r: "#a3402c", // 槌头
  R: "#cf6a4c", // 槌头亮面
};

export const MUYU_W = 20;
export const MUYU_H = 14;

/** 木鱼：20×14 格，侧面看是一个扁圆，中间一道鱼嘴的缝，顶上一个小提手 */
export function muyuGrid(): string[] {
  const g = Array.from({ length: MUYU_H }, () => Array<string>(MUYU_W).fill("."));
  const cx = 9.5;
  const cy = 8.5;
  const rx = 9.4;
  const ry = 5.3;
  const inside = (x: number, y: number) => ((x + 0.5 - cx - 0.5) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < MUYU_H; y++) {
    for (let x = 0; x < MUYU_W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) g[y][x] = "o";
      else if (y <= cy - 2.5 && x <= cx) g[y][x] = "B";
      else if (y >= cy + 2.5) g[y][x] = "d";
      else g[y][x] = "b";
    }
  }
  // 高光
  for (const [x, y] of [[6, 5], [7, 5], [5, 6]]) g[y][x] = "h";
  // 鱼嘴：一道横缝，缝上沿亮一点
  for (let x = 4; x <= 14; x++) {
    g[9][x] = "k";
    if (g[8][x] === "b" || g[8][x] === "B") g[8][x] = "d";
  }
  // 顶上的小提手
  for (const [x, y] of [[8, 1], [9, 1], [10, 1], [11, 1], [7, 2], [12, 2]]) g[y][x] = "o";
  for (const [x, y] of [[8, 2], [11, 2]]) g[y][x] = "d";
  return g.map((row) => row.join(""));
}

export const MALLET_W = 11;
export const MALLET_H = 11;

/** 木槌：11×11 格，柄从左下斜到右上，右上是圆圆的槌头。转轴在左下角（柄尾） */
export function malletGrid(): string[] {
  const g = Array.from({ length: MALLET_H }, () => Array<string>(MALLET_W).fill("."));
  for (let i = 0; i < 7; i++) {
    const x = 1 + i;
    const y = 9 - i;
    g[y][x] = "s";
    g[y][x - 1] = g[y][x - 1] === "." ? "o" : g[y][x - 1];
  }
  const head: [number, number][] = [
    [7, 1], [8, 1], [9, 1],
    [6, 2], [7, 2], [8, 2], [9, 2], [10, 2],
    [6, 3], [7, 3], [8, 3], [9, 3], [10, 3],
    [7, 4], [8, 4], [9, 4],
  ];
  for (const [x, y] of head) g[y][x] = "r";
  for (const [x, y] of [[7, 1], [8, 1], [9, 1], [6, 2], [10, 2], [6, 3], [10, 3], [7, 4], [8, 4], [9, 4]]) g[y][x] = "o";
  for (const [x, y] of [[7, 2], [8, 2]]) g[y][x] = "R";
  return g.map((row) => row.join(""));
}
