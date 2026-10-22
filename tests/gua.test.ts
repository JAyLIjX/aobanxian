import { describe, expect, it } from "vitest";
import { branchNumber, cast, hourBranch, TRIGRAM_BY_NUMBER } from "../src/core/gua";

describe("梅花易数时间起卦", () => {
  it("先天八卦数与地支序数", () => {
    expect(TRIGRAM_BY_NUMBER.slice(1)).toEqual(["乾", "兌", "離", "震", "巽", "坎", "艮", "坤"]);
    expect(branchNumber("子")).toBe(1);
    expect(branchNumber("亥")).toBe(12);
    expect([23, 0, 1, 2, 10, 11, 13, 21, 22].map(hourBranch)).toEqual(["子", "子", "丑", "丑", "巳", "午", "未", "亥", "亥"]);
  });

  it("观梅占：辰年十二月十七日申时 → 澤火革，初爻动，变澤山咸", () => {
    const c = cast({ yearBranch: "辰", lunarMonth: 12, lunarDay: 17, hourBranch: "申" });
    expect([c.upper, c.lower, c.moving]).toEqual(["兌", "離", 1]);
    expect([c.changedUpper, c.changedLower]).toEqual(["兌", "艮"]);
  });

  it("2026-10-22（丙午年九月十三）巳时 → 風火家人，五爻动，变山火賁", () => {
    // 午 7 + 9 + 13 = 29 → 29 mod 8 = 5 巽；+ 巳 6 = 35 → 35 mod 8 = 3 離；35 mod 6 = 5
    const c = cast({ yearBranch: "午", lunarMonth: 9, lunarDay: 13, hourBranch: "巳" });
    expect([c.upper, c.lower, c.moving]).toEqual(["巽", "離", 5]);
    expect([c.changedUpper, c.changedLower]).toEqual(["艮", "離"]);
    expect(c.lines).toEqual([1, 0, 1, 0, 1, 1]);
    expect(c.changedLines).toEqual([1, 0, 1, 0, 0, 1]);
  });

  it("余数为 0 时取 8 和 6", () => {
    // 子 1 + 3 + 4 = 8 → 坤；+ 卯 4 = 12 → 12 mod 8 = 4 震；12 mod 6 = 0 → 6
    const c = cast({ yearBranch: "子", lunarMonth: 3, lunarDay: 4, hourBranch: "卯" });
    expect([c.upper, c.lower, c.moving]).toEqual(["坤", "震", 6]);
    expect([c.changedUpper, c.changedLower]).toEqual(["艮", "震"]);
  });
});

describe("每日一卦：历法数据", () => {
  it("用农历年支、农历月日起卦", async () => {
    const { castInputFor, dailyGua } = await import("../src/calendar/guaDay");
    expect(castInputFor({ year: 2026, month: 10, day: 22 }, 10)).toEqual({ yearBranch: "午", lunarMonth: 9, lunarDay: 13, hourBranch: "巳" });
    const g = dailyGua({ year: 2026, month: 10, day: 22 }, 10);
    expect([g.main.name, g.main.kingWen, g.cast.moving, g.changed.name, g.changed.kingWen]).toEqual(["家人", 37, 5, "賁", 22]);
    // 闰月按本月数：2025-07-25 是闰六月初一
    expect(castInputFor({ year: 2025, month: 7, day: 25 }, 0)).toMatchObject({ yearBranch: "巳", lunarMonth: 6, lunarDay: 1, hourBranch: "子" });
    // 春节前仍是上一个农历年：2027-02-05 腊月廿九属丙午年
    expect(castInputFor({ year: 2027, month: 2, day: 5 }, 12).yearBranch).toBe("午");
  });
});

describe("周易数据", () => {
  it("六十四卦齐全：卦辭、六爻爻辭、用九用六、八卦两两组合各一", async () => {
    const { HEXAGRAMS, ZHOUYI_SOURCE } = await import("../src/data/zhouyi");
    expect(HEXAGRAMS).toHaveLength(64);
    expect(new Set(HEXAGRAMS.map((h) => `${h.upper}${h.lower}`)).size).toBe(64);
    let lineCount = 0;
    HEXAGRAMS.forEach((h, i) => {
      expect(h.kingWen).toBe(i + 1);
      expect(h.judgment.length).toBeGreaterThan(1);
      expect(h.lines).toHaveLength(6);
      for (const l of h.lines) expect(l.length).toBeGreaterThan(1);
      lineCount += h.lines.length;
      expect(h.lineTags[0]).toMatch(/^初[九六]$/);
      expect(h.lineTags[5]).toMatch(/^上[九六]$/);
      expect(h.en.length).toBeGreaterThan(1);
      for (const lang of ["zh-CN", "zh-TW", "en"] as const) {
        expect(h.reading[lang].length, `${h.name} ${lang}`).toBeGreaterThan(20);
        expect(h.lineReadings[lang]).toHaveLength(6);
        for (const r of h.lineReadings[lang]) expect(r.length).toBeGreaterThan(5);
      }
      expect(h.reading["zh-CN"]).not.toContain("凶");
    });
    expect(lineCount).toBe(384);
    expect(HEXAGRAMS[0].extra).toEqual({ tag: "用九", text: "見羣龍无首，吉。" });
    expect(HEXAGRAMS[1].extra).toEqual({ tag: "用六", text: "利永貞。" });
    expect(HEXAGRAMS.filter((h) => h.extra)).toHaveLength(2);
    expect(ZHOUYI_SOURCE.url).toMatch(/^https:\/\/zh\.wikisource\.org\//);
  });

  it("爻题和爻的阴阳一致（九为阳、六为阴）", async () => {
    const { HEXAGRAMS } = await import("../src/data/zhouyi");
    const { TRIGRAM_LINES } = await import("../src/core/gua");
    for (const h of HEXAGRAMS) {
      const lines = [...TRIGRAM_LINES[h.lower], ...TRIGRAM_LINES[h.upper]];
      h.lineTags.forEach((tag, i) => expect(tag.includes("九") ? 1 : 0, `${h.name} ${tag}`).toBe(lines[i]));
    }
  });
});
