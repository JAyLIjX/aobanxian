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

export const MUYU_W = 24;
export const MUYU_H = 17;

/** 木鱼：24×17 格，圆鼓鼓的身子，正面一道鱼嘴的长缝，顶上一个小提手 */
export function muyuGrid(): string[] {
  const g = Array.from({ length: MUYU_H }, () => Array<string>(MUYU_W).fill("."));
  const cx = 11.5;
  const cy = 10.2;
  const rx = 11.4;
  const ry = 6.6;
  const inside = (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < MUYU_H; y++) {
    for (let x = 0; x < MUYU_W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) g[y][x] = "o";
      else if (y <= cy - 3 && x <= cx) g[y][x] = "B";
      else if (y >= cy + 3) g[y][x] = "d";
      else g[y][x] = "b";
    }
  }
  // 高光
  for (const [x, y] of [[6, 6], [7, 6], [8, 6], [5, 7]]) g[y][x] = "h";
  // 鱼嘴：一道长缝，两头往上翘，缝的上沿压暗
  for (let x = 5; x <= 18; x++) {
    g[11][x] = "k";
    g[10][x] = "d";
  }
  for (const [x, y] of [[4, 10], [19, 10]]) g[y][x] = "k";
  // 顶上的小提手
  for (const [x, y] of [[10, 1], [11, 1], [12, 1], [13, 1], [9, 2], [14, 2], [9, 3], [14, 3]]) g[y][x] = "o";
  for (const [x, y] of [[10, 2], [13, 2]]) g[y][x] = "d";
  return g.map((row) => row.join(""));
}

export const MALLET_W = 14;
export const MALLET_H = 14;

/** 木槌：14×14 格，两格粗的柄从右下斜到左上，左上是圆圆的槌头。转轴在右下角（柄尾），放在木鱼右上方，逆时针一转槌头落到木鱼上 */
export function malletGrid(): string[] {
  const g = Array.from({ length: MALLET_H }, () => Array<string>(MALLET_W).fill("."));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && y >= 0 && x < MALLET_W && y < MALLET_H) g[y][x] = c;
  };
  for (let i = 0; i < 9; i++) {
    const x = 1 + i;
    const y = 12 - i;
    set(x - 1, y, "o");
    set(x, y, "s");
    set(x + 1, y, "s");
    set(x + 2, y, "o");
  }
  const hx = 10.5;
  const hy = 3.2;
  for (let y = 0; y < 7; y++) {
    for (let x = 7; x < MALLET_W; x++) {
      const d = (x - hx) ** 2 + (y - hy) ** 2;
      if (d <= 3.0 ** 2) set(x, y, d >= 2.2 ** 2 ? "o" : x + y < hx + hy - 0.5 ? "R" : "r");
    }
  }
  // 上面按「柄朝右上」画的，左右翻过来
  return g.map((row) => [...row].reverse().join(""));
}
