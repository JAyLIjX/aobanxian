import { afterEach, describe, expect, it, vi } from "vitest";
import branding from "../config/branding.json";
import { getAlmanac } from "../src/calendar/special";
import { createBubble } from "../src/core/bubble";
import { openingFor, specialBannerText } from "../src/core/opening";

const ymd = (s: string) => {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
};

describe("每日开场白", () => {
  it("黄道日 / 黑道日", () => {
    // 2026-10-22 明堂（黄道）
    expect(openingFor(getAlmanac(ymd("2026-10-22")))).toEqual({ key: "huangdao" });
    // 找一个没有特殊情况的黑道日
    let found = false;
    for (let d = 1; d <= 31 && !found; d++) {
      const a = getAlmanac({ year: 2026, month: 10, day: d });
      if (a.tianShenType === "黑道" && !a.special) {
        expect(openingFor(a)).toEqual({ key: "heidao" });
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("特殊日子换成对应的开场白", () => {
    expect(openingFor(getAlmanac(ymd("2026-10-1")))).toEqual({ key: "tianshe" });
    expect(openingFor(getAlmanac(ymd("2026-10-7")))).toEqual({ key: "yanggong" });
    expect(openingFor(getAlmanac(ymd("2026-9-25")))).toEqual({ key: "festival", name: "中秋节" });
    expect(openingFor(getAlmanac(ymd("2026-10-23")))).toEqual({ key: "jieqi", name: "霜降" });
  });

  it("优先级：特殊日子 > 生肖相冲、相合 > 黄道、黑道", () => {
    // 2026-10-22 己巳（明堂黄道，没有特殊日子）
    const plain = getAlmanac(ymd("2026-10-22"));
    expect(openingFor(plain, { relation: "clash", animal: "猪" })).toEqual({ key: "personalClash", animal: "猪" });
    expect(openingFor(plain, { relation: "harmony", animal: "猴" })).toEqual({ key: "personalHarmony", animal: "猴" });
    expect(openingFor(plain, { relation: "harm", animal: "虎" })).toEqual({ key: "huangdao" });
    expect(openingFor(plain, { relation: "neutral", animal: "鼠" })).toEqual({ key: "huangdao" });
    expect(openingFor(plain, null)).toEqual({ key: "huangdao" });
    // 2026-10-23 霜降：节气压过生肖
    expect(openingFor(getAlmanac(ymd("2026-10-23")), { relation: "clash", animal: "鼠" })).toEqual({ key: "jieqi", name: "霜降" });
  });

  it("「掐指一算」重播的和当天第一次的一致", () => {
    for (const day of ["2026-10-22", "2026-10-1", "2026-9-25", "2026-3-5"]) {
      expect(openingFor(getAlmanac(ymd(day)))).toEqual(openingFor(getAlmanac(ymd(day))));
    }
  });

  it("特殊日子的幡面文字", () => {
    const s = branding.special;
    expect(specialBannerText(getAlmanac(ymd("2026-10-1")).special, s)).toBe("天赦日");
    expect(specialBannerText(getAlmanac(ymd("2026-10-7")).special, s)).toBe("宜静");
    expect(specialBannerText(getAlmanac(ymd("2026-9-25")).special, s)).toBe("中秋节");
    expect(specialBannerText(getAlmanac(ymd("2026-10-23")).special, s)).toBe("霜降");
    expect(specialBannerText(getAlmanac(ymd("2026-10-22")).special, s)).toBe(null);
  });
});

describe("气泡计时", () => {
  afterEach(() => vi.useRealTimers());

  it("按设置的秒数消失", () => {
    vi.useFakeTimers();
    const seen: (string | null)[] = [];
    const b = createBubble((t) => seen.push(t));
    b.show("掐指一算", 5);
    vi.advanceTimersByTime(4999);
    expect(seen).toEqual(["掐指一算"]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(["掐指一算", null]);
  });

  it("气泡还在时再触发就重新计时", () => {
    vi.useFakeTimers();
    const seen: (string | null)[] = [];
    const b = createBubble((t) => seen.push(t));
    b.show("掐指一算", 5);
    vi.advanceTimersByTime(4000);
    b.show("掐指一算", 5);
    vi.advanceTimersByTime(4000);
    expect(seen.at(-1)).toBe("掐指一算");
    vi.advanceTimersByTime(1000);
    expect(seen.at(-1)).toBe(null);
  });
});
