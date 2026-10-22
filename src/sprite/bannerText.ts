/**
 * 书写物（幡、扇面、告示、木牌）上的字：按写字区域和字数自动定字号，栅格化成设备像素点阵。
 *
 * 字号规则见 writingArea.ts：按**墨迹**的实际大小算——竖排每个字墨迹高 = 区域高 ÷ 字数 × 0.9、
 * 横排每个字墨迹宽 = 区域宽 ÷ 字数 × 0.9，另一个方向不超过区域的 90%，取较小的。
 * 字的墨迹用渲染后的包围盒量（行书字形四周留白很大，按字号算会显得很小）。
 *
 *   像素字（A 版）：Fusion Pixel 原生 12px / 10px。能整数倍放大就整数倍（像素格整齐）；
 *                  整数倍明显小于目标（不到 80%）时，中、大尺寸改成按精确倍数最近邻放大——宁可字大清楚，不死守像素网格。
 *   像素化行书（B 版）：志莽行书按墨迹缩放到目标大小，画到「半格」网格（每格设备像素为奇数时用整格）后二值化；
 *                  扇面上的字要旋转，改用 1 个设备像素的网格，不然笔画会被转断。
 *
 * 每个字放在自己的格位里居中（区域沿排字方向平分成字数份），整列在区域里居中。
 * 扇面（书生）沿中线的弧排字，每个字按所在位置的扇骨方向旋转，字的上方朝外。
 */
import { arcGlyph, areaExtent, inkLimits, inkScale, pixelScale, slotCenter, type WritingArea } from "./writingArea";

export type BannerFont = "pixel" | "brush";
export type Writing = "vertical" | "horizontal";

const FAMILY = {
  pixel12: "WX FusionPixel12",
  pixel10: "WX FusionPixel10",
  brush: "WX ZhiMangXing Banner",
};

/** 书写区上的点阵，box.w × box.h 格 = w × h 设备像素，1 表示印墨 */
export type BannerMask = Uint8Array;

export interface BannerRender {
  mask: BannerMask;
  w: number;
  h: number;
  /** 最大的字墨迹：沿排字方向、垂直方向（设备像素） */
  ink: { along: number; across: number };
  /** integer：像素字整数倍；smooth：像素字按精确倍数放大；brush：行书 */
  mode: "integer" | "smooth" | "brush";
}

/** 等字体加载好（字体文件是本地的，很快） */
export async function ensureBannerFonts(text: string, font: BannerFont): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const families = font === "pixel" ? [FAMILY.pixel12, FAMILY.pixel10] : [FAMILY.brush, FAMILY.pixel12];
  await Promise.all(families.map((f) => document.fonts.load(`16px "${f}"`, text || "奥")));
}

let scratch: HTMLCanvasElement | null = null;

/** 把一个字画成 size × size 的点阵（留出边，量墨迹用） */
function rasterizeChar(ch: string, family: string, size: number, threshold: number): Glyph {
  scratch ??= document.createElement("canvas");
  const pad = Math.ceil(size * 0.25);
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
  const data = ctx.getImageData(0, 0, dim, dim).data;
  const bits = new Uint8Array(dim * dim);
  for (let i = 0; i < bits.length; i++) bits[i] = data[i * 4 + 3] >= threshold ? 1 : 0;
  return cropInk(bits, dim);
}

interface Glyph {
  w: number;
  h: number;
  bits: Uint8Array;
}

/** 裁到墨迹的外接框（墨迹按渲染结果量，不按字号） */
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
  const w = x1 < 0 ? 0 : x1 - x0 + 1;
  const h = x1 < 0 ? 0 : y1 - y0 + 1;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) out.set(bits.subarray((y0 + y) * size + x0, (y0 + y) * size + x0 + w), y * w);
  return { w, h, bits: out };
}

/**
 * 把字形放大 k 倍（最近邻）、绕墨迹中心旋转 rot，印到 out 上，墨迹中心落在 (cx, cy)（设备像素）。
 * 不转、k 为整数时，左上角对齐到整数像素，每个字体像素正好是 k × k 个设备像素。
 */
