import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import branding from "../config/branding.json";
import { latestReleaseUrl, qrMatrix, qrPixelRect, renderShareImage, shareLayout, SHARE_H, SHARE_W, type Rect, type ShareContent } from "../src/share/shareImage";

/** 只实现 fillRect 的假 canvas：把实心色块画进 RGBA 缓冲区，文字、描边忽略 */
function fakeCanvas() {
  let buf = new Uint8ClampedArray(0);
  let w = 0;
  let color: [number, number, number] | null = null;
  const parse = (s: string): [number, number, number] | null => {
    const hex = s.match(/^#([0-9a-f]{6})$/i);
    if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as [number, number, number];
    const rgb = s.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
    return null; // 半透明的纸纹、transparent 忽略
  };
  const ctx = new Proxy(
    {
      set fillStyle(v: string) {
        color = parse(v);
      },
      fillRect(x: number, y: number, rw: number, rh: number) {
        if (!color) return;
        for (let yy = Math.max(0, y); yy < Math.min(canvas.height, y + rh); yy++) {
          for (let xx = Math.max(0, x); xx < Math.min(w, x + rw); xx++) {
            const i = (yy * w + xx) * 4;
            buf[i] = color[0];
            buf[i + 1] = color[1];
            buf[i + 2] = color[2];
            buf[i + 3] = 255;
          }
        }
      },
      measureText: (s: string) => ({ width: s.length * 20 }),
    } as Record<string, unknown>,
    {
      get: (target, key) => (key in target ? target[key as string] : () => {}),
      set: (target, key, value) => {
        if (key === "fillStyle") (target as { fillStyle: string }).fillStyle = value;
        return true;
      },
    },
  );
  const canvas = {
    _w: 0,
    _h: 0,
    get width() {
      return this._w;
    },
    set width(v: number) {
      this._w = v;
      w = v;
    },
    get height() {
      return this._h;
    },
    set height(v: number) {
      this._h = v;
      buf = new Uint8ClampedArray(w * v * 4);
    },
    getContext: () => ctx,
    pixels: () => buf,
  };
  return canvas;
}

const content = (withLot: boolean): ShareContent => ({
  dateBig: "10月22日",
  dateLine: "2026年 · 星期四",
  lunar: "农历九月十三",
  ganzhi: "丙午年 戊戌月 己巳日",
  element: "今日巳火",
  luckyLabel: "大吉",
  families: [
    { name: "黄色系", colors: ["#e0b44c", "#c08a2e", "#a86d2a"] },
    { name: "红色系", colors: ["#b83a2c", "#9b2d23", "#e46a5c"] },
  ],
  yiLabel: "宜",
  jiLabel: "忌",
  yi: ["祭祀", "出行", "嫁娶", "开市"],
  ji: ["动土", "安葬", "破土", "作灶"],
  brand: "奥半仙",
  url: branding.repository,
  qrUrl: latestReleaseUrl(branding.repository),
  scanHint: "扫码看源码",
  lot: withLot ? { title: "今日签 · 第十八签 · 中", poem: ["知君指擬是空華", "底事茫茫未有涯", "牢把腳根踏實地", "善為善應永無差"] } : undefined,
  sprite: { pixels: new Uint8ClampedArray(79 * 115 * 4), w: 79, h: 115 },
  fonts: { display: "serif", body: "serif" },
});

const inside = (r: Rect, outer: Rect) => r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("分享今日图片", () => {
  it("尺寸 1080×1440", () => {
    for (const withLot of [false, true]) {
      const c = fakeCanvas();
      renderShareImage(c as unknown as HTMLCanvasElement, content(withLot));
      expect([c.width, c.height]).toEqual([SHARE_W, SHARE_H]);
    }
  });

  it("各块都在边框内、互不重叠", () => {
    for (const withLot of [false, true]) {
      const L = shareLayout(withLot);
      const blocks = [L.sprite, L.text, L.lucky, L.yiji, L.footer, L.qr, ...(L.lot ? [L.lot] : [])];
      for (const b of blocks) expect(inside(b, L.border)).toBe(true);
      for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) expect(overlap(blocks[i], blocks[j]), `${i} ${j}`).toBe(false);
    }
  });

  it("二维码扫出来是最新版下载页（releases/latest）（从画好的图里截出来解码）", () => {
    const download = latestReleaseUrl(branding.repository);
    expect(download).toBe(`${branding.repository}/releases/latest`);
    expect(qrMatrix(download).length).toBeGreaterThanOrEqual(21);
    for (const withLot of [false, true]) {
      const c = fakeCanvas();
      renderShareImage(c as unknown as HTMLCanvasElement, content(withLot));
      const r = qrPixelRect(download, withLot);
      const px = c.pixels();
      const crop = new Uint8ClampedArray(r.w * r.h * 4);
      for (let y = 0; y < r.h; y++) crop.set(px.subarray(((r.y + y) * SHARE_W + r.x) * 4, ((r.y + y) * SHARE_W + r.x + r.w) * 4), y * r.w * 4);
      expect(jsQR(crop, r.w, r.h)?.data).toBe(download);
    }
  });
});
