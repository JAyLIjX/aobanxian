/**
 * 幡上的字：把文字栅格化成和像素画同一套网格的「点」，竖排居中印在幡面上。
 *
 * 文字网格 = 精灵格的一半或整格（textCells = 2 或 1）：
 *   每格设备像素为偶数时用半格网格 + 12px 像素字（幡面 16×42 格 → 32×84 个文字点，4 个字放得下）；
 *   奇数时用整格网格 + 10px 像素字，保证每个文字点都是整数个设备像素，不会糊。
 * 行书版把志莽行书画到同一网格后按透明度二值化。
 */
import type { Rect } from "./sprite";

export type BannerFont = "pixel" | "brush";

export interface TextGrid {
  /** 每个精灵格分成几个文字点（1 或 2） */
  cellsPerUnit: 1 | 2;
  /** 幡面宽、高（文字点） */
  w: number;
  h: number;
}

/** 印在幡面上的点（文字点坐标，相对幡面左上角） */
export type TextPixels = Uint8Array;

const FAMILY = {
  pixel12: "WX FusionPixel12",
  pixel10: "WX FusionPixel10",
  brush: "WX ZhiMangXing Banner",
};

export function textGridFor(face: Rect, devicePxPerCell: number): TextGrid {
  const cellsPerUnit = devicePxPerCell % 2 === 0 ? 2 : 1;
  return { cellsPerUnit, w: face.w * cellsPerUnit, h: face.h * cellsPerUnit };
}

function fontFor(font: BannerFont, grid: TextGrid, count: number): { family: string; size: number; gap: number; threshold: number } {
  if (font === "pixel") {
    return grid.cellsPerUnit === 2
      ? { family: FAMILY.pixel12, size: 12, gap: 2, threshold: 128 }
      : { family: FAMILY.pixel10, size: 10, gap: 0, threshold: 128 };
  }
  // 行书：尽量写大，但四周留一点边
  const gap = grid.cellsPerUnit === 2 ? 1 : 0;
  const byWidth = grid.w - (grid.cellsPerUnit === 2 ? 6 : 2);
  const byHeight = Math.floor((grid.h - 4 - (count - 1) * gap) / Math.max(count, 1));
  return { family: FAMILY.brush, size: Math.max(8, Math.min(byWidth, byHeight, 24)), gap, threshold: 110 };
}

/** 等字体加载好（字体文件是本地的，很快） */
export async function ensureBannerFonts(text: string, font: BannerFont): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const families = font === "pixel" ? [FAMILY.pixel12, FAMILY.pixel10] : [FAMILY.brush, FAMILY.pixel12];
  await Promise.all(families.map((f) => document.fonts.load(`16px "${f}"`, text || "奥")));
}

let scratch: HTMLCanvasElement | null = null;

function rasterizeChar(ch: string, family: string, size: number, threshold: number): Uint8Array {
  scratch ??= document.createElement("canvas");
  const pad = 4;
  const dim = size + pad * 2;
  scratch.width = dim;
  scratch.height = dim;
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, dim, dim);
  // 行书里没有的字回退到像素字，再回退到文楷
  ctx.font = `${size}px "${family}", "${FAMILY.pixel12}", "WX WenKai", sans-serif`;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(ch);
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  // 按字形的实际墨迹居中，并落在整数像素上（像素字不会被抗锯齿拆开）
  const x = Math.round(pad + (size - inkW) / 2 + m.actualBoundingBoxLeft);
  const y = Math.round(pad + (size - inkH) / 2 + m.actualBoundingBoxAscent);
  ctx.fillText(ch, x, y);
  const data = ctx.getImageData(pad, pad, size, size).data;
  const bits = new Uint8Array(size * size);
  for (let i = 0; i < bits.length; i++) bits[i] = data[i * 4 + 3] >= threshold ? 1 : 0;
  return bits;
}

/** 把一段文字竖排、居中，栅格化成幡面上的点阵 */
export function layoutBannerText(text: string, font: BannerFont, grid: TextGrid): TextPixels {
  const out = new Uint8Array(grid.w * grid.h);
  const chars = [...text].slice(0, 4);
  if (chars.length === 0) return out;
  const { family, size, gap, threshold } = fontFor(font, grid, chars.length);
  const total = chars.length * size + (chars.length - 1) * gap;
  const x0 = Math.floor((grid.w - size) / 2);
  const y0 = Math.floor((grid.h - total) / 2);
  chars.forEach((ch, i) => {
    const bits = rasterizeChar(ch, family, size, threshold);
    const top = y0 + i * (size + gap);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!bits[y * size + x]) continue;
        const gx = x0 + x;
        const gy = top + y;
        if (gx >= 0 && gy >= 0 && gx < grid.w && gy < grid.h) out[gy * grid.w + gx] = 1;
      }
    }
  });
  return out;
}

/** 像素溶解：每个点有一个固定的随机阈值，进度 p 超过它就显示新字 */
export function dissolve(from: TextPixels, to: TextPixels, p: number, grid: TextGrid): TextPixels {
  if (p >= 1) return to;
  const out = new Uint8Array(to.length);
  for (let i = 0; i < out.length; i++) {
    const r = hash01(i % grid.w, Math.floor(i / grid.w));
    out[i] = r < p ? to[i] : from[i];
  }
  return out;
}

function hash01(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