function stamp(out: Uint8Array, W: number, H: number, g: Glyph, k: number, cx: number, cy: number, rot = 0) {
  if (!g.w || !g.h) return;
  const gw = g.w * k;
  const gh = g.h * k;
  if (rot === 0) {
    const left = Math.round(cx - gw / 2);
    const top = Math.round(cy - gh / 2);
    for (let py = Math.max(0, top); py < Math.min(H, top + Math.ceil(gh)); py++) {
      const gy = Math.floor((py - top + 0.5) / k);
      if (gy >= g.h) continue;
      for (let px = Math.max(0, left); px < Math.min(W, left + Math.ceil(gw)); px++) {
        const gx = Math.floor((px - left + 0.5) / k);
        if (gx < g.w && g.bits[gy * g.w + gx]) out[py * W + px] = 1;
      }
    }
    return;
  }
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const r = Math.ceil(Math.hypot(gw, gh) / 2) + 1;
  for (let py = Math.max(0, Math.floor(cy - r)); py < Math.min(H, Math.ceil(cy + r)); py++) {
    for (let px = Math.max(0, Math.floor(cx - r)); px < Math.min(W, Math.ceil(cx + r)); px++) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      // 反转回字形坐标
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      const gx = Math.floor(u / k + g.w / 2);
      const gy = Math.floor(v / k + g.h / 2);
      if (gx >= 0 && gy >= 0 && gx < g.w && gy < g.h && g.bits[gy * g.w + gx]) out[py * W + px] = 1;
    }
  }
}

/** 一组字形里最大的墨迹：沿排字方向、垂直方向（竖排沿高度，横排和扇面沿宽度） */
function maxInk(glyphs: Glyph[], vertical: boolean) {
  const along = Math.max(1, ...glyphs.map((g) => (vertical ? g.h : g.w)));
  const across = Math.max(1, ...glyphs.map((g) => (vertical ? g.w : g.h)));
  return { along, across };
}

/**
 * 把文字排进写字区域，画成点阵。
 * @param unit 每格设备像素
 * @param cssCell 每格 CSS 像素（小 / 中 / 大 = 1 / 2 / 3），中、大尺寸才允许像素字不按整数倍放大
 */
export function renderBannerText(text: string, font: BannerFont, area: WritingArea, unit: number, cssCell: number): BannerRender {
  const W = area.box.w * unit;
  const H = area.box.h * unit;
  const mask = new Uint8Array(W * H);
  const chars = [...text].slice(0, 4);
  const n = chars.length;
  const vertical = area.kind === "rect" && area.writing === "vertical";
  const ext = areaExtent(area);
  const limits = inkLimits(n, { along: ext.along * unit, across: ext.across * unit });
  if (!n) return { mask, w: W, h: H, ink: { along: 0, across: 0 }, mode: font === "brush" ? "brush" : "integer" };

  let glyphs: Glyph[];
  let k: number;
  let mode: BannerRender["mode"];
  if (font === "pixel") {
    // 12px、10px 两种原生字号，取放大后墨迹更大的
    let best: { glyphs: Glyph[]; k: number; mode: "integer" | "smooth"; size: number } | null = null;
    for (const [native, family] of [
      [12, FAMILY.pixel12],
      [10, FAMILY.pixel10],
    ] as const) {
      const gs = chars.map((ch) => rasterizeChar(ch, family, native, 128));
      const ink = maxInk(gs, vertical);
      const s = pixelScale(inkScale(ink, limits), cssCell);
      const size = s.k * ink.along;
      if (!best || size > best.size) best = { glyphs: gs, k: s.k, mode: s.mode, size };
    }
    ({ glyphs, k, mode } = best!);
  } else {
    // 行书：先在参考字号下量墨迹，算出目标字号，再在「半格」网格上重画（像素化）
    const REF = 96;
    const ref = chars.map((ch) => rasterizeChar(ch, FAMILY.brush, REF, 110));
    const scale = inkScale(maxInk(ref, vertical), limits).exact;
    // 半格网格（像素化）；扇面上的字要旋转，按半格转会把笔画转断，改用 1 个设备像素（更清楚）
    const dot = area.kind === "arc" ? 1 : unit % 2 === 0 ? unit / 2 : unit;
    // 重画后墨迹可能比按参考字号算的大一两个点：超出上限就把字号减一再画，直到放得下（点的大小不变）
    let size = Math.max(6, Math.floor((REF * scale) / dot));
    for (;;) {
      glyphs = chars.map((ch) => rasterizeChar(ch, FAMILY.brush, size, 110));
      const ink = maxInk(glyphs, vertical);
      if (size <= 6 || (ink.along * dot <= limits.alongMax && ink.across * dot <= limits.acrossMax)) break;
      size--;
    }
    k = dot;
    mode = "brush";
  }

  glyphs.forEach((g, i) => {
    if (area.kind === "arc") {
      const p = arcGlyph(area, i, n);
      stamp(mask, W, H, g, k, (p.x - area.box.x) * unit, (p.y - area.box.y) * unit, p.rotate);
    } else if (vertical) {
      stamp(mask, W, H, g, k, W / 2, slotCenter(i, n, 0, H));
    } else {
      stamp(mask, W, H, g, k, slotCenter(i, n, 0, W), H / 2);
    }
  });
  const ink = maxInk(glyphs, vertical);
  return { mask, w: W, h: H, ink: { along: ink.along * k, across: ink.across * k }, mode };
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
