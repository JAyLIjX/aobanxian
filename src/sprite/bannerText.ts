/**
 * 幡上的字：按幡面大小自动选字号，竖排居中，栅格化成像素点阵。
 *
 * 字宽占幡面宽度的 70%–80%（WIDTH_MAX），整体上下居中；字数多放不下时自动缩小到刚好放下。
 * 所有尺寸都在设备像素上算，保证每个点都是整数个设备像素，不会糊：
 *   像素字（A 版）：Fusion Pixel 原生 12px / 10px，按整数倍放大（每个字体像素 = p 个设备像素），
 *                  在满足宽度和高度的前提下取最大的字。
 *   像素化行书（B 版）：志莽行书画到「半格」网格（每格设备像素为奇数时用整格）后按透明度二值化。
 *                  行书字形四周留白很大，按字号算会显得很小，所以按**墨迹**的实际大小排：
 *                  最宽的字的墨迹占幡面宽度约 76%，整列字放得下。
 */
import type { Rect } from "./sprite";

export type BannerFont = "pixel" | "brush";

/** 字宽最多占幡面宽度的比例 */
const WIDTH_MAX = 0.8;
/** 上下各留一点边（占幡面高度的比例） */
const V_MARGIN = 0.04;
/** 字间距（占字号的比例）；行书字形自带留白，间距小一些 */
const GAP_RATIO = 0.12;
const GAP_RATIO_BRUSH = 0.05;

const FAMILY = {
  pixel12: "WX FusionPixel12",
  pixel10: "WX FusionPixel10",
  brush: "WX ZhiMangXing Banner",
};

/** 一次排版：在幡面里怎么画（单位都是设备像素） */
export interface BannerPlan {
  /** 幡面宽、高（设备像素） */
  faceW: number;
  faceH: number;
  /** 一个点有多大（设备像素） */
  dot: number;
  /** 字号（点） */
  size: number;
  /** 字间距（点） */
  gap: number;
  family: string;
  threshold: number;
}

/** 幡面上的点阵，faceW × faceH 设备像素，1 表示印墨 */
export type BannerMask = Uint8Array;

/** 按字数、字体、幡面和每格设备像素选字号 */
export function planBannerText(count: number, font: BannerFont, face: Rect, unit: number): BannerPlan {
  const faceW = face.w * unit;
  const faceH = face.h * unit;
  const n = Math.max(1, count);
  const usableH = faceH * (1 - V_MARGIN * 2);
  const maxW = faceW * WIDTH_MAX;

  if (font === "pixel") {
    let best: BannerPlan | null = null;
    for (const [native, family] of [
      [12, FAMILY.pixel12],
      [10, FAMILY.pixel10],
    ] as const) {
      // 先按正常字间距排，放不下再去掉字间距试一次（像素字自带 1 像素边）
      for (const gap of [Math.max(1, Math.round(native * GAP_RATIO)), 0]) {
        for (let p = Math.floor(maxW / native); p >= 1; p--) {
          const total = (n * native + (n - 1) * gap) * p;
          if (native * p > maxW || total > faceH) continue;
          if (total > usableH && gap > 0) continue;
          if (!best || native * p > best.size * best.dot) {
            best = { faceW, faceH, dot: p, size: native, gap, family, threshold: 128 };
          }
          break;
        }
      }
    }
    // 幡面小到连 1 倍都放不下时，退回 10px 的 1 倍（字会超出一点，但不会消失）
    return best ?? { faceW, faceH, dot: 1, size: 10, gap: 0, family: FAMILY.pixel10, threshold: 128 };
  }

  const dot = unit % 2 === 0 ? unit / 2 : unit;
  const byWidth = Math.floor(maxW / dot);
  // n 个字 + (n-1) 个间距放进可用高度：n·s + (n-1)·s·GAP ≤ H（间距取整后可能多 1 点，测试会兜住）
  const byHeight = Math.floor(usableH / dot / (n + (n - 1) * GAP_RATIO_BRUSH));
  const size = Math.max(6, Math.min(byWidth, byHeight));
  const gap = Math.max(1, Math.round(size * GAP_RATIO_BRUSH));
  return { faceW, faceH, dot, size, gap, family: FAMILY.brush, threshold: 110 };
}

/** 等字体加载好（字体文件是本地的，很快） */
export async function ensureBannerFonts(text: string, font: BannerFont): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const families = font === "pixel" ? [FAMILY.pixel12, FAMILY.pixel10] : [FAMILY.brush, FAMILY.pixel12];
  await Promise.all(families.map((f) => document.fonts.load(`16px "${f}"`, text || "奥")));
}

let scratch: HTMLCanvasElement | null = null;

