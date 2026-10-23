import { describe, expect, it } from "vitest";
import { branchNumber, cast, hourBranch, huGua, LINE_POSITIONS, tiYong, tiYongRelation, TRIGRAM_BY_NUMBER } from "../src/core/gua";

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

describe("体用、互卦", () => {
  it("今天（2026-10-22，九月十三）未时：本卦巽，用为下卦巽、体为上卦巽，比和；互卦火泽睽；变卦风天小畜", async () => {
    const { castInputFor, dailyGua } = await import("../src/calendar/guaDay");
    expect(castInputFor({ year: 2026, month: 10, day: 22 }, 14)).toEqual({ yearBranch: "午", lunarMonth: 9, lunarDay: 13, hourBranch: "未" });
    const g = dailyGua({ year: 2026, month: 10, day: 22 }, 14);
    expect([g.main.name, g.cast.upper, g.cast.lower, g.cast.moving]).toEqual(["巽", "巽", "巽", 1]);
    expect(g.tiYong).toMatchObject({ yong: "巽", ti: "巽", yongIs: "lower", tiElement: "木", yongElement: "木", relation: "biHe", tone: "smooth" });
    expect([g.hu.name, g.hu.upper, g.hu.lower]).toEqual(["睽", "離", "兌"]);
    expect([g.changed.name, g.changed.upper, g.changed.lower]).toEqual(["小畜", "巽", "乾"]);
    expect(LINE_POSITIONS[g.cast.moving - 1]).toBe("初爻");
    expect(g.main.lineTags[g.cast.moving - 1]).toBe("初六");
  });

  it("观梅占（泽火革，初爻动）：用离火克体兑金 → 有阻力；互卦天风姤", () => {
    const c = cast({ yearBranch: "辰", lunarMonth: 12, lunarDay: 17, hourBranch: "申" });
    expect(tiYong(c)).toMatchObject({ yong: "離", ti: "兌", relation: "yongKeTi", tone: "resistance" });
    expect(huGua(c.lines)).toMatchObject({ upper: "乾", lower: "巽" });
  });

  it("2026-10-22 巳时（风火家人，五爻动）：用巽木生体离火 → 顺；互卦火水未济", () => {
    const c = cast({ yearBranch: "午", lunarMonth: 9, lunarDay: 13, hourBranch: "巳" });
    expect(tiYong(c)).toMatchObject({ yong: "巽", ti: "離", yongIs: "upper", relation: "yongShengTi", tone: "smooth" });
    expect(huGua(c.lines)).toMatchObject({ upper: "離", lower: "坎" });
  });

  it("子年三月初四卯时（地雷复，上爻动）：用坤土、体震木，体克用 → 顺；互卦坤为地", () => {
    const c = cast({ yearBranch: "子", lunarMonth: 3, lunarDay: 4, hourBranch: "卯" });
    expect(tiYong(c)).toMatchObject({ yong: "坤", ti: "震", relation: "tiKeYong", tone: "smooth" });
    expect(huGua(c.lines)).toMatchObject({ upper: "坤", lower: "坤" });
  });

  it("五种关系：用生体、体克用、比和为顺；体生用、用克体为有阻力", () => {
    expect(tiYongRelation("火", "木")).toBe("yongShengTi");
    expect(tiYongRelation("金", "木")).toBe("tiKeYong");
    expect(tiYongRelation("水", "水")).toBe("biHe");
    expect(tiYongRelation("木", "火")).toBe("tiShengYong");
    expect(tiYongRelation("木", "金")).toBe("yongKeTi");
  });

  it("乾为天、坤为地的互卦还是自己；互卦只有 16 种", () => {
    const all = new Set<string>();
    for (let n = 0; n < 64; n++) {
      const lines = Array.from({ length: 6 }, (_, i) => (n >> i) & 1);
      const h = huGua(lines);
      all.add(`${h.upper}${h.lower}`);
    }
    expect(all.size).toBe(16);
    expect(huGua([1, 1, 1, 1, 1, 1])).toMatchObject({ upper: "乾", lower: "乾" });
    expect(huGua([0, 0, 0, 0, 0, 0])).toMatchObject({ upper: "坤", lower: "坤" });
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

describe("彖传、象传与自撰白话", () => {
  it("64 卦都有彖传、大象传、六条小象传（乾坤另有用九用六），原文来自维基文库", async () => {
    const { HEXAGRAMS, ZHOUYI_SOURCE } = await import("../src/data/zhouyi");
    expect(Object.keys((ZHOUYI_SOURCE as { revisions: Record<string, number> }).revisions)).toHaveLength(64);
    for (const h of HEXAGRAMS) {
      expect(h.tuan.length, h.name).toBeGreaterThan(10);
      expect(h.daxiang, h.name).toMatch(/君子|先王|后|大人|上以/);
      expect(h.xiaoxiang, h.name).toHaveLength(h.name === "乾" || h.name === "坤" ? 7 : 6);
      for (const x of [h.tuan, h.daxiang, ...h.xiaoxiang]) expect(x, h.name).not.toMatch(/[{}<>|*'■]/);
    }
    const xun = HEXAGRAMS.find((h) => h.name === "巽")!;
    expect(xun.tuan).toBe("重巽以申命，剛巽乎中正而志行。柔皆順乎剛，是以小亨，利有攸往，利見大人。");
    expect(xun.daxiang).toBe("隨風，巽；君子以申命行事。");
    expect(xun.xiaoxiang[0]).toBe("進退，志疑也。利武人之貞，志治也。");
    const qian = HEXAGRAMS.find((h) => h.name === "乾")!;
    expect(qian.daxiang).toBe("天行健，君子以自強不息。");
    expect(qian.xiaoxiang[6]).toBe("用九，天德不可為首也。");
  });

  it("每卦的卦象画面、彖传白话、大象传白话、一句话、主题短语都有三种语言，不出现「凶」", async () => {
    const { HEXAGRAMS } = await import("../src/data/zhouyi");
    for (const h of HEXAGRAMS) {
      for (const k of ["image", "tuanPlain", "daxiangPlain", "brief", "theme"] as const) {
        for (const lang of ["zh-CN", "zh-TW", "en"] as const) {
          expect(h[k][lang], `${h.name} ${k} ${lang}`).toBeTruthy();
          expect(h[k][lang], `${h.name} ${k} ${lang}`).not.toContain("凶");
        }
      }
      expect(h.nameLocal?.["zh-CN"], h.name).toBeTruthy();
    }
  });
});
