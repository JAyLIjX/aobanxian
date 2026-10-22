import { describe, expect, it } from "vitest";
import { getDayDetail } from "../src/calendar/day";
import { pickDays, suits, ZERI_EVENTS } from "../src/calendar/zeri";
import { defaultRules } from "../src/core/rules";

const start = { year: 2026, month: 10, day: 22 };

describe("择日", () => {
  it("事项对照表：搬家、出行、开业、结婚、签约、装修、安床、祭祀", () => {
    expect(ZERI_EVENTS.map((e) => e.id)).toEqual(["move", "travel", "business", "wedding", "contract", "renovation", "bed", "worship"]);
    expect(ZERI_EVENTS.find((e) => e.id === "contract")!.words).toEqual(["订盟", "交易", "立券"]);
  });

  for (const event of ZERI_EVENTS) {
    it(`${event.id}：结果里没有任何一天把该事项列在忌里，且宜里至少命中一个`, () => {
      for (const day of [30, 60, 90]) {
        for (const r of pickDays(event, start, day, defaultRules)) {
          for (const w of event.words) expect(r.detail.ji, `${r.detail.ymd.month}/${r.detail.ymd.day}`).not.toContain(w);
          expect(r.matched.length).toBeGreaterThan(0);
        }
      }
    });
  }

  it("没被挑中的日子确实不合适（逐日对照）", () => {
    const event = ZERI_EVENTS.find((e) => e.id === "wedding")!;
    const picked = new Set(pickDays(event, start, 60, defaultRules).map((r) => r.detail.julianDay));
    for (let i = 0; i < 60; i++) {
      const d = new Date(2026, 9, 22 + i);
      const detail = getDayDetail({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }, defaultRules);
      expect(picked.has(detail.julianDay)).toBe(suits(event, detail.yi, detail.ji));
    }
  });

  it("设置了我的生肖时，冲我的日子做标记", () => {
    const event = ZERI_EVENTS.find((e) => e.id === "worship")!;
    const res = pickDays(event, start, 90, defaultRules, "亥");
    // 亥（猪）被巳日冲
    for (const r of res) expect(r.clashMe).toBe(r.detail.pillar.branch === "巳");
    expect(pickDays(event, start, 90, defaultRules).every((r) => !r.clashMe)).toBe(true);
  });

  it("相害的日子加「害你」提示（不标灰），相冲的仍标灰；两者不会同时出现", () => {
    const event = ZERI_EVENTS.find((e) => e.id === "worship")!;
    const res = pickDays(event, start, 120, defaultRules, "亥");
    // 亥与申相害
    for (const r of res) {
      expect(r.harmMe).toBe(r.detail.pillar.branch === "申");
      expect(r.harmMe && r.clashMe).toBe(false);
    }
    expect(res.some((r) => r.harmMe)).toBe(true);
    expect(pickDays(event, start, 120, defaultRules).every((r) => !r.harmMe)).toBe(true);
  });
});
