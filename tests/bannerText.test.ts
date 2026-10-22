import { describe, expect, it } from "vitest";
import { CHARACTERS, getCharacter } from "../src/sprite/characters";
import { arcGlyph, areaExtent, FILL, inkLimits, inkScale, PIXEL_MIN_RATIO, pixelScale, writingArea } from "../src/sprite/writingArea";

describe("写字区域", () => {
  it("矩形书写物：整块留白扣掉 1 格边距", () => {
    for (const id of ["daoshi", "guanyuan", "heshang"]) {
      const d = getCharacter(id).data;
      const a = writingArea(d);
      expect(a.kind).toBe("rect");
      expect(a.box).toEqual({ x: d.bannerFace.x + 1, y: d.bannerFace.y + 1, w: d.bannerFace.w - 2, h: d.bannerFace.h - 2 });
    }
  });

  it("书生的扇面是扇区，不再是中间的小矩形；扣边距后仍比原来的矩形大得多", () => {
    const d = getCharacter("shusheng").data;
    const a = writingArea(d);
    expect(a.kind).toBe("arc");
    if (a.kind !== "arc") return;
    const arcArea = ((a.r1 * a.r1 - a.r0 * a.r0) / 2) * (a.a1 - a.a0);
    expect(arcArea).toBeGreaterThan(d.bannerFace.w * d.bannerFace.h * 1.3);
    // 扇面张开 90° 以上，朝上
    expect(a.a1 - a.a0).toBeGreaterThan(Math.PI / 2);
    expect((a.a0 + a.a1) / 2).toBeLessThan(0);
    // 扇区外接框在书写物范围里
    const b = d.banner;
    expect(a.box.x >= b.x && a.box.y >= b.y && a.box.x + a.box.w <= b.x + b.w && a.box.y + a.box.h <= b.y + b.h).toBe(true);
  });
});

describe("字号：按墨迹算，填到 90%", () => {
  it("竖排：墨迹高 = 区域高 ÷ 字数 × 0.9，墨迹宽 ≤ 区域宽 × 0.9", () => {
    expect(inkLimits(3, { along: 40, across: 14 })).toEqual({ alongMax: 12, acrossMax: 14 * FILL });
    expect(inkLimits(4, { along: 40, across: 14 })).toEqual({ alongMax: 9, acrossMax: 14 * FILL });
  });

  it("取两个方向里较小的倍数", () => {
    expect(inkScale({ along: 10, across: 10 }, { alongMax: 30, acrossMax: 50 })).toEqual({ exact: 3, integer: 3 });
    expect(inkScale({ along: 10, across: 10 }, { alongMax: 50, acrossMax: 25 })).toEqual({ exact: 2.5, integer: 2 });
  });

  it("像素字：整数倍够大就用整数倍；明显小于目标时，中、大尺寸改成精确倍数，小尺寸仍整数倍", () => {
    expect(pixelScale({ exact: 4.4, integer: 4 }, 2)).toEqual({ mode: "integer", k: 4 });
    expect(pixelScale({ exact: 1.9, integer: 1 }, 2)).toEqual({ mode: "smooth", k: 1.9 });
    expect(pixelScale({ exact: 1.9, integer: 1 }, 1)).toEqual({ mode: "integer", k: 1 });
    expect(pixelScale({ exact: 0.7, integer: 0 }, 1)).toEqual({ mode: "integer", k: 1 });
    // 边界：整数倍正好是目标的 80%
    expect(pixelScale({ exact: 5, integer: 4 }, 2).mode).toBe(PIXEL_MIN_RATIO <= 0.8 ? "integer" : "smooth");
  });

  // Fusion Pixel 12px 里汉字的墨迹大约 11 × 11 个字体像素（行书按实际墨迹直接缩放，只会更接近目标）
  const PIXEL_INK = 11;
  for (const c of CHARACTERS) {
    for (const dpr of [1, 2]) {
      it(`${c.id}：中尺寸（每格 2 CSS 像素）、${dpr} 倍屏，3 个字墨迹 ≥ 14、4 个字 ≥ 11 屏幕像素`, () => {
        const unit = 2 * dpr;
        const ext = areaExtent(writingArea(c.data));
        for (const [n, min] of [
          [3, 14],
          [4, 11],
        ] as const) {
          const limits = inkLimits(n, { along: ext.along * unit, across: ext.across * unit });
          const s = pixelScale(inkScale({ along: PIXEL_INK, across: PIXEL_INK }, limits), 2);
          expect((s.k * PIXEL_INK) / dpr, `${n} 个字`).toBeGreaterThanOrEqual(min);
        }
      });
    }
  }
});

describe("扇面沿弧排字", () => {
  const a = writingArea(getCharacter("shusheng").data);
  if (a.kind !== "arc") throw new Error("书生应该是扇面");

  it("字从左到右沿中线的弧排开，每个字按扇骨方向转（字的上方朝外）", () => {
    for (const n of [3, 4]) {
      const ps = Array.from({ length: n }, (_, i) => arcGlyph(a, i, n));
      const rm = (a.r0 + a.r1) / 2;
      for (const p of ps) {
        expect(Math.hypot(p.x - a.cx, p.y - a.cy)).toBeCloseTo(rm, 6);
        // 旋转后字的「上」方向 (sin r, -cos r) 指向远离圆心
        const up = { x: Math.sin(p.rotate), y: -Math.cos(p.rotate) };
        expect(up.x * (p.x - a.cx) + up.y * (p.y - a.cy)).toBeGreaterThan(0);
      }
      for (let i = 1; i < n; i++) expect(ps[i].x).toBeGreaterThan(ps[i - 1].x);
    }
  });

  it("按 90% 规则算出的墨迹框四个角都在扇面留白里（不出扇面）", () => {
    const raw = getCharacter("shusheng").data.writingArc!;
    for (const n of [3, 4]) {
      const ext = areaExtent(a);
      const { alongMax, acrossMax } = inkLimits(n, ext);
      const size = Math.min(alongMax, acrossMax); // 方字
      for (let i = 0; i < n; i++) {
        const p = arcGlyph(a, i, n);
        const cos = Math.cos(p.rotate);
        const sin = Math.sin(p.rotate);
        for (const [u, v] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          const x = p.x + (u * size * cos) / 2 - (v * size * sin) / 2;
          const y = p.y + (u * size * sin) / 2 + (v * size * cos) / 2;
          const r = Math.hypot(x - a.cx, y - a.cy);
          const ang = Math.atan2(y - a.cy, x - a.cx);
          expect(r).toBeGreaterThanOrEqual(raw.r0);
          expect(r).toBeLessThanOrEqual(raw.r1);
          expect(ang).toBeGreaterThanOrEqual(raw.a0);
          expect(ang).toBeLessThanOrEqual(raw.a1);
        }
      }
    }
  });
});
