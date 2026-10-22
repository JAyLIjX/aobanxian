import { describe, expect, it } from "vitest";
import { ELEMENTS, generatedBy, type Element } from "../src/core/elements";
import { defaultRules } from "../src/core/rules";
import { planBannerText } from "../src/sprite/bannerText";
import { CHARACTERS, getCharacter } from "../src/sprite/characters";
import { hitTest, inBanner, renderSprite, type Outfit, type Ramp } from "../src/sprite/sprite";

const ramp = (e: Element): Ramp => defaultRules.pixelRamps[e].map((l) => l.hex) as Ramp;
const outfitOf = (d: Element): Outfit => ({ robe: ramp(generatedBy(d)), sash: ramp(d) });

/** 色键色：洋红（主色区原色）或青色（配色区原色） */
function isKeyColor(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const s = max === 0 ? 0 : (max - min) / max;
  if (s < 0.3 || max / 255 < 0.16 || max === min) return false;
  let h: number;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  h = (h * 60 + 360) % 360;
  return (h >= 280 && h <= 340) || (h >= 165 && h <= 210);
}

describe("四个角色", () => {
  it("书生、青天大老爷、小和尚都在清单里，道士排第一", () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(["daoshi", "guanyuan", "heshang", "shusheng"]);
    expect(getCharacter("shusheng").data.writing).toBe("horizontal");
    expect(getCharacter("guanyuan").data.writing).toBe("horizontal");
    expect(getCharacter("heshang").data.writing).toBe("vertical");
  });

  it("展开日历：幡收起、告示原地展开成卡片；扇面、木牌不动，卡片从人物下方展开", () => {
    expect(Object.fromEntries(CHARACTERS.map((c) => [c.id, c.unroll]))).toEqual({
      daoshi: "writing",
      guanyuan: "inPlace",
      shusheng: "body",
      heshang: "body",
    });
  });

  it("精灵图高度和道士相差 10% 以内（桌面上看起来一样大）", () => {
    const h = getCharacter("daoshi").data.height;
    for (const c of CHARACTERS) expect(Math.abs(c.data.height - h) / h, c.id).toBeLessThanOrEqual(0.1);
  });
});

describe.each(CHARACTERS.filter((c) => c.id !== "daoshi").map((c) => [c.id, c.data] as const))("%s", (_id, data) => {
  const plain = renderSprite(data, { robe: ["#000000", "#000000", "#000000"], sash: ["#000000", "#000000", "#000000"] });

  it("数据完整，写字面在书写物里面", () => {
    expect(data.base).toHaveLength(data.height);
    for (const row of [...data.base, ...data.regions]) expect(row).toHaveLength(data.width);
    const f = data.bannerFace;
    const b = data.banner;
    expect(f.x >= b.x && f.y >= b.y && f.x + f.w <= b.x + b.w && f.y + f.h <= b.y + b.h).toBe(true);
    // 写字面中心算点书写物
    expect(hitTest(data, f.x + f.w / 2, f.y + f.h / 2)).toBe("banner");
  });

  for (const d of ELEMENTS) {
    it(`${d}日：没有洋红 / 青色残留，主色和配色以外的像素与底层一致`, () => {
      const outfit = outfitOf(d);
      const px = renderSprite(data, outfit);
      const allowed = { robe: new Set(outfit.robe.map((h) => h.toUpperCase())), sash: new Set(outfit.sash.map((h) => h.toUpperCase())) };
      for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
          const i = (y * data.width + x) * 4;
          const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
          const code = data.regions[y][x];
          if (code === ".") {
            expect([r, g, b, a]).toEqual([plain[i], plain[i + 1], plain[i + 2], plain[i + 3]]);
            if (a) expect(isKeyColor(r, g, b), `(${x},${y})`).toBe(false);
          } else {
            const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
            expect(allowed[data.regionCodes[code][0]].has(hex)).toBe(true);
          }
          expect(a === 0 || a === 255).toBe(true);
        }
      }
    });
  }

  it("书写物层 + 身体层 = 完整的角色", () => {
    const full = renderSprite(data, outfitOf("火"));
    const body = renderSprite(data, outfitOf("火"), { hideBanner: true });
    const banner = renderSprite(data, outfitOf("火"), { onlyBanner: true });
    for (let i = 0; i < full.length; i += 4) {
      const src = body[i + 3] ? body : banner;
      expect([src[i], src[i + 1], src[i + 2], src[i + 3]]).toEqual([full[i], full[i + 1], full[i + 2], full[i + 3]]);
    }
  });

  it("写字面上「奥半仙」三个字按书写区的方向排得下", () => {
    for (const unit of [1, 2, 4, 6]) {
      const p = planBannerText(3, "pixel", data.bannerFace, unit, data.writing);
      const glyph = p.size * p.dot;
      const across = data.writing === "horizontal" ? p.faceH : p.faceW;
      // 书生的扇面只有 9 格高：最小尺寸、普通屏（每格 1 个设备像素）时连 10px 的像素字都放不下，
      // 退回 10px 一倍（超出的 1px 被裁掉）；Retina 或中、大尺寸都放得下
      if (across < 10) {
        expect([p.size, p.dot]).toEqual([10, 1]);
        continue;
      }
      const along = (3 * p.size + 2 * p.gap) * p.dot;
      if (data.writing === "horizontal") {
        expect(glyph, `unit ${unit}`).toBeLessThanOrEqual(p.faceH);
        expect(along).toBeLessThanOrEqual(p.faceW);
      } else {
        expect(glyph).toBeLessThanOrEqual(p.faceW);
        expect(along).toBeLessThanOrEqual(p.faceH);
      }
    }
  });
});

describe("点击分区（具体位置）", () => {
  it("小和尚：紧贴木牌的耳朵算点人，木牌算点书写物", () => {
    const d = getCharacter("heshang").data;
    for (const [x, y] of [[36, 38], [38, 40], [39, 42]]) expect(hitTest(d, x + 0.5, y + 0.5), `(${x},${y})`).toBe("body");
    expect(hitTest(d, 48.5, 30.5)).toBe("banner");
  });

  it("青天大老爷：告示两头的金头算告示（展开时一起变成卡片），握轴的手算人", () => {
    const d = getCharacter("guanyuan").data;
    for (const [x, y] of [[15, 84], [80, 84], [16, 57], [80, 57]]) expect(inBanner(d, x, y), `(${x},${y})`).toBe(true);
    for (const [x, y] of [[10, 66], [84, 66]]) expect(hitTest(d, x + 0.5, y + 0.5), `(${x},${y})`).toBe("body");
    // 告示中间上方是衣领、胡子，算人
    expect(inBanner(d, 45, 56)).toBe(false);
  });

  it("书生：扇面算点书写物，脸和袍子算人", () => {
    const d = getCharacter("shusheng").data;
    expect(hitTest(d, 20.5, 55.5)).toBe("banner");
    expect(hitTest(d, 30.5, 25.5)).toBe("body");
    expect(hitTest(d, 40.5, 95.5)).toBe("body");
  });
});
