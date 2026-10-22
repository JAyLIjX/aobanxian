/**
 * 选诗规则（纯函数）：节日 > 节气 > 满月前后 > 当季；同一年尽量不重复。
 */
import { describe, expect, it } from "vitest";
import { nearFullMoon, pickPoemsForYear, type PoemDay, type PoemMeta, type Season } from "../src/core/poemPick";

const SEASONS: Season[] = ["春", "夏", "秋", "冬"];
const poems: PoemMeta[] = [
  ...SEASONS.flatMap((s) => Array.from({ length: 30 }, (_, i) => ({ id: `${s}${i}`, role: "regular" as const, seasons: [s], tags: [] }))),
  ...SEASONS.flatMap((s) => Array.from({ length: 4 }, (_, i) => ({ id: `${s}月${i}`, role: "moon" as const, seasons: [s], tags: ["月"] }))),
  { id: "中秋诗", role: "festival", seasons: ["秋"], tags: ["中秋"] },
  { id: "霜降诗", role: "jieqi", seasons: ["秋"], tags: ["霜降"] },
];
const tables = { festival: { 中秋: "中秋诗" }, jieqi: { 霜降: "霜降诗" } };
const day = (season: Season, lunarDay = 5, extra: Partial<PoemDay> = {}): PoemDay => ({ season, lunarDay, festival: null, jieqi: null, ...extra });

describe("选诗规则", () => {
  it("节日 > 节气 > 满月 > 当季", () => {
    const [a, b, c, d] = pickPoemsForYear(2026, [day("秋", 15, { festival: "中秋", jieqi: "霜降" }), day("秋", 15, { jieqi: "霜降" }), day("秋", 15), day("秋", 5)], poems, tables);
    expect(a).toEqual({ id: "中秋诗", reason: "festival" });
    expect(b).toEqual({ id: "霜降诗", reason: "jieqi" });
    expect(c.reason).toBe("moon");
    expect(c.id).toMatch(/^秋月/);
    expect(d.reason).toBe("season");
    expect(d.id).toMatch(/^秋\d/);
  });

  it("满月前后两天：农历十三到十七", () => {
    expect([12, 13, 15, 17, 18].map(nearFullMoon)).toEqual([false, true, true, true, false]);
  });

  it("只从当季选；同一年里不重复，诗池用完才重来；同一年同一天结果固定", () => {
    const days = Array.from({ length: 30 }, () => day("夏"));
    const ids = pickPoemsForYear(2026, days, poems, tables).map((p) => p.id);
    expect(ids.every((id) => id.startsWith("夏"))).toBe(true);
    expect(new Set(ids).size).toBe(30);
    expect(pickPoemsForYear(2026, days, poems, tables).map((p) => p.id)).toEqual(ids);
    // 不同年份顺序不同
    expect(pickPoemsForYear(2027, days, poems, tables).map((p) => p.id)).not.toEqual(ids);
    // 31 天 > 30 首：第 31 天才开始重复
    const more = pickPoemsForYear(2026, [...days, day("夏")], poems, tables).map((p) => p.id);
    expect(new Set(more).size).toBe(30);
  });

  it("专属诗当天以外不出现", () => {
    const ids = pickPoemsForYear(2026, Array.from({ length: 40 }, () => day("秋")), [...poems, { id: "中秋诗2", role: "regular", seasons: ["秋"], tags: [] }], { festival: { 中秋: "中秋诗2" }, jieqi: {} }).map((p) => p.id);
    expect(ids).not.toContain("中秋诗2");
  });
});
