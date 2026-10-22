import { describe, expect, it } from "vitest";
import { daysWithAnniversary, dueReminders, nextDate, sanitizeAnniversaries, todays, upcoming, type Anniversary } from "../src/calendar/anniversary";
import { nextCountdown, nextTraditional } from "../src/calendar/countdown";
import { exportPayload, mergeImported } from "../src/settings/anniversaries";

const ymd = (s: string) => {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
};
const ann = (p: Partial<Anniversary>): Anniversary => ({
  id: "x",
  name: "妈妈",
  type: "birthday",
  calendar: "lunar",
  month: 1,
  day: 1,
  leap: false,
  repeat: true,
  ...p,
});

describe("纪念日：下次的日期", () => {
  it("农历闰月：那年有这个闰月就按闰月过，没有就按正常月份过", () => {
    const leap6 = ann({ month: 6, day: 1, leap: true });
    // 2025 年闰六月：闰六月初一 = 2025-07-25
    expect(nextDate(leap6, ymd("2025-07-01"))).toEqual(ymd("2025-07-25"));
    // 不按闰月过：2025 年六月初一 = 2025-06-25，已过 → 下一年六月初一 2026-07-14
    expect(nextDate(ann({ month: 6, day: 1 }), ymd("2025-07-01"))).toEqual(ymd("2026-07-14"));
    // 2026 年没有闰六月：按六月初一过
    expect(nextDate(leap6, ymd("2026-01-01"))).toEqual(ymd("2026-07-14"));
  });

  it("某年没有三十时按廿九过", () => {
    const eve = ann({ month: 12, day: 30 });
    // 农历 2026 年腊月只有 29 天：腊月廿九 = 2027-02-05
    expect(nextDate(eve, ymd("2026-10-22"))).toEqual(ymd("2027-02-05"));
    // 农历 2029 年腊月有 30 天：腊月三十 = 2030-02-02
    expect(nextDate(eve, ymd("2029-06-01"))).toEqual(ymd("2030-02-02"));
  });

  it("跨年：今年已过就算到明年", () => {
    const solar = ann({ calendar: "solar", month: 1, day: 5 });
    expect(nextDate(solar, ymd("2026-10-22"))).toEqual(ymd("2027-01-05"));
    expect(nextDate(solar, ymd("2026-01-05"))).toEqual(ymd("2026-01-05"));
    // 农历正月初一：2026-10-22 是农历九月，下次是 2027 年春节
    expect(nextDate(ann({ month: 1, day: 1 }), ymd("2026-10-22"))).toEqual(ymd("2027-02-06"));
    // 公历 2 月 29 日：平年按 2 月 28 日
    const leapDay = ann({ calendar: "solar", month: 2, day: 29 });
    expect(nextDate(leapDay, ymd("2026-10-22"))).toEqual(ymd("2027-02-28"));
    expect(nextDate(leapDay, ymd("2027-03-01"))).toEqual(ymd("2028-02-29"));
  });

  it("不重复的纪念日过去后就没有下次", () => {
    const once = ann({ calendar: "solar", year: 2026, month: 10, day: 1, repeat: false });
    expect(nextDate(once, ymd("2026-09-30"))).toEqual(ymd("2026-10-01"));
    expect(nextDate(once, ymd("2026-10-22"))).toBeNull();
  });

  it("按剩余天数排序，今天的算 0 天", () => {
    const list = [
      ann({ id: "a", calendar: "solar", month: 12, day: 25, type: "other", name: "圣诞" }),
      ann({ id: "b", calendar: "solar", month: 10, day: 22 }),
      ann({ id: "c", calendar: "lunar", month: 9, day: 15 }),
    ];
    const u = upcoming(list, ymd("2026-10-22"));
    expect(u.map((o) => [o.anniversary.id, o.daysLeft])).toEqual([
      ["b", 0],
      ["c", 2],
      ["a", 64],
    ]);
    expect(todays(list, ymd("2026-10-22")).map((a) => a.id)).toEqual(["b"]);
  });

  it("月历记号：农历纪念日落在哪一天", () => {
    const list = [ann({ month: 9, day: 15 }), ann({ calendar: "solar", month: 10, day: 1 })];
    expect([...daysWithAnniversary(list, 2026, 10)].sort()).toEqual(["2026-10-1", "2026-10-24"]);
  });

  it("提醒：当天一次，提前 N 天一次", () => {
    const list = [ann({ id: "a", calendar: "solar", month: 10, day: 25 }), ann({ id: "b", calendar: "solar", month: 10, day: 22 })];
    expect(dueReminders(list, ymd("2026-10-22"), 3).map((r) => r.key)).toEqual(["b@2026-10-22#0", "a@2026-10-25#3"]);
    expect(dueReminders(list, ymd("2026-10-22"), 1).map((r) => r.key)).toEqual(["b@2026-10-22#0"]);
    // 提前 0 天（只当天）不会重复
    expect(dueReminders(list, ymd("2026-10-25"), 0).map((r) => r.key)).toEqual(["a@2026-10-25#0"]);
  });

  it("导入时丢掉不合法的条目", () => {
    const out = sanitizeAnniversaries([
      { name: "妈妈", type: "birthday", calendar: "lunar", month: 3, day: 30, leap: true },
      { name: "", month: 1, day: 1 },
      { name: "坏的", calendar: "solar", month: 13, day: 1 },
      "hello",
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "妈妈", calendar: "lunar", month: 3, day: 30, leap: true, repeat: true });
    expect(sanitizeAnniversaries({})).toEqual([]);
  });
});

describe("导出 / 导入", () => {
  it("导出再导入得到同样的数据；同 id 覆盖，新的追加", () => {
    const a = ann({ id: "a", name: "妈妈" });
    const b = ann({ id: "b", name: "爸爸", calendar: "solar", month: 5, day: 4 });
    const file = JSON.parse(JSON.stringify(exportPayload([a, b])));
    expect(mergeImported([], file)).toEqual({ list: [a, b], count: 2 });
    const changed = { ...a, name: "母亲" };
    const r = mergeImported([a, ann({ id: "c" })], [changed, b]);
    expect(r.list.map((x) => [x.id, x.name])).toEqual([
      ["a", "母亲"],
      ["c", "妈妈"],
      ["b", "爸爸"],
    ]);
    expect(mergeImported([a], { nope: 1 })).toEqual({ list: [a], count: 0 });
  });
});

describe("倒计时", () => {
  it("最近的传统节日或节气", () => {
    // 2026-10-23 霜降
    expect(nextTraditional(ymd("2026-10-22"))).toMatchObject({ kind: "jieqi", name: "霜降", daysLeft: 1 });
    // 大寒之后先到立春（2027-02-04），再到除夕（2027-02-05）
    expect(nextTraditional(ymd("2027-01-21"))).toMatchObject({ kind: "jieqi", name: "立春", daysLeft: 14 });
    expect(nextTraditional(ymd("2027-02-04"))).toMatchObject({ kind: "festival", name: "除夕", daysLeft: 1 });
  });

  it("纪念日更近时显示纪念日", () => {
    const list = [ann({ calendar: "solar", month: 10, day: 23, name: "小明" })];
    // 同一天时纪念日优先
    expect(nextCountdown(ymd("2026-10-22"), list)).toMatchObject({ kind: "anniversary", daysLeft: 1 });
    expect(nextCountdown(ymd("2026-10-22"), [ann({ calendar: "solar", month: 11, day: 1 })])).toMatchObject({ kind: "jieqi", name: "霜降" });
  });
});
