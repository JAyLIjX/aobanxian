/**
 * 写字区域和字号规则（纯函数，测试里直接用）。
 *
 * 写字区域 = 书写物上整块留白，扣掉 1 格边距：
 *   矩形（幡、告示、木牌）：精灵数据里的 bannerFace 四边各缩 1 格
 *   扇形（书生的扇面）：精灵数据里的 writingArc（圆心、内外半径、张开角度），半径方向各缩 1 格、弧的两头各缩 1 格
 *
 * 字号按墨迹的实际大小算，不按字体的字号：
 *   竖排：每个字墨迹高 = 区域高 ÷ 字数 × 0.9，同时墨迹宽 ≤ 区域宽 × 0.9，取较小的
 *   横排（含扇面，沿弧算）：每个字墨迹宽 = 区域宽 ÷ 字数 × 0.9，同时墨迹高 ≤ 区域高 × 0.9
 * 字按「格位」排：区域沿排字方向平分成字数份，每个字的墨迹在自己那一份里居中，整列自然居中。
 */
import type { Rect, SpriteData } from "./sprite";

export const FILL = 0.9;
export const MARGIN = 1;

export type WritingArea =
  | { kind: "rect"; writing: "vertical" | "horizontal"; box: Rect }
  | {
      kind: "arc";
      /** 扇区的外接框（格，整数），字的点阵画在这个框里 */
      box: Rect;
      /** 圆心、内外半径（格，相对精灵图左上角）、起止角度（弧度，屏幕坐标 y 向下，从左到右） */
      cx: number;
      cy: number;
      r0: number;
      r1: number;
      a0: number;
      a1: number;
    };

/** 精灵数据 → 写字区域（已扣边距，单位：格） */
export function writingArea(sprite: SpriteData): WritingArea {
  const arc = sprite.writingArc;
  if (arc) {
    const r0 = arc.r0 + MARGIN;
    const r1 = arc.r1 - MARGIN;
    const rm = (r0 + r1) / 2;
    const a0 = arc.a0 + MARGIN / rm;
    const a1 = arc.a1 - MARGIN / rm;
    // 外接框：沿两条弧和两条边采样
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i <= 64; i++) {
      const a = a0 + ((a1 - a0) * i) / 64;
      for (const r of [r0, r1]) {
        const x = arc.cx + r * Math.cos(a);
        const y = arc.cy + r * Math.sin(a);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
    const box = { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1) - Math.floor(x0), h: Math.ceil(y1) - Math.floor(y0) };
    return { kind: "arc", box, cx: arc.cx, cy: arc.cy, r0, r1, a0, a1 };
  }
  const f = sprite.bannerFace;
  return {
    kind: "rect",
    writing: sprite.writing,
    box: { x: f.x + MARGIN, y: f.y + MARGIN, w: f.w - 2 * MARGIN, h: f.h - 2 * MARGIN },
  };
}

/** 排字方向的长度和垂直方向的宽度（格）；扇面沿中线的弧长、环宽 */
export function areaExtent(area: WritingArea): { along: number; across: number } {
  if (area.kind === "arc") return { along: ((area.r0 + area.r1) / 2) * (area.a1 - area.a0), across: area.r1 - area.r0 };
  return area.writing === "vertical" ? { along: area.box.h, across: area.box.w } : { along: area.box.w, across: area.box.h };
}

/** 每个字墨迹的上限：沿排字方向 alongMax、垂直方向 acrossMax（和区域同单位） */
export function inkLimits(n: number, extent: { along: number; across: number }): { alongMax: number; acrossMax: number } {
  const count = Math.max(1, n);
  return { alongMax: (extent.along / count) * FILL, acrossMax: extent.across * FILL };
}

/**
 * 墨迹放大倍数：一组字里最大的墨迹（沿排字方向 inkAlong、垂直方向 inkAcross）放大 k 倍后两个方向都不超出上限。
 * 返回精确倍数 exact 和整数倍 integer（像素字只能整数倍放大）。
 */
export function inkScale(ink: { along: number; across: number }, limits: { alongMax: number; acrossMax: number }) {
  const exact = Math.min(limits.alongMax / Math.max(1, ink.along), limits.acrossMax / Math.max(1, ink.across));
  return { exact, integer: Math.floor(exact) };
}

/** 整数倍放大后小于目标的这个比例，就算「明显小于」 */
export const PIXEL_MIN_RATIO = 0.8;

/**
 * 像素字怎么放大：整数倍放大后不明显小于目标就用整数倍（像素格整齐）；
 * 明显小于、而且是中、大尺寸（每格 ≥ 2 个 CSS 像素）时，改成按精确倍数最近邻放大（字更大更清楚，不死守像素网格）；
 * 小尺寸或整数倍连 1 都不到时，用 max(1, 整数倍)。
 */
export function pixelScale(scale: { exact: number; integer: number }, cssCell: number): { mode: "integer" | "smooth"; k: number } {
  if (scale.integer >= 1 && scale.integer >= scale.exact * PIXEL_MIN_RATIO) return { mode: "integer", k: scale.integer };
  if (cssCell >= 2 && scale.exact >= 1) return { mode: "smooth", k: scale.exact };
  return { mode: "integer", k: Math.max(1, scale.integer) };
}

/** 第 i 个字的格位中心：矩形区域里的坐标，或扇面上的角度（单位同区域） */
export function slotCenter(i: number, n: number, start: number, length: number): number {
  return start + ((i + 0.5) * length) / Math.max(1, n);
}

/**
 * 扇面上第 i 个字：中心点（格）和旋转角（弧度）。字的「上」朝外（沿半径），按所在位置的扇骨方向转，
 * 从左到右沿中线的弧排开。
 */
export function arcGlyph(area: Extract<WritingArea, { kind: "arc" }>, i: number, n: number): { x: number; y: number; rotate: number } {
  const rm = (area.r0 + area.r1) / 2;
  const a = slotCenter(i, n, area.a0, area.a1 - area.a0);
  return { x: area.cx + rm * Math.cos(a), y: area.cy + rm * Math.sin(a), rotate: a + Math.PI / 2 };
}