/** 把一个字画成 size × size 的点阵（按墨迹居中、对齐整数像素） */
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
  const x = Math.round(pad + (size - inkW) / 2 + m.actualBoundingBoxLeft);
  const y = Math.round(pad + (size - inkH) / 2 + m.actualBoundingBoxAscent);
  ctx.fillText(ch, x, y);
  const data = ctx.getImageData(pad, pad, size, size).data;
  const bits = new Uint8Array(size * size);
  for (let i = 0; i < bits.length; i++) bits[i] = data[i * 4 + 3] >= threshold ? 1 : 0;
  return bits;
}

interface Glyph {
  w: number;
  h: number;
  bits: Uint8Array;
}

/** 裁到墨迹的外接框 */
function cropInk(bits: Uint8Array, size: number): Glyph {
  let x0 = size;
  let y0 = size;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!bits[y * size + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { w: 0, h: 0, bits: new Uint8Array(0) };
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) out.set(bits.subarray((y0 + y) * size + x0, (y0 + y) * size + x0 + w), y * w);
  return { w, h, bits: out };
}

/** 把点阵按 dot 放大，画到幡面的 (left, top)（设备像素） */
function blit(out: Uint8Array, faceW: number, faceH: number, g: Glyph, left: number, top: number, dot: number) {
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (!g.bits[y * g.w + x]) continue;
      for (let dy = 0; dy < dot; dy++) {
        const py = top + y * dot + dy;
        if (py < 0 || py >= faceH) continue;
        for (let dx = 0; dx < dot; dx++) {
          const px = left + x * dot + dx;
          if (px >= 0 && px < faceW) out[py * faceW + px] = 1;
        }
      }
    }
  }
}

/** 行书：按墨迹排版 */
function renderBrush(chars: string[], plan: BannerPlan, out: BannerMask) {
  const { faceW, faceH, dot, family, threshold } = plan;
  const W = Math.floor(faceW / dot);
  const H = Math.floor((faceH * (1 - V_MARGIN * 2)) / dot);
  const REF = 96;
  const ref = chars.map((ch) => cropInk(rasterizeChar(ch, family, REF, threshold), REF));
  const maxW = Math.max(1, ...ref.map((g) => g.w));
  const sumH = ref.reduce((a, g) => a + g.h, 0) || 1;
  const gapRef = REF * GAP_RATIO_BRUSH * 1.5;
  const k = Math.min((W * 0.76) / maxW, H / (sumH + gapRef * (chars.length - 1)));
  const size = Math.max(6, Math.floor(REF * k));
  const glyphs = chars.map((ch) => cropInk(rasterizeChar(ch, family, size, threshold), size));
  const gap = Math.max(1, Math.round(gapRef * k));
  const total = glyphs.reduce((a, g) => a + g.h, 0) + gap * (glyphs.length - 1);
  let top = Math.round((faceH / dot - total) / 2) * dot;
  for (const g of glyphs) {
    const left = Math.round((W - g.w) / 2) * dot;
    blit(out, faceW, faceH, g, left, top, dot);
    top += (g.h + gap) * dot;
  }
}

/** 竖排、居中，画成幡面大小的设备像素点阵 */
export function renderBannerText(text: string, plan: BannerPlan): BannerMask {
  const { faceW, faceH, dot, size, gap } = plan;
  const out = new Uint8Array(faceW * faceH);
  const chars = [...text].slice(0, 4);
  if (chars.length === 0) return out;
  if (plan.family === FAMILY.brush) {
    renderBrush(chars, plan, out);
    return out;
  }
  const glyph = size * dot;
  const total = (chars.length * size + (chars.length - 1) * gap) * dot;
  // 起点对齐到点的整数倍，点阵边界和像素网格对齐
  const x0 = Math.round((faceW - glyph) / 2 / dot) * dot;
  const y0 = Math.round((faceH - total) / 2 / dot) * dot;
  chars.forEach((ch, i) => {
    const bits = rasterizeChar(ch, plan.family, size, plan.threshold);
    const top = y0 + i * (size + gap) * dot;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!bits[y * size + x]) continue;
        for (let dy = 0; dy < dot; dy++) {
          const py = top + y * dot + dy;
          if (py < 0 || py >= faceH) continue;
          const row = py * faceW;
          for (let dx = 0; dx < dot; dx++) {
            const px = x0 + x * dot + dx;
            if (px >= 0 && px < faceW) out[row + px] = 1;
          }
        }
      }
    }
  });
  return out;
}

/**
 * 像素溶解：按 block × block 的小块，每块有一个固定的随机阈值，进度 p 超过它就显示新字。
 * 新旧两段字的字号可以不同（3 个字换 4 个字），所以在设备像素上混合。
 */
export function dissolve(from: BannerMask, to: BannerMask, p: number, faceW: number, block: number): BannerMask {
  if (p >= 1) return to;
  const out = new Uint8Array(to.length);
  for (let i = 0; i < out.length; i++) {
    const x = i % faceW;
    const y = (i - x) / faceW;
    out[i] = hash01(Math.floor(x / block), Math.floor(y / block)) < p ? to[i] : from[i];
  }
  return out;
}

function hash01(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
