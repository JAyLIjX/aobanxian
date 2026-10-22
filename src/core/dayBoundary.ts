/**
 * 换日规则：按 dayBoundary 把一个时刻归到某一天。
 */
import type { DayBoundary } from "./rules";

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

/**
 * 返回 now 所属的「历日」（本地时间）。
 * midnight：0:00 换日；zi：23:00 起算作次日（子时换日）。
 */
export function effectiveDate(now: Date, boundary: DayBoundary): Ymd {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (boundary === "zi" && now.getHours() >= 23) {
    d.setDate(d.getDate() + 1);
  }
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function ymdKey(d: Ymd): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function sameYmd(a: Ymd, b: Ymd): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
