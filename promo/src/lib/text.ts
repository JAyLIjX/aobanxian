/**
 * 宣传片里自写文字的公共函数（场景和 scripts/promo-text.ts 共用，保证字体子集收全）。
 */
import type { Ymd } from "../../../src/core/dayBoundary";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** 菜单栏右上角的时钟，如「10月22日 周四 14:05」 */
export function clockText(day: Ymd, time = "14:05"): string {
  const w = WEEK[new Date(day.year, day.month - 1, day.day).getDay()];
  return `${day.month}月${day.day}日 周${w} ${time}`;
}

/** 每日吉色那段的大字行「今日巳火 · 宜黄宜红」：五行和吉色用毛笔字，中间的「·」用文楷（马善政没有这个标点） */
export const COLORS_SEP = " · ";

export const MENU_TITLE = "桌面";
export const WINDOW_TITLES = { gua: "每日一卦", zeri: "择日", anniversaries: "纪念日" };
