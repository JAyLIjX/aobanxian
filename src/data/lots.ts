/**
 * 签诗数据：《關聖帝君靈籤》一百签（原文）+ 我们自己写的白话解读（三种语言）。
 */
import data from "./lots.json";
import type { LotGrade } from "../core/lots";
import type { Lang } from "../i18n";

export interface Lot {
  n: number;
  grade: LotGrade;
  /** 原书的签等（大吉、上吉、中平……） */
  gradeRaw: string;
  /** 典故 */
  story: string;
  poem: string[];
  reading: Record<Lang, string>;
}

export const LOTS = data.lots as Lot[];
export const LOT_SOURCE = data.source;

export function getLot(n: number): Lot {
  return LOTS[n - 1];
}
