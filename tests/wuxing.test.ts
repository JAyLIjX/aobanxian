import { describe, expect, it } from "vitest";
import { ELEMENTS, type Element } from "../src/core/elements";
import { defaultRules, withRules } from "../src/core/rules";
import { buildOutfit, dayElement, phasesOf, type DayPillar } from "../src/core/wuxing";

/** 旺相休囚死对照表（需求原文） */
const EXPECTED: Record<Element, { wang: Element; xiang: Element; xiu: Element; qiu: Element; si: Element }> = {
  木: { wang: "木", xiang: "火", xiu: "水", qiu: "金", si: "土" },
  火: { wang: "火", xiang: "土", xiu: "木", qiu: "水", si: "金" },
  土: { wang: "土", xiang: "金", xiu: "火", qiu: "木", si: "水" },
  金: { wang: "金", xiang: "水", xiu: "土", qiu: "火", si: "木" },
  水: { wang: "水", xiang: "木", xiu: "金", qiu: "土", si: "火" },
};

/** 每种五行挑一个真实存在的日柱，纳音五行即为该五行 */
const PILLAR_OF: Record<Element, DayPillar> = {
  木: { nayin: "松柏木", stem: "庚", branch: "寅" },
  火: { nayin: "炉中火", stem: "丙", branch: "寅" },
  土: { nayin: "路旁土", stem: "庚", branch: "午" },
  金: { nayin: "海中金", stem: "甲", branch: "子" },
  水: { nayin: "涧下水", stem: "丙", branch: "子" },
};

describe("旺相休囚死分档", () => {
  for (const d of ELEMENTS) {
    it(`${d}日`, () => {
      expect(phasesOf(d)).toEqual(EXPECTED[d]);

      const outfit = buildOutfit(PILLAR_OF[d], defaultRules);
      const e = EXPECTED[d];
      const byKey = Object.fromEntries(outfit.tiers.map((t) => [t.key, t]));

      expect(outfit.tiers.map((t) => t.label)).toEqual(["大吉", "平", "慎穿", "不宜"]);
      expect(byKey.best.entries.map((x) => x.element)).toEqual([e.xiang, e.wang]);
      expect(byKey.best.entries.map((x) => x.phase)).toEqual(["xiang", "wang"]);
      expect(byKey.neutral.entries.map((x) => x.element)).toEqual([e.xiu]);
      expect(byKey.caution.entries.map((x) => x.element)).toEqual([e.qiu]);
      expect(byKey.avoid.entries.map((x) => x.element)).toEqual([e.si]);

      // 五个五行各出现一次
      const all = outfit.tiers.flatMap((t) => t.entries.map((x) => x.element)).sort();
      expect(all).toEqual([...ELEMENTS].sort());

      // 默认 topPriority = xiang：上衣是「相」，围巾是「旺」
      expect(outfit.primary.element).toBe(e.xiang);
      expect(outfit.accent.element).toBe(e.wang);
      expect(outfit.primary.hex).toBe(defaultRules.palettes[e.xiang][0].hex);
      expect(outfit.accent.hex).toBe(defaultRules.palettes[e.wang][0].hex);
    });
  }

  it("木日：红、绿皆为大吉，解释句同时说两个", () => {
    const outfit = buildOutfit(PILLAR_OF.木, defaultRules);
    expect(outfit.tiers[0].entries.map((e) => defaultRules.colorFamilies[e.element].name)).toEqual(["红色系", "绿色系"]);
    expect(outfit.explanation).toBe("今日松柏木：木为同气，木生火，红、绿皆为大吉");
  });

  it("每档带上完整色系", () => {
    const outfit = buildOutfit(PILLAR_OF.木, defaultRules);
    const neutral = outfit.tiers.find((t) => t.key === "neutral")!;
    expect(neutral.entries[0].colors.map((c) => c.name)).toEqual(["黑", "蓝", "藏青", "灰"]);
  });
});

describe("elementSource 三种取法", () => {
  // 庚子日：纳音壁上土，日干庚金，日支子水，三种取法结果各不相同
  const gengzi: DayPillar = { nayin: "壁上土", stem: "庚", branch: "子" };

  it("nayin 取纳音最后一个字", () => {
    expect(dayElement(gengzi, "nayin")).toEqual({ element: "土", source: "nayin", label: "壁上土" });
  });
  it("stem 取日干", () => {
    expect(dayElement(gengzi, "stem")).toEqual({ element: "金", source: "stem", label: "庚金" });
  });
  it("branch 取日支", () => {
    expect(dayElement(gengzi, "branch")).toEqual({ element: "水", source: "branch", label: "子水" });
  });

  it("取法改变时分档随之改变", () => {
    const stem = buildOutfit(gengzi, withRules({ elementSource: "stem" }));
    expect(stem.day.element).toBe("金");
    expect(stem.primary.element).toBe("水");
    expect(stem.accent.element).toBe("金");
    expect(stem.explanation).toBe("今日庚金：金为同气，金生水，蓝、白皆为大吉");
  });
});

describe("topPriority 切换", () => {
  for (const d of ELEMENTS) {
    it(`${d}日 wang 优先时主色与点缀色互换`, () => {
      const xiang = buildOutfit(PILLAR_OF[d], defaultRules);
      const wang = buildOutfit(PILLAR_OF[d], withRules({ topPriority: "wang" }));

      expect(wang.primary.element).toBe(EXPECTED[d].wang);
      expect(wang.accent.element).toBe(EXPECTED[d].xiang);
      expect(wang.primary).toEqual(xiang.accent);
      expect(wang.accent).toEqual(xiang.primary);
      // 大吉的两个平等：不管哪个画在小人身上，界面上总是相在前
      expect(wang.tiers[0].entries.map((x) => x.phase)).toEqual(["xiang", "wang"]);
      expect(wang.explanation).toBe(xiang.explanation);
    });
  }


});
