/**
 * 《周易》六十四卦：卦名、卦辭、爻辭、用九 / 用六、彖傳、大象傳、小象傳（原文，维基文库）
 * + 自撰的英文卦名与白话（卦象画面、彖传和大象传白话、一句话、主题短语、爻的白话）。
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
  /** 卦名在界面语言里的写法（简体界面用简体，如「讼」；繁体「訟」；英文同繁体），只用于自撰的句子 */
  nameLocal?: Record<Lang, string>;
  /** 彖傳原文 */
  tuan: string;
  /** 大象傳原文（「象曰」第一句） */
  daxiang: string;
  /** 小象傳原文，初爻到上爻六条；乾、坤另有用九、用六一条 */
  xiaoxiang: string[];
  /** 自撰：卦象画面、彖传白话、大象传白话、一句话、主题短语 */
  image: Record<Lang, string>;
  tuanPlain: Record<Lang, string>;
  daxiangPlain: Record<Lang, string>;
  brief: Record<Lang, string>;
  theme: Record<Lang, string>;
}

export const HEXAGRAMS = data.hexagrams as unknown as Hexagram[];
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
