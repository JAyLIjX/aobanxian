import { describe, expect, it } from "vitest";
import { placePanel, toLocal, windowRect, type Rect } from "../src/core/layout";

const work: Rect = { x: 0, y: 25, w: 1512, h: 920 };
const spriteSize = { w: 158, h: 230 };
const bannerOffsetX = 126; // 幡中心在道士图里的横坐标
const panel = { w: 320, h: 300 };
const chrome = { top: 56, left: 90, right: 120, bottom: 12 };
const margin = 8;

function inside(r: Rect, outer: Rect) {
  return r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;
}

function place(x: number, y: number, size = panel) {
  const sprite = { x, y, ...spriteSize };
  const placement = placePanel({ work, sprite, bannerCenterX: x + bannerOffsetX, panel: size, gap: 6, margin });
  const win = windowRect(sprite, chrome, placement.rect);
  return { sprite, placement, win };
}

describe("卷轴布局", () => {
  it("屏幕中间：以幡为中心向下展开", () => {
    const { sprite, placement } = place(600, 200);
    expect(placement.direction).toBe("down");
    expect(placement.rect.x + placement.rect.w / 2).toBe(600 + bannerOffsetX);
    expect(placement.rect.y).toBe(sprite.y + sprite.h + 6);
  });

  const corners: [string, number, number][] = [
    ["左上角", 0, work.y],
    ["右上角", work.w - spriteSize.w, work.y],
    ["左下角", 0, work.y + work.h - spriteSize.h],
    ["右下角", work.w - spriteSize.w, work.y + work.h - spriteSize.h],
  ];

  for (const [name, x, y] of corners) {
    it(`${name}：卡片不超出屏幕，道士位置不动`, () => {
      const { sprite, placement, win } = place(x, y);
      expect(inside(placement.rect, { x: work.x + margin, y: work.y + margin, w: work.w - 2 * margin, h: work.h - 2 * margin })).toBe(true);
      // 窗口包含道士，道士在窗口内的位置 = 屏幕位置 - 窗口原点，换算回去不变
      const local = toLocal(sprite, win);
      expect(local.x + win.x).toBe(sprite.x);
      expect(local.y + win.y).toBe(sprite.y);
      expect(inside(sprite, win)).toBe(true);
      expect(inside(placement.rect, win)).toBe(true);
    });
  }

  it("下方放不下时向上展开", () => {
    const { placement, sprite } = place(600, work.y + work.h - spriteSize.h - 10);
    expect(placement.direction).toBe("up");
    expect(placement.rect.y + placement.rect.h).toBe(sprite.y - 6);
  });

  it("靠右边时往屏幕内收", () => {
    const { placement } = place(work.w - spriteSize.w, 300);
    expect(placement.rect.x + placement.rect.w).toBe(work.w - margin);
  });

  it("上下都放不下（卡片太高）：放在空间大的一侧并压回屏幕内", () => {
    const { placement } = place(600, 300, { w: 320, h: 800 });
    expect(placement.direction).toBe("down");
    expect(placement.rect.y + placement.rect.h).toBeLessThanOrEqual(work.y + work.h - margin);
    expect(placement.rect.y).toBeGreaterThanOrEqual(work.y + margin);
  });
});
