/**
 * 详情「更多黄历」：值星、吉时、吉神方位、彭祖百忌、物候、月相（取自 lunar-javascript），以及每日一诗的轮换。
 */
import { describe, expect, it } from "vitest";
import { getDayExtras } from "../src/calendar/extras";
import { getDayInfo } from "../src/calendar/day";
import { poemIndexOfDay } from "../src/core/poem";
import { glossaryKeys } from "../src/i18n/terms";
import { POEMS, POEM_SOURCE, poemOfDay } from "../src/data/poems";

const days = (from: Date, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  });

describe("更多黄历", () => {
  it("2026-10-22：危日、寒露三候菊有黄花、己不破券 巳不远行", () => {
    const x = getDayExtras({ year: 2026, month: 10, day: 22 });
    expect(x.zhiXing).toBe("危");
    expect(x.wuhou).toEqual({ jieqi: "寒露", hou: "三候", name: "菊有黄花" });
    expect(x.pengzu).toEqual(["己不破券", "巳不远行"]);
    expect(x.positions).toEqual({ xi: "东北", fu: "正北", cai: "正北" });
    expect(x.luckyHours.map((h) => h.branch)).toEqual(["丑", "辰", "午", "未", "戌", "亥", "子"]);
    expect(x.luckyHours[0]).toEqual({ branch: "丑", start: "01:00", end: "02:59" });
  });

  it("两年内每一天：词都在术语表里（有英文、繁体），彭祖百忌只取前半句，不出现「凶」", () => {
    const keys = {
      zhixing: new Set(glossaryKeys("zhixing")),
      pengzu: new Set(glossaryKeys("pengzu")),
      wuhou: new Set(glossaryKeys("wuhou")),
      yuexiang: new Set(glossaryKeys("yuexiang")),
      direction: new Set(glossaryKeys("direction")),
      hou: new Set(glossaryKeys("hou")),
      jieqi: new Set(glossaryKeys("jieqi")),
    };
    for (const ymd of days(new Date(2026, 0, 1), 731)) {
      const x = getDayExtras(ymd);
      const at = `${ymd.year}-${ymd.month}-${ymd.day}`;
      expect(keys.zhixing.has(x.zhiXing), at).toBe(true);
      for (const p of x.pengzu) {
        expect(p).toHaveLength(4);
        expect(keys.pengzu.has(p), `${at} ${p}`).toBe(true);
      }
      expect(keys.wuhou.has(x.wuhou.name), at).toBe(true);
      expect(keys.hou.has(x.wuhou.hou), at).toBe(true);
      expect(keys.jieqi.has(x.wuhou.jieqi), at).toBe(true);
      expect(keys.yuexiang.has(x.yueXiang), `${at} ${x.yueXiang}`).toBe(true);
      for (const dir of Object.values(x.positions)) expect(keys.direction.has(dir), `${at} ${dir}`).toBe(true);
      expect(x.luckyHours.length).toBeGreaterThan(0);
      expect(JSON.stringify(x)).not.toContain("凶");
    }
  });
});

describe("每日一诗", () => {
  it("按儒略日轮换：相邻两天不同，一轮里每首都出现一次", () => {
    const n = 77;
    const start = getDayInfo({ year: 2026, month: 10, day: 22 }).julianDay;
    const seen = new Set<number>();
    for (let i = 0; i < n; i++) {
      const k = poemIndexOfDay(start + i, n);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(n);
      if (i > 0) expect(k).not.toBe(poemIndexOfDay(start + i - 1, n));
      seen.add(k);
    }
    expect(seen.size).toBe(n);
  });

  it("诗的数据：绝句四句、五言或七言，三种语言的大意，不出现「凶」", () => {
    expect(POEMS.length).toBe(77);
    expect(POEM_SOURCE.url).toMatch(/^https:\/\/zh\.wikisource\.org\//);
    POEMS.forEach((p, i) => {
      const at = `${p.id} ${p.title}`;
      expect(p.id).toBe(i + 1);
      const n = p.form === "五言絕句" ? 5 : 7;
      const clauses = p.lines.join("").split(/[，。？！]/).filter(Boolean);
      expect(clauses, at).toHaveLength(4);
      for (const c of clauses) expect([...c], at).toHaveLength(n);
      for (const lang of ["zh-CN", "zh-TW", "en"] as const) {
        expect(p.gist[lang], `${at} ${lang}`).toBeTruthy();
        expect(p.gist[lang]).not.toContain("凶");
      }
      expect(p.titleEn && p.authorEn, at).toBeTruthy();
    });
    expect(new Set(POEMS.map((p) => p.lines.join(""))).size).toBe(77);
    expect(poemOfDay(2461336).id).toBeGreaterThan(0);
  });
});
