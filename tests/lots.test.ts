import { describe, expect, it } from "vitest";
import { chineseNumber } from "../src/components/LotPaper";
import { addToBook, GRADE_OF, LOT_GRADES, lotOfDay } from "../src/core/lots";
import { LOTS, LOT_SOURCE } from "../src/data/lots";

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

  it("中文签号", () => {
    expect([1, 10, 11, 20, 58, 99, 100].map(chineseNumber)).toEqual(["一", "十", "十一", "二十", "五十八", "九十九", "一百"]);
  });
});
