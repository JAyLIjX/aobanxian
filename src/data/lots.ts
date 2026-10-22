/**
 * 签诗数据：《關聖帝君靈籤》一百签（原文）+ 我们自己写的白话总解、典故故事、分事项（三种语言）。
 * 签诗、典故标题是维基文库原文（繁体）；其余是依据维基文库该签页面（聖意、解曰、釋義、故事及記載）自撰的白话。
 * 繁体由 scripts/i18n/build-zh-tw.ts 从简体生成。
 */
import data from "./lots.json";
import type { LotGrade } from "../core/lots";
import type { Lang } from "../i18n";

/** 分事项，按显示顺序 */
export const LOT_ASPECTS = ["career", "wealth", "love", "travel", "exam", "lost", "health"] as const;
export type LotAspect = (typeof LOT_ASPECTS)[number];

/**
 * 典故故事的依据：record 维基文库「故事及記載」；history 正史；
 * legend 小说、戏曲、民间传说（故事开头注明「相传」或「据《××》」）；brief 找不到可靠出处，只有简介
 */
/** 「古人怎么解」：签书原文的几段注解，按显示顺序 */
export const LOT_CLASSIC = ["shengyi", "dongpo", "bixian", "jieyue", "shiyi"] as const;
export type LotClassic = (typeof LOT_CLASSIC)[number];

export type TaleBasis = "record" | "history" | "legend" | "brief";

export interface Lot {
  n: number;
  grade: LotGrade;
  /** 原书的签等（大吉、上吉、中平……） */
  gradeRaw: string;
  /** 典故 */
  story: string;
  poem: string[];
  /** 白话总解 */
  reading: Record<Lang, string>;
  /** 典故故事（白话） */
  tale: Record<Lang, string>;
  taleBasis: TaleBasis;
  /** 分事项，每项一句 */
  aspects: Record<LotAspect, Record<Lang, string>>;
  /** 签书原文：聖意、東坡解、碧仙註、解曰、釋義（繁体，每段若干行） */
  classic: Record<LotClassic, string[]>;
}

export const LOTS = data.lots as Lot[];
export const LOT_SOURCE = data.source;

export function getLot(n: number): Lot {
  return LOTS[n - 1];
}
