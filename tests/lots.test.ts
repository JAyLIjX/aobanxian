import { describe, expect, it } from "vitest";
import { chineseNumber } from "../src/components/LotPaper";
import { addToBook, GRADE_OF, LOT_GRADES, lotOfDay } from "../src/core/lots";
import { LOT_ASPECTS, LOT_CLASSIC, LOTS, LOT_SOURCE } from "../src/data/lots";
import { countChars } from "../src/core/text";

const day = (s: string) => {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
};

describe("求签", () => {
  it("同一天怎么求都是同一签", () => {
    for (const d of ["2026-10-22", "2027-01-01", "2030-02-02"]) {
      const first = lotOfDay(day(d), "abc123");
      for (let i = 0; i < 5; i++) expect(lotOfDay(day(d), "abc123")).toBe(first);
    }
  });

  it("签号在 1–100，一年里分布得开", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 365; i++) {
      const d = new Date(2026, 0, 1 + i);
      const n = lotOfDay({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }, "seed");
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(100);
      seen.add(n);
    }
    expect(seen.size).toBeGreaterThan(80);
  });

  it("不同的电脑（种子）同一天可以不一样", () => {
    const results = new Set(["a", "b", "c", "d", "e", "f"].map((s) => lotOfDay(day("2026-10-22"), s)));
    expect(results.size).toBeGreaterThan(1);
  });

  it("签册同一天只记一次，新的在前", () => {
    let book = addToBook([], { date: "2026-10-21", n: 3 });
    book = addToBook(book, { date: "2026-10-22", n: 9 });
    book = addToBook(book, { date: "2026-10-22", n: 50 });
    expect(book).toEqual([
      { date: "2026-10-22", n: 9 },
      { date: "2026-10-21", n: 3 },
    ]);
  });

  it("一百签齐全：签号连续、四句七言、签等、三种语言的白话", () => {
    expect(LOTS).toHaveLength(100);
    LOTS.forEach((lot, i) => {
      expect(lot.n).toBe(i + 1);
      expect(lot.poem).toHaveLength(4);
      for (const line of lot.poem) expect([...line]).toHaveLength(7);
      expect(LOT_GRADES).toContain(lot.grade);
      expect(GRADE_OF[lot.gradeRaw]).toBe(lot.grade);
      for (const lang of ["zh-CN", "zh-TW", "en"] as const) {
        expect(lot.reading[lang].length, `第 ${lot.n} 签 ${lang}`).toBeGreaterThan(20);
        expect(lot.reading[lang]).not.toContain("凶");
      }
    });
    // 签诗不重复
    expect(new Set(LOTS.map((l) => l.poem.join(""))).size).toBe(100);
    expect(LOT_SOURCE.url).toMatch(/^https:\/\/zh\.wikisource\.org\//);
  });

  it("每签都有典故故事、白话总解、七项分事项（三种语言）", () => {
    const langs = ["zh-CN", "zh-TW", "en"] as const;
    for (const lot of LOTS) {
      const at = `第 ${lot.n} 签`;
      expect(["record", "history", "legend", "brief"], at).toContain(lot.taleBasis);
      for (const lang of langs) {
        expect(lot.tale[lang], `${at} 典故 ${lang}`).toBeTruthy();
        for (const k of LOT_ASPECTS) expect(lot.aspects[k]?.[lang], `${at} ${k} ${lang}`).toBeTruthy();
      }
      expect(Object.keys(lot.aspects).sort()).toEqual([...LOT_ASPECTS].sort());
      const tale = lot.tale["zh-CN"];
      if (lot.taleBasis !== "brief") {
        // 典故 150–250 字，最后一句接回签意
        const n = countChars(tale);
        expect(n, `${at} 典故 ${n} 字`).toBeGreaterThanOrEqual(150);
        expect(n, `${at} 典故 ${n} 字`).toBeLessThanOrEqual(250);
        const last = tale.split(/(?<=[。！？])/).filter((x) => x.trim()).at(-1)!;
        expect(last, `${at} 典故最后一句`).toMatch(/签/);
      }
      // 出自小说、戏曲、传说的，开头注明
      if (lot.taleBasis === "legend") expect(tale.split("。")[0], at).toMatch(/相传|传说|据[^，。]{0,12}《/);
      // 白话总解三到五句
      const sentences = lot.reading["zh-CN"].split(/(?<=[。！？])/).filter((x) => x.trim());
      expect(sentences.length, `${at} 总解 ${sentences.length} 句`).toBeGreaterThanOrEqual(3);
      expect(sentences.length, `${at} 总解 ${sentences.length} 句`).toBeLessThanOrEqual(5);
    }
  });

  it("自撰的文字：不出现「凶」「施主」；分事项、总解不谈生男生女和诉讼；健康不预测病情", () => {
    for (const lot of LOTS) {
      const at = `第 ${lot.n} 签`;
      for (const lang of ["zh-CN", "zh-TW"] as const) {
        const all = [lot.reading[lang], lot.tale[lang], ...Object.values(lot.aspects).map((a) => a[lang])].join("");
        expect(all, at).not.toContain("凶");
        expect(all, at).not.toContain("施主");
        const advice = [lot.reading[lang], ...Object.values(lot.aspects).map((a) => a[lang])].join("");
        expect(advice, `${at} ${lang}`).not.toMatch(/生男|生女|男孩|女孩|怀孕|懷孕|孕|六甲|诉讼|訴訟|官司|讼|訟/);
      }
      const health = lot.aspects.health["zh-CN"];
      expect(health, `${at} 健康：${health}`).toMatch(/休息|就医|作息|起居|调养|放松|睡眠|劳逸|医生|就诊/);
      expect(health, `${at} 健康：${health}`).not.toMatch(/痊|愈|九死|病重|无碍|难治|好转|加重|康复/);
      const en = [lot.reading.en, ...Object.values(lot.aspects).map((a) => a.en)].join(" ");
      expect(en, `${at} en`).not.toMatch(/lawsuit|litigation|\bson\b|pregnan/i);
    }
  });

  it("古人怎么解：一百签都有聖意、東坡解、碧仙註、解曰、釋義原文，没有异文校记", () => {
    for (const lot of LOTS) {
      for (const k of LOT_CLASSIC) {
        expect(lot.classic[k].length, `第 ${lot.n} 签 ${k}`).toBeGreaterThan(0);
        for (const line of lot.classic[k]) expect(line, `第 ${lot.n} 签 ${k}`).not.toMatch(/■|\{\{|<|^..：/);
      }
    }
    // 抽查：第 1 签聖意、第 50 签碧仙註
    expect(LOTS[0].classic.shengyi[0]).toBe("功名遂　福祿全　訟得理　病即痊　桑麻熟　婚姻聯　孕生子　行人還");
    expect(LOTS[49].classic.bixian).toEqual(["此心有主何憂懼。須管今番勝舊番。", "婦人言語君休聽。家道興衰在此間。"]);
  });

  it("中文签号", () => {
    expect([1, 10, 11, 20, 58, 99, 100].map(chineseNumber)).toEqual(["一", "十", "十一", "二十", "五十八", "九十九", "一百"]);
  });
});
