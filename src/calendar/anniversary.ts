/**
 * 纪念日：下次在哪一天、还有几天、今天有没有。
 *
 * 农历纪念日：
 *   - leap = true 表示按闰月过；那一年没有这个闰月时按正常的月份过
 *   - 某年那个月没有三十（小月只有 29 天）时按廿九过
 * 公历 2 月 29 日的纪念日，平年按 2 月 28 日过。
 */
import { Lunar, LunarMonth, LunarYear, Solar } from "lunar-javascript";
import type { Ymd } from "../core/dayBoundary";

export type AnniversaryType = "birthday" | "anniversary" | "other";

export interface Anniversary {
  id: string;
  name: string;
  type: AnniversaryType;
  calendar: "solar" | "lunar";
  /** 不重复时必填：公历年或农历年 */
  year?: number;
  month: number;
  day: number;
  /** 农历：是否按闰月过 */
  leap: boolean;
  /** 每年重复 */
  repeat: boolean;
}

export interface Occurrence {
  anniversary: Anniversary;
  date: Ymd;
  daysLeft: number;
}

const toYmd = (s: Solar): Ymd => ({ year: s.getYear(), month: s.getMonth(), day: s.getDay() });
const jd = (d: Ymd) => Solar.fromYmd(d.year, d.month, d.day).getJulianDay();

export function daysBetween(from: Ymd, to: Ymd): number {
  return Math.round(jd(to) - jd(from));
}

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** 公历：某一年的那一天（2/29 平年按 2/28） */
function solarIn(a: Anniversary, year: number): Ymd {
  const day = a.month === 2 && a.day === 29 && !isLeapYear(year) ? 28 : a.day;
  return { year, month: a.month, day };
}

/** 农历：某个农历年的那一天换成公历 */
export function lunarIn(a: Anniversary, lunarYear: number): Ymd {
  const useLeap = a.leap && LunarYear.fromYear(lunarYear).getLeapMonth() === a.month;
  const month = useLeap ? -a.month : a.month;
  const count = LunarMonth.fromYm(lunarYear, month)?.getDayCount() ?? 29;
  const day = Math.min(a.day, count);
  return toYmd(Lunar.fromYmd(lunarYear, month, day).getSolar());
}

/** 下次（含今天）对应的公历日期；不重复且已过去时为 null */
export function nextDate(a: Anniversary, today: Ymd): Ymd | null {
  if (a.calendar === "solar") {
    if (!a.repeat) {
      const d = { year: a.year ?? today.year, month: a.month, day: a.day };
      return daysBetween(today, d) >= 0 ? d : null;
    }
    const thisYear = solarIn(a, today.year);
    return daysBetween(today, thisYear) >= 0 ? thisYear : solarIn(a, today.year + 1);
  }
  if (!a.repeat) {
    const d = lunarIn(a, a.year ?? Solar.fromYmd(today.year, today.month, today.day).getLunar().getYear());
    return daysBetween(today, d) >= 0 ? d : null;
  }
  const ly = Solar.fromYmd(today.year, today.month, today.day).getLunar().getYear();
  for (const y of [ly - 1, ly, ly + 1, ly + 2]) {
    const d = lunarIn(a, y);
    if (daysBetween(today, d) >= 0) return d;
  }
  return null;
}

export function upcoming(list: Anniversary[], today: Ymd): Occurrence[] {
  const out: Occurrence[] = [];
  for (const a of list) {
    const date = nextDate(a, today);
    if (date) out.push({ anniversary: a, date, daysLeft: daysBetween(today, date) });
  }
  return out.sort((x, y) => x.daysLeft - y.daysLeft);
}

/** 今天是哪些纪念日 */
export function todays(list: Anniversary[], today: Ymd): Anniversary[] {
  return upcoming(list, today)
    .filter((o) => o.daysLeft === 0)
    .map((o) => o.anniversary);
}

/** 某个公历年月里有纪念日的日子（月历小记号用），返回「日」的集合 */
export function daysWithAnniversary(list: Anniversary[], year: number, month: number): Set<string> {
  const keys = new Set<string>();
  for (const a of list) {
    const dates: Ymd[] = [];
    if (a.calendar === "solar") {
      if (a.repeat || a.year === year) dates.push(solarIn(a, year));
    } else {
      for (const y of [year - 1, year, year + 1]) if (a.repeat || a.year === y) dates.push(lunarIn(a, y));
    }
    for (const d of dates) if (d.year === year && d.month === month) keys.add(`${d.year}-${d.month}-${d.day}`);
  }
  return keys;
}

/** 校验导入的数据；不合法的条目丢掉 */
export function sanitizeAnniversaries(input: unknown): Anniversary[] {
  if (!Array.isArray(input)) return [];
  const out: Anniversary[] = [];
  for (const x of input) {
    if (!x || typeof x !== "object") continue;
    const a = x as Record<string, unknown>;
    const month = Number(a.month);
    const day = Number(a.day);
    if (typeof a.name !== "string" || !a.name.trim()) continue;
    if (!(month >= 1 && month <= 12 && day >= 1 && day <= (a.calendar === "lunar" ? 30 : 31))) continue;
    out.push({
      id: typeof a.id === "string" && a.id ? a.id : Math.random().toString(36).slice(2, 10),
      name: a.name.trim(),
      type: a.type === "birthday" || a.type === "anniversary" ? a.type : "other",
      calendar: a.calendar === "lunar" ? "lunar" : "solar",
      year: typeof a.year === "number" ? a.year : undefined,
      month,
      day,
      leap: a.leap === true,
      repeat: a.repeat !== false,
    });
  }
  return out;
}

/**
 * 今天该发哪些提醒：当天的，和还差 daysAhead 天的。
 * key 用来记「已经提醒过」，同一个纪念日的同一次只提醒一回。
 */
export function dueReminders(list: Anniversary[], today: Ymd, daysAhead: number): (Occurrence & { key: string })[] {
  return upcoming(list, today)
    .filter((o) => o.daysLeft === 0 || o.daysLeft === daysAhead)
    .map((o) => ({ ...o, key: `${o.anniversary.id}@${o.date.year}-${o.date.month}-${o.date.day}#${o.daysLeft}` }));
}
