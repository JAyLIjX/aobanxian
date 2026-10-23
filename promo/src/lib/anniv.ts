/**
 * 纪念日那段的示例数据（6 个）：爸爸的生日农历五月初九、妈妈的生日 2 月 24 日，
 * 好友的生日 1 月 2 日、3 月 26 日、3 月 30 日、8 月 28 日。
 *
 * 软件只在纪念日「当天」由角色冒气泡提醒（「今日是××」）；这 6 个日子都不在 10 月 22 日，
 * 所以推近提醒气泡之前，画面翻到最近的一个纪念日 2027 年 1 月 2 日（好友的生日），列表和气泡都按那天显示。
 */
import type { Anniversary } from "../../../src/calendar/anniversary";
import type { Ymd } from "../../../src/core/dayBoundary";

const solar = (id: string, name: string, month: number, day: number): Anniversary => ({ id, name, type: "birthday", calendar: "solar", month, day, leap: false, repeat: true });

export const DEMO_ANNIVERSARIES: Anniversary[] = [
  { id: "dad", name: "爸爸", type: "birthday", calendar: "lunar", month: 5, day: 9, leap: false, repeat: true },
  solar("mom", "妈妈", 2, 24),
  solar("friend-0102", "好友", 1, 2),
  solar("friend-0326", "好友", 3, 26),
  solar("friend-0330", "好友", 3, 30),
  solar("friend-0828", "好友", 8, 28),
];

/** 提醒气泡那一刻的「今天」：好友的生日 */
export const ANNIV_CLOCK_DAY: Ymd = { year: 2027, month: 1, day: 2 };
export const ANNIV_TODAY = DEMO_ANNIVERSARIES[2];
