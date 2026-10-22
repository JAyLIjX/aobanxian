/**
 * 详情的时辰、方位与数字、物候、更多黄历（取自 lunar-javascript；七十二候按古籍原文校正）。
 */
import { describe, expect, it } from "vitest";
import wuhouConfig from "../config/wuhou.json";
import { getDayExtras, hourIndex, wuhouName } from "../src/calendar/extras";
import { getDayDetail } from "../src/calendar/day";
import { defaultRules } from "../src/core/rules";
import { HETU, luckyNumbers } from "../src/core/luckyNumbers";
import { glossaryKeys, term } from "../src/i18n/terms";

const days = (from: Date, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  });

describe("时辰", () => {
  it("十二格，子时在最前、跨两天（23:00–00:59）作为一格，吉凶只用「吉」「平」", () => {
    const x = getDayExtras({ year: 2026, month: 10, day: 22 });
    expect(x.hours.map((h) => h.branch).join("")).toBe("子丑寅卯辰巳午未申酉戌亥");
    expect(x.hours[0]).toMatchObject({ branch: "子", start: "23:00", end: "00:59", ganzhi: "甲子" });
    expect(x.hours[1]).toMatchObject({ branch: "丑", start: "01:00", end: "02:59", ganzhi: "乙丑", luck: "吉" });
    expect(x.hours[11]).toMatchObject({ branch: "亥", start: "21:00", end: "22:59" });
    for (const h of x.hours) expect(["吉", "平"]).toContain(h.luck);
    // 己日：丑辰午未戌亥为黄道
    expect(x.hours.filter((h) => h.luck === "吉").map((h) => h.branch).join("")).toBe("丑辰午未戌亥");
  });

  it("当前时辰：23 点和 0 点都是子时，1 点起丑时", () => {
    expect([23, 0, 1, 2, 3, 11, 12, 21, 22].map(hourIndex)).toEqual([0, 0, 1, 1, 2, 6, 6, 11, 11]);
  });
});

describe("幸运数字（河图数）", () => {
  it("今天大吉是土和火 → 5、10、2、7", () => {
    const d = getDayDetail({ year: 2026, month: 10, day: 22 }, defaultRules);
    const best = d.outfit.tiers[0].entries.map((e) => e.element);
    expect(best).toEqual(["土", "火"]);
    expect(luckyNumbers(best)).toEqual([5, 10, 2, 7]);
  });

  it("五行对应：水 1、6，火 2、7，木 3、8，金 4、9，土 5、10", () => {
    expect(HETU).toEqual({ 水: [1, 6], 火: [2, 7], 木: [3, 8], 金: [4, 9], 土: [5, 10] });
    expect(luckyNumbers(["水", "金"])).toEqual([1, 6, 4, 9]);
  });
});

describe("七十二候用字校正", () => {
  it("lunar-javascript 的候名按《月令七十二候集解》原文校正", () => {
    expect(wuhouName("菊有黄花")).toBe("菊有黄华");
    expect(wuhouName("大雨行时")).toBe("大雨时行");
    expect(wuhouName("雉始雊")).toBe("雉雊");
    expect(wuhouName("鸡始乳")).toBe("鸡乳");
    expect(wuhouName("鹰始挚")).toBe("鹰始击");
    expect(wuhouName("豺乃祭兽")).toBe("豺祭兽");
    // 两边一致的不改
    expect(wuhouName("东风解冻")).toBe("东风解冻");
    expect(Object.keys(wuhouConfig.fixes)).toHaveLength(6);
  });

  it("2026-10-22：寒露 · 三候 · 菊有黄华，附白话；繁体是「菊有黃華」", () => {
    const x = getDayExtras({ year: 2026, month: 10, day: 22 });
    expect(x.wuhou).toEqual({ jieqi: "寒露", hou: "三候", name: "菊有黄华" });
    expect(term("wuhou", "菊有黄华", "zh-TW")).toBe("菊有黃華");
    expect(term("wuhou", "菊有黄华", "en")).toContain("Chrysanthemums");
  });
});

describe("更多黄历", () => {
  it("胎神、九星：2026-10-22 占门床 外正南、一白水天枢", () => {
    const x = getDayExtras({ year: 2026, month: 10, day: 22 });
    expect(x.taishen).toBe("占门床 外正南");
    expect(term("taishen", x.taishen, "en")).toBe("占门床 外正南 · the door & the bed · outside, due south");
    expect(x.nineStar).toMatchObject({ name: "一白水天枢", number: "一", color: "白", element: "水", star: "天枢" });
    expect(x.zhiXing).toBe("危");
    expect(x.pengzu).toEqual(["己不破券", "巳不远行"]);
  });

  it("胎神房内：占房床 房内北", () => {
    // 甲子日胎神占门碓外东南……逐日轮转；找一天是「占房床 房内北」
    const hit = days(new Date(2026, 0, 1), 60).map(getDayExtras).find((x) => x.taishen === "占房床 房内北");
    expect(hit).toBeTruthy();
    expect(term("taishen", "占房床 房内北", "en")).toContain("inside the room, north");
  });

  it("两年内每一天：词都在术语表里（有英文、繁体），不出现「凶」", () => {
    const keys = Object.fromEntries(
      (["zhixing", "pengzu", "wuhou", "yuexiang", "direction", "hou", "jieqi", "taishen", "ninestar"] as const).map((c) => [c, new Set(glossaryKeys(c))]),
    );
    for (const ymd of days(new Date(2026, 0, 1), 731)) {
      const x = getDayExtras(ymd);
      const at = `${ymd.year}-${ymd.month}-${ymd.day}`;
      expect(keys.zhixing.has(x.zhiXing), at).toBe(true);
      for (const p of x.pengzu) expect(keys.pengzu.has(p), `${at} ${p}`).toBe(true);
      expect(keys.wuhou.has(x.wuhou.name), `${at} ${x.wuhou.name}`).toBe(true);
      expect(keys.hou.has(x.wuhou.hou), at).toBe(true);
      expect(keys.jieqi.has(x.wuhou.jieqi), at).toBe(true);
      expect(keys.yuexiang.has(x.moon.name), `${at} ${x.moon.name}`).toBe(true);
      expect(keys.taishen.has(x.taishen), `${at} ${x.taishen}`).toBe(true);
      expect(keys.ninestar.has(x.nineStar.name), `${at} ${x.nineStar.name}`).toBe(true);
      for (const dir of Object.values(x.positions)) expect(keys.direction.has(dir), `${at} ${dir}`).toBe(true);
      expect(x.hours).toHaveLength(12);
      expect(JSON.stringify(x)).not.toContain("凶");
    }
  });
});
