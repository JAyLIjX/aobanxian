import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { BRANCHES, branchOfAnimal, personalRelation, sixClash, sixHarm, sixHarmony, threeHarmony, zodiacRelations } from "../src/core/zodiac";

describe("生肖对照表", () => {
  it("六合", () => {
    const pairs = BRANCHES.map((b) => b + sixHarmony(b)).join(" ");
    expect(pairs).toBe("子丑 丑子 寅亥 卯戌 辰酉 巳申 午未 未午 申巳 酉辰 戌卯 亥寅");
  });

  it("三合", () => {
    expect(threeHarmony("子")).toEqual(["申", "辰"]);
    expect(threeHarmony("卯")).toEqual(["亥", "未"]);
    expect(threeHarmony("午")).toEqual(["寅", "戌"]);
    expect(threeHarmony("酉")).toEqual(["巳", "丑"]);
  });

  it("六冲", () => {
    const pairs = BRANCHES.map((b) => b + sixClash(b)).join(" ");
    expect(pairs).toBe("子午 丑未 寅申 卯酉 辰戌 巳亥 午子 未丑 申寅 酉卯 戌辰 亥巳");
  });

  it("关系里带上生肖名", () => {
    const r = zodiacRelations("辰");
    expect(r.sixHarmony).toEqual({ branch: "酉", animal: "鸡" });
    expect(r.threeHarmony).toEqual([
      { branch: "申", animal: "猴" },
      { branch: "子", animal: "鼠" },
    ]);
    expect(r.clash).toEqual({ branch: "戌", animal: "狗" });
  });

  it("六冲对照表与 lunar-javascript 的日冲完全一致（连续 60 天覆盖一轮甲子）", () => {
    for (let i = 0; i < 60; i++) {
      const d = new Date(2026, 0, 1 + i);
      const lunar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar();
      const clash = zodiacRelations(lunar.getDayZhi()).clash;
      expect(clash.branch).toBe(lunar.getDayChong());
      expect(clash.animal).toBe(lunar.getDayChongShengXiao());
    }
  });
});

describe("我的生肖与今天的关系", () => {
  it("六害表", () => {
    expect(BRANCHES.map((b) => b + sixHarm(b)).join(" ")).toBe("子未 丑午 寅巳 卯辰 辰卯 巳寅 午丑 未子 申亥 酉戌 戌酉 亥申");
  });
  it("六合 → 相合（巳日，属猴）", () => {
    expect(personalRelation("巳", branchOfAnimal("猴")!)).toBe("harmony");
  });
  it("三合 → 相合（巳日，属鸡、属牛）", () => {
    expect(personalRelation("巳", "酉")).toBe("harmony");
    expect(personalRelation("巳", "丑")).toBe("harmony");
  });
  it("六冲 → 相冲（巳日，属猪）", () => {
    expect(personalRelation("巳", branchOfAnimal("猪")!)).toBe("clash");
  });
  it("六害 → 相害（巳日，属虎）", () => {
    expect(personalRelation("巳", "寅")).toBe("harm");
  });
  it("其他 → 平常（巳日，属鼠、属蛇）", () => {
    expect(personalRelation("巳", "子")).toBe("neutral");
    expect(personalRelation("巳", "巳")).toBe("neutral");
  });
  it("十二地支两两之间只有一种关系", () => {
    for (const a of BRANCHES) for (const b of BRANCHES) expect(["harmony", "clash", "harm", "neutral"]).toContain(personalRelation(a, b));
  });
});
