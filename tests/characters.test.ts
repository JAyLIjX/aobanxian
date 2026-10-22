import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CHARACTERS, getCharacter } from "../src/sprite/characters";
import { mergeSettings } from "../src/settings/settings";
import { planBannerText } from "../src/sprite/bannerText";
import { hitTest, sprite } from "../src/sprite/sprite";

/** 键排序后的 JSON，和 Python json.dumps(sort_keys=True, separators=(",", ":")) 一致 */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

describe("角色框架", () => {
  it("角色清单里有道士，排第一，id 未知时退回道士", () => {
    expect(CHARACTERS[0].id).toBe("daoshi");
    expect(CHARACTERS[0].name).toEqual({ "zh-CN": "道士", "zh-TW": "道士", en: "Taoist" });
    expect(getCharacter("nobody").id).toBe("daoshi");
    expect(getCharacter("daoshi").data).toBe(sprite);
    expect(sprite.writing).toBe("vertical");
  });

  it("道士搬到 assets/character/daoshi/ 后精灵数据和搬家前完全一样", () => {
    // 搬家前 src/assets/sprite/daoshi.json（去掉 $comment）的指纹
    const { $comment: _c, id: _id, writing: _w, ...rest } = sprite as unknown as Record<string, unknown>;
    void _c;
    void _id;
    void _w;
    expect(createHash("sha256").update(canonical(rest)).digest("hex")).toBe("9406a3eee6a2132e1767d73d87caf94a9ec09f6be36620703ef727ed2544ecc4");
    expect(sprite.banner).toEqual({ x: 46, y: 0, w: 33, h: 65 });
    expect(sprite.bannerFace).toEqual({ x: 56, y: 14, w: 16, h: 42 });
    expect(sprite.headTop).toBe(14);
    // 点击分区照旧：幡面中心点幡，道袍点人
    expect(hitTest(sprite, 64, 35)).toBe("banner");
    expect(hitTest(sprite, 30, 90)).toBe("body");
  });

  it("设置里的角色只接受清单里的 id", () => {
    expect(mergeSettings({}).character).toBe("daoshi");
    expect(mergeSettings({ character: "nobody" }).character).toBe("daoshi");
  });

  it("横排书写区：字高不超过 80%，整行放得下", () => {
    const face = { x: 0, y: 0, w: 42, h: 16 };
    for (const unit of [2, 4]) {
      for (const n of [2, 3, 4]) {
        const p = planBannerText(n, "pixel", face, unit, "horizontal");
        expect(p.horizontal).toBe(true);
        expect([p.faceW, p.faceH]).toEqual([42 * unit, 16 * unit]);
        expect(p.size * p.dot).toBeLessThanOrEqual(p.faceH * 0.8);
        expect((n * p.size + (n - 1) * p.gap) * p.dot).toBeLessThanOrEqual(p.faceW);
        // 和把书写区转 90° 按竖排算出的字号一样
        const v = planBannerText(n, "pixel", { x: 0, y: 0, w: 16, h: 42 }, unit);
        expect([p.size, p.dot, p.gap]).toEqual([v.size, v.dot, v.gap]);
      }
    }
  });
});
