import { describe, expect, it } from "vitest";
import { LunarUtil, Solar } from "lunar-javascript";
import { getDayDetail, getDayInfo, getMonthGrid } from "../src/calendar/day";
import { BRANCH_ELEMENT, STEM_ELEMENT, nayinElement } from "../src/core/elements";
import { defaultRules } from "../src/core/rules";
import { dayElement } from "../src/core/wuxing";

const raw = (y: number, m: number, d: number) => Solar.fromYmd(y, m, d).getLunar();

// 挑几个有代表性的日期：普通日、春节、立春与春节之间、节气、闰月初一、元旦
const SAMPLES: [number, number, number][] = [
  [2026, 10, 21],
  [2024, 2, 10],
  [2026, 2, 10],
  [2026, 12, 22],
  [2023, 3, 22],
  [2025, 7, 25],
  [2000, 1, 1],
];

describe("与 lunar-javascript 原始输出逐项核对", () => {
  for (const [y, m, d] of SAMPLES) {
    it(`${y}-${m}-${d}`, () => {
      const l = raw(y, m, d);
      const detail = getDayDetail({ year: y, month: m, day: d }, defaultRules);

      expect(detail.ganzhi).toEqual({
        year: l.getYearInGanZhiByLiChun(),
        month: l.getMonthInGanZhi(),
        day: l.getDayInGanZhi(),
      });
      expect(detail.pillar).toEqual({ nayin: l.getDayNaYin(), stem: l.getDayGan(), branch: l.getDayZhi() });
      expect(detail.yi).toEqual(l.getDayYi());
      expect(detail.ji).toEqual(l.getDayJi());
      expect(detail.zodiac.clash.animal).toBe(l.getDayChongShengXiao());
      expect(detail.zodiac.sha).toBe(l.getDaySha());
      expect(detail.xiu.fullName).toBe(l.getXiu() + l.getZheng() + l.getAnimal());
      expect(detail.lunar.dayName).toBe(l.getDayInChinese());
      expect(detail.outfit.day.element).toBe(l.getDayNaYin().slice(-1));
    });
  }
});

describe("已知日期的锚点", () => {
  it("2000-01-01 戊午日，天上火，农历冬月廿五", () => {
    const info = getDayInfo({ year: 2000, month: 1, day: 1 });
    expect(info.ganzhi.day).toBe("戊午");
    expect(info.pillar.nayin).toBe("天上火");
    expect(info.lunar.text).toBe("农历冬月廿五");
    expect(info.festivals).toContain("元旦节");
  });

  it("2024-02-10 春节，正月初一，甲辰日", () => {
    const info = getDayInfo({ year: 2024, month: 2, day: 10 });
    expect(info.lunar.text).toBe("农历正月初一");
    expect(info.ganzhi.day).toBe("甲辰");
    expect(info.cell).toEqual({ text: "春节", kind: "festival" });
  });

  it("年干支按立春换年：2026-02-10 已过立春、未到春节，年柱为丙午", () => {
    const info = getDayInfo({ year: 2026, month: 2, day: 10 });
    expect(info.ganzhi.year).toBe("丙午");
    expect(info.lunar.monthName).toBe("腊月");
  });

  it("节气优先显示在月历格子里", () => {
    expect(getDayInfo({ year: 2026, month: 12, day: 22 }).cell).toEqual({ text: "冬至", kind: "jieqi" });
  });

  it("闰月初一显示「闰X月」", () => {
    const info = getDayInfo({ year: 2025, month: 7, day: 25 });
    expect(info.lunar.isLeapMonth).toBe(true);
    expect(info.cell).toEqual({ text: "闰六月", kind: "month" });
  });

  it("2026-10-21 戊辰日，大林木：红、绿皆为大吉", () => {
    const detail = getDayDetail({ year: 2026, month: 10, day: 21 }, defaultRules);
    expect(detail.ganzhi).toEqual({ year: "丙午", month: "戊戌", day: "戊辰" });
    expect(detail.lunar.text).toBe("农历九月十二");
    expect(detail.outfit.primary.name).toBe("红");
    expect(detail.outfit.accent.name).toBe("绿");
    expect(detail.outfit.explanation).toBe("今日大林木：木为同气，木生火，红、绿皆为大吉");
  });
});

describe("三种 elementSource 与 lunar-javascript 自带五行表一致（六十甲子全覆盖）", () => {
  it.each(LunarUtil.JIA_ZI)("%s", (gz) => {
    const stem = gz[0];
    const branch = gz[1];
    const nayin = LunarUtil.NAYIN[gz];
    const pillar = { nayin, stem, branch };
    expect(dayElement(pillar, "nayin").element).toBe(nayinElement(nayin));
    expect(dayElement(pillar, "stem").element).toBe(LunarUtil.WU_XING_GAN[stem]);
    expect(dayElement(pillar, "branch").element).toBe(LunarUtil.WU_XING_ZHI[branch]);
    expect(STEM_ELEMENT[stem]).toBe(LunarUtil.WU_XING_GAN[stem]);
    expect(BRANCH_ELEMENT[branch]).toBe(LunarUtil.WU_XING_ZHI[branch]);
  });
});

describe("月历", () => {
  it("6 行 × 7 列，从周日开始，包含整月", () => {
    const grid = getMonthGrid(2026, 10);
    expect(grid).toHaveLength(42);
    expect(grid[0].info.weekIndex).toBe(0);
    const inMonth = grid.filter((c) => c.inMonth).map((c) => c.info.ymd.day);
    expect(inMonth).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });
});

describe("文案", () => {
  it("两年内每一天的详情里都不出现「凶」字", () => {
    const start = new Date(2026, 0, 1);
    for (let i = 0; i < 730; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const detail = getDayDetail({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }, defaultRules);
      expect(JSON.stringify(detail), `${d.toDateString()}`).not.toContain("凶");
    }
  });
});
