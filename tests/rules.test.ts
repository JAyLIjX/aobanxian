import { describe, expect, it } from "vitest";
import defaultRulesJson from "../rules/default.json";
import { ELEMENTS } from "../src/core/elements";
import { defaultRules, parseRules } from "../src/core/rules";
import { effectiveDate } from "../src/core/dayBoundary";

describe("rules/default.json", () => {
  it("能通过校验，默认值符合需求", () => {
    expect(defaultRules.elementSource).toBe("branch");
    expect(defaultRules.topPriority).toBe("xiang");
    expect(defaultRules.dayBoundary).toBe("midnight");
    expect(defaultRules.tierLabels).toEqual({ best: "大吉", neutral: "平", caution: "慎穿", avoid: "不宜" });
  });

  it("默认色系与需求一致", () => {
    const names = Object.fromEntries(ELEMENTS.map((e) => [e, defaultRules.palettes[e].map((c) => c.name)]));
    expect(names).toEqual({
      木: ["绿", "青", "翠", "浅绿", "墨绿"],
      火: ["红", "紫", "粉", "橙"],
      土: ["黄", "棕", "卡其", "米", "咖啡"],
      金: ["白", "金", "银", "香槟"],
      水: ["黑", "蓝", "藏青", "灰"],
    });
  });

  it("非法取值给出清楚的报错", () => {
    expect(() => parseRules({ ...defaultRulesJson, elementSource: "hour" })).toThrow(/elementSource/);
    expect(() => parseRules({ ...defaultRulesJson, topPriority: "xiu" })).toThrow(/topPriority/);
    expect(() => parseRules({ ...defaultRulesJson, dayBoundary: "noon" })).toThrow(/dayBoundary/);
    expect(() =>
      parseRules({ ...defaultRulesJson, palettes: { ...defaultRulesJson.palettes, 木: [] } }),
    ).toThrow(/palettes\.木/);
    expect(() =>
      parseRules({
        ...defaultRulesJson,
        palettes: { ...defaultRulesJson.palettes, 火: [{ name: "红", hex: "red" }] },
      }),
    ).toThrow(/#RRGGBB/);
  });
});

describe("dayBoundary", () => {
  it("midnight：23:30 仍算当天", () => {
    expect(effectiveDate(new Date(2026, 9, 21, 23, 30), "midnight")).toEqual({ year: 2026, month: 10, day: 21 });
  });
  it("zi：23:00 起算作次日", () => {
    expect(effectiveDate(new Date(2026, 9, 21, 22, 59), "zi")).toEqual({ year: 2026, month: 10, day: 21 });
    expect(effectiveDate(new Date(2026, 9, 21, 23, 0), "zi")).toEqual({ year: 2026, month: 10, day: 22 });
  });
  it("zi：跨月跨年", () => {
    expect(effectiveDate(new Date(2026, 11, 31, 23, 15), "zi")).toEqual({ year: 2027, month: 1, day: 1 });
  });
  it("零点之后两种规则一致", () => {
    const t = new Date(2026, 9, 22, 0, 5);
    expect(effectiveDate(t, "zi")).toEqual(effectiveDate(t, "midnight"));
  });
});
