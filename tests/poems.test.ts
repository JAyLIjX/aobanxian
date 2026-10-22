/**
 * 每日一诗：数据完整、选诗规则在真实日历上的结果。
 */
import { describe, expect, it } from "vitest";
import poemDays from "../config/poem-days.json";
import { poemDayOf, poemDaysOfYear } from "../src/calendar/poemDay";
import { POEMS, POEM_SOURCE, poemForDay } from "../src/data/poems";

describe("诗库", () => {
  it("约 400 首，来自 chinese-poetry；每首有简繁诗文、名句、赏析（三种语言）", () => {
    expect(POEMS.length).toBeGreaterThanOrEqual(380);
    expect(POEM_SOURCE.url).toBe("https://github.com/chinese-poetry/chinese-poetry");
    expect(new Set(POEMS.map((p) => p.id)).size).toBe(POEMS.length);
    for (const p of POEMS) {
      for (const zh of ["zh-CN", "zh-TW"] as const) {
        expect(p.lines[zh].join(""), p.id).toContain(p.famous[zh]);
        expect(p.title[zh] && p.author[zh], p.id).toBeTruthy();
      }
      for (const lang of ["zh-CN", "zh-TW", "en"] as const) {
        expect(p.appreciation[lang], `${p.id} ${lang}`).toBeTruthy();
        expect(p.appreciation[lang]).not.toContain("凶");
      }
      if (p.role === "regular" || p.role === "moon") expect(p.seasons.length, p.id).toBeGreaterThan(0);
    }
  });

  it("专属诗对照表：二十四节气齐全，节日至少有春节、元宵、清明、端午、七夕、中秋、重阳、除夕", () => {
    expect(Object.keys(poemDays.jieqi)).toHaveLength(24);
    for (const f of ["春节", "元宵", "清明", "端午", "七夕", "中秋", "重阳", "除夕"]) expect(poemDays.festival, f).toHaveProperty(f);
    const ids = new Set(POEMS.map((p) => p.id));
    for (const id of [...Object.values(poemDays.festival), ...Object.values(poemDays.jieqi)]) expect(ids.has(id), id).toBe(true);
  });
});

describe("选诗", () => {
  it("2026-10-23 霜降选出《山行》；中秋（2026-09-25）选出《水调歌头》；清明选出杜牧《清明》", () => {
    const shuangjiang = poemForDay({ year: 2026, month: 10, day: 23 });
    expect(poemDayOf({ year: 2026, month: 10, day: 23 }).jieqi).toBe("霜降");
    expect(shuangjiang.poem.title["zh-CN"]).toBe("山行");
    expect(shuangjiang.poem.author["zh-CN"]).toBe("杜牧");
    expect(shuangjiang.reason).toBe("jieqi");
    const zhongqiu = poemForDay({ year: 2026, month: 9, day: 25 });
    expect(zhongqiu.poem.title["zh-CN"]).toBe("水调歌头·明月几时有");
    expect(zhongqiu.reason).toBe("festival");
    const qingming = poemForDay({ year: 2026, month: 4, day: 5 });
    expect(qingming.poem.title["zh-CN"]).toBe("清明");
    expect(qingming.poem.author["zh-CN"]).toBe("杜牧");
  });

  for (const year of [2026, 2027]) {
    it(`${year} 年 365 天：每天的诗季节标签都和当天季节一致（节日、节气专属诗除外），满月前后用写月亮的诗`, () => {
      const days = poemDaysOfYear(year);
      const seasonal: string[] = [];
      for (const { ymd, day } of days) {
        const { poem, reason } = poemForDay(ymd);
        const at = `${ymd.year}-${ymd.month}-${ymd.day}（${day.season}）${poem.title["zh-CN"]}`;
        if (reason === "festival" || reason === "jieqi") continue;
        expect(poem.seasons, at).toContain(day.season);
        if (reason === "moon") expect(poem.role === "moon" || poem.tags.includes("月"), at).toBe(true);
        seasonal.push(poem.id);
      }
      // 同一年内尽量不重复：平常日子没有一首出现两次
      expect(new Set(seasonal).size, "重复").toBe(seasonal.length);
    });
  }

  it("秋天绝不出现只标春天的诗", () => {
    for (const { ymd, day } of poemDaysOfYear(2026)) {
      if (day.season !== "秋") continue;
      const { poem, reason } = poemForDay(ymd);
      if (reason === "festival" || reason === "jieqi") continue;
      expect(poem.seasons, `${ymd.month}-${ymd.day} ${poem.title["zh-CN"]}`).toContain("秋");
    }
  });
});
