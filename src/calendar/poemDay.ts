/**
 * 每日一诗用到的历法信息：季节（按节气）、传统节日、节气、农历日。取自 lunar-javascript。
 */
import { Solar } from "lunar-javascript";
import type { Ymd } from "../core/dayBoundary";
import type { PoemDay, Season } from "../core/poemPick";

/** 最近的「节」→ 季节：立春、惊蛰、清明为春，立夏、芒种、小暑为夏…… */
const SEASON_OF_JIE: Record<string, Season> = {
  立春: "春",
  惊蛰: "春",
  清明: "春",
  立夏: "夏",
  芒种: "夏",
  小暑: "夏",
  立秋: "秋",
  白露: "秋",
  寒露: "秋",
  立冬: "冬",
  大雪: "冬",
  小寒: "冬",
};

/** 对照表里的节日名（去掉「节」字）；清明是节气，单独判断 */
const FESTIVALS = ["春节", "元宵", "清明", "寒食", "端午", "七夕", "中秋", "重阳", "腊八", "除夕"];

export function poemDayOf(ymd: Ymd): PoemDay {
  const lunar = Solar.fromYmd(ymd.year, ymd.month, ymd.day).getLunar();
  const jieqi = lunar.getJieQi() || null;
  // 「元宵节」→「元宵」；「春节」本身就是名字，所以原名和去掉「节」字的都留着
  const names = [...lunar.getFestivals(), ...lunar.getOtherFestivals()].flatMap((f) => [f, f.replace(/节$/, "")]);
  if (jieqi === "清明") names.push("清明");
  const festival = FESTIVALS.find((f) => names.includes(f)) ?? null;
  return { season: SEASON_OF_JIE[lunar.getPrevJie(true).getName()], festival, jieqi, lunarDay: lunar.getDay() };
}

/** 一年里每一天（1 月 1 日到 12 月 31 日） */
export function poemDaysOfYear(year: number): { ymd: Ymd; day: PoemDay }[] {
  const out: { ymd: Ymd; day: PoemDay }[] = [];
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const ymd = { year, month: d.getMonth() + 1, day: d.getDate() };
    out.push({ ymd, day: poemDayOf(ymd) });
  }
  return out;
}
