/**
 * 《周易》六十四卦：卦名、卦辭、爻辭、用九 / 用六（原文）+ 自撰的英文卦名与白话解读。
 */
import data from "./zhouyi.json";
import type { Trigram } from "../core/gua";
import type { Lang } from "../i18n";

export interface Hexagram {
  kingWen: number;
  name: string;
  symbol: string;
  lower: Trigram;
  upper: Trigram;
  judgment: string;
  /** 初九、六二 …… */
  lineTags: string[];
  lines: string[];
  /** 乾卦用九、坤卦用六 */
  extra?: { tag: string; text: string };
  en: string;
  reading: Record<Lang, string>;
  lineReadings: Record<Lang, string[]>;
}

export const HEXAGRAMS = data.hexagrams as Hexagram[];
export const ZHOUYI_SOURCE = data.source;

/** 八卦所象：乾天 兌澤 離火 震雷 巽風 坎水 艮山 坤地 */
export const TRIGRAM_IMAGE: Record<Trigram, string> = { 乾: "天", 兌: "澤", 離: "火", 震: "雷", 巽: "風", 坎: "水", 艮: "山", 坤: "地" };

export function hexagramOf(upper: Trigram, lower: Trigram): Hexagram {
  const h = HEXAGRAMS.find((x) => x.upper === upper && x.lower === lower);
  if (!h) throw new Error(`找不到 ${upper}上${lower}下 的卦`);
  return h;
}

/** 全名：上下同卦写「乾為天」，否则「風火家人」 */
export function fullName(h: Hexagram): string {
  if (h.upper === h.lower) return `${h.upper}為${TRIGRAM_IMAGE[h.upper]}`;
  return `${TRIGRAM_IMAGE[h.upper]}${TRIGRAM_IMAGE[h.lower]}${h.name}`;
}
