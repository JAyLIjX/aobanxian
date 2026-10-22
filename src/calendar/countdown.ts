/**
 * 卡片底部的倒计时：最近的一个纪念日、传统节日或节气（不含今天）。
 */
import { Solar } from "lunar-javascript";
import type { Ymd } from "../core/dayBoundary";
import { upcoming, type Anniversary } from "./anniversary";

const TRADITIONAL = new Set(["春节", "元宵节", "龙头节", "端午节", "七夕节", "中秋节", "重阳节", "腊八节", "除夕"]);

export type Countdown =
  | { kind: "anniversary"; anniversary: Anniversary; date: Ymd; daysLeft: number }
  | { kind: "festival" | "jieqi"; name: string; date: Ymd; daysLeft: number };

/** 最近的传统节日或节气（明天起，最多往后看 400 天） */
export function nextTraditional(today: Ymd): Countdown | null {
  const base = new Date(today.year, today.month - 1, today.day);
  for (let i = 1; i <= 400; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const lunar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar();
    const date = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    const fest = lunar.getFestivals().find((f) => TRADITIONAL.has(f));
    if (fest) return { kind: "festival", name: fest, date, daysLeft: i };
    const jq = lunar.getJieQi();
    if (jq) return { kind: "jieqi", name: jq, date, daysLeft: i };
  }
  return null;
}

export function nextCountdown(today: Ymd, anniversaries: Anniversary[]): Countdown | null {
  const trad = nextTraditional(today);
  const ann = upcoming(anniversaries, today).find((o) => o.daysLeft > 0);
  if (ann && (!trad || ann.daysLeft <= trad.daysLeft)) return { kind: "anniversary", ...ann };
  return trad;
}
