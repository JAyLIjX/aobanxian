/**
 * 择日：在接下来若干天里，找出某件事「宜」而且不「忌」的日子。
 */
import zeriJson from "../../config/zeri.json";
import type { Ymd } from "../core/dayBoundary";
import type { Rules } from "../core/rules";
import { personalRelation } from "../core/zodiac";
import { getDayDetail, type DayDetail } from "./day";
import { getAlmanac, type DayAlmanac } from "./special";

export interface ZeriEvent {
  id: string;
  /** 对应的黄历用词 */
  words: string[];
}

export const ZERI_EVENTS: ZeriEvent[] = zeriJson.events;
export const ZERI_RANGES: number[] = zeriJson.ranges;

export interface ZeriDay {
  detail: DayDetail;
  almanac: DayAlmanac;
  /** 这一天「宜」里命中的词 */
  matched: string[];
  /** 冲我的生肖（没设置生肖时总是 false）：整行标灰 */
  clashMe: boolean;
  /** 害我的生肖（六害）：只加一个浅色标签提示，不标灰 */
  harmMe: boolean;
}

/** 某一天是否适合：宜里至少有一个词，忌里一个都没有 */
export function suits(event: ZeriEvent, yi: string[], ji: string[]): boolean {
  return event.words.some((w) => yi.includes(w)) && !event.words.some((w) => ji.includes(w));
}

function addDays(ymd: Ymd, n: number): Ymd {
  const d = new Date(ymd.year, ymd.month - 1, ymd.day + n);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

/** 从 start（含）起的 days 天里，适合 event 的日子 */
export function pickDays(event: ZeriEvent, start: Ymd, days: number, rules: Rules, myBranch?: string | null): ZeriDay[] {
  const out: ZeriDay[] = [];
  for (let i = 0; i < days; i++) {
    const ymd = addDays(start, i);
    const detail = getDayDetail(ymd, rules);
    if (!suits(event, detail.yi, detail.ji)) continue;
    out.push({
      detail,
      almanac: getAlmanac(ymd),
      matched: event.words.filter((w) => detail.yi.includes(w)),
      clashMe: myBranch ? personalRelation(detail.pillar.branch, myBranch) === "clash" : false,
      harmMe: myBranch ? personalRelation(detail.pillar.branch, myBranch) === "harm" : false,
    });
  }
  return out;
}
