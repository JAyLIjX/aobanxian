import { describe, expect, it } from "vitest";
import { ELEMENTS, generatedBy, type Element } from "../src/core/elements";
import { defaultRules } from "../src/core/rules";
import { hitTest, isOpaque, renderSprite, sprite, type Outfit, type Ramp } from "../src/sprite/sprite";

const ramp = (e: Element): Ramp => defaultRules.pixelRamps[e].map((l) => l.hex) as Ramp;
/** 道袍 = 相（D 所生），腰带 = 旺（D） */
const outfitOf = (d: Element): Outfit => ({ robe: ramp(generatedBy(d)), sash: ramp(d) });

function hue(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const s = max === 0 ? 0 : (max - min) / max;
  const v = max / 255;
  if (max === min) return { h: 0, s, v };
  let h: number;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return { h: (h * 60 + 360) % 360, s, v };
}

/** 色键色：洋红（道袍原色）或青色（腰带原色） */
function isKeyColor(r: number, g: number, b: number) {
  const { h, s, v } = hue(r, g, b);
  if (s < 0.3 || v < 0.16) return false;
  return (h >= 280 && h <= 340) || (h >= 165 && h <= 210);
}

describe("精灵图数据", () => {
  it("尺寸与幡的位置合理", () => {
    expect(sprite.base).toHaveLength(sprite.height);
    expect(sprite.regions).toHaveLength(sprite.height);
    for (const row of [...sprite.base, ...sprite.regions]) expect(row).toHaveLength(sprite.width);
    const f = sprite.bannerFace;
    const b = sprite.banner;
    expect(f.x).toBeGreaterThanOrEqual(b.x);
    expect(f.y).toBeGreaterThanOrEqual(b.y);
    expect(f.x + f.w).toBeLessThanOrEqual(b.x + b.w);
    expect(f.y + f.h).toBeLessThanOrEqual(b.y + b.h);
  });

  it("底层调色板里没有洋红或青色", () => {
    const used = new Set(sprite.base.join("").replace(/\./g, ""));
    for (const ch of used) {
      const hex = sprite.palette[sprite.alphabet.indexOf(ch)];
      const n = parseInt(hex.slice(1), 16);
      expect(isKeyColor((n >> 16) & 255, (n >> 8) & 255, n & 255), hex).toBe(false);
    }
  });
});

describe("五种五行日子的换色", () => {
  const plain = renderSprite(sprite, { robe: ["#000000", "#000000", "#000000"], sash: ["#000000", "#000000", "#000000"] });

  for (const d of ELEMENTS) {
    it(`${d}日：不残留洋红 / 青色，道袍和腰带以外的像素与底层完全一致`, () => {
      const outfit = outfitOf(d);
      const px = renderSprite(sprite, outfit);
      const robeColors = new Set(outfit.robe.map((h) => h.toUpperCase()));
      const sashColors = new Set(outfit.sash.map((h) => h.toUpperCase()));

      for (let y = 0; y < sprite.height; y++) {
        for (let x = 0; x < sprite.width; x++) {
          const i = (y * sprite.width + x) * 4;
          const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
          const code = sprite.regions[y][x];
          if (code === ".") {
            // 底层：与不换色时完全一致
            expect([r, g, b, a]).toEqual([plain[i], plain[i + 1], plain[i + 2], plain[i + 3]]);
            if (a) expect(isKeyColor(r, g, b), `(${x},${y})`).toBe(false);
          } else {
            const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
            const [region] = sprite.regionCodes[code];
            expect((region === "robe" ? robeColors : sashColors).has(hex)).toBe(true);
            expect(a).toBe(255);
          }
          // 像素画不能半透明
          expect(a === 0 || a === 255).toBe(true);
        }
      }
    });
  }

  it("展开成卷轴时整面幡不画", () => {
    const px = renderSprite(sprite, outfitOf("木"), { hideBanner: true });
    const b = sprite.banner;
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) expect(px[(y * sprite.width + x) * 4 + 3]).toBe(0);
    }
  });
});

describe("点击分区", () => {
  it("幡面中心算点幡，道袍算点人，透明处为空", () => {
    const f = sprite.bannerFace;
    expect(hitTest(sprite, f.x + f.w / 2, f.y + f.h / 2)).toBe("banner");

    const [rx, ry] = findCell((code) => code === "b");
    expect(hitTest(sprite, rx + 0.5, ry + 0.5)).toBe("body");

    expect(hitTest(sprite, 0, sprite.height - 1)).toBe(isOpaque(sprite, 0, sprite.height - 1) ? "body" : null);
    expect(hitTest(sprite, -5, -5)).toBe(null);
  });

  it("幡范围内的透明格也点穿（不是整块矩形都能点）", () => {
    const b = sprite.banner;
    let found = false;
    for (let y = b.y; y < b.y + b.h && !found; y++) {
      for (let x = b.x; x < b.x + b.w && !found; x++) {
        if (!isOpaque(sprite, x, y)) {
          expect(hitTest(sprite, x, y)).toBe(null);
          found = true;
        }
      }
    }
    expect(found).toBe(true);
  });
});

function findCell(pred: (code: string) => boolean): [number, number] {
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) if (pred(sprite.regions[y][x])) return [x, y];
  }
  throw new Error("找不到");
}
