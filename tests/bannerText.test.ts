import { describe, expect, it } from "vitest";
import { planBannerText, type BannerFont } from "../src/sprite/bannerText";
import { sprite } from "../src/sprite/sprite";

const face = sprite.bannerFace;
/** 每格设备像素：小 / 中 / 大 × 普通屏 / Retina */
const UNITS = [1, 2, 3, 4, 6];
const FONTS: BannerFont[] = ["pixel", "brush"];

const glyphRatio = (count: number, font: BannerFont, unit: number) => {
  const p = planBannerText(count, font, face, unit);
  return { plan: p, ratio: (p.size * p.dot) / p.faceW, height: (count * p.size + (count - 1) * p.gap) * p.dot };
};

describe("幡上字号", () => {
  for (const font of FONTS) {
    for (const unit of UNITS) {
      it(`${font} · 每格 ${unit} 设备像素：3 个字的字宽占幡面 70%–80%`, () => {
        const { ratio, height, plan } = glyphRatio(3, font, unit);
        expect(ratio).toBeGreaterThanOrEqual(0.7);
        expect(ratio).toBeLessThanOrEqual(0.8);
        expect(height).toBeLessThanOrEqual(plan.faceH);
      });

      it(`${font} · 每格 ${unit} 设备像素：4 个字缩小到刚好放下`, () => {
        const three = glyphRatio(3, font, unit);
        const four = glyphRatio(4, font, unit);
        expect(four.height).toBeLessThanOrEqual(four.plan.faceH);
        expect(four.ratio).toBeLessThanOrEqual(three.ratio);
        expect(four.ratio).toBeLessThanOrEqual(0.8);
      });
    }
  }

  it("像素字每个点都是整数个设备像素", () => {
    for (const unit of UNITS) {
      for (const n of [1, 2, 3, 4]) {
        const p = planBannerText(n, "pixel", face, unit);
        expect(Number.isInteger(p.dot)).toBe(true);
        expect([12, 10]).toContain(p.size);
      }
    }
  });
});
