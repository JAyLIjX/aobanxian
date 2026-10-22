/**
 * 特殊日子与黄道 / 黑道。
 *
 * 值神（黄道 / 黑道）、节气、节日直接用 lunar-javascript；
 * 天赦日、杨公忌日 lunar-javascript 没有现成接口，按传统规则实现：
 *   天赦日：春戊寅、夏甲午、秋戊申、冬甲子。季节按立春、立夏、立秋、立冬划分，
 *          也就是按月建（以节换月的月支）：寅卯辰为春，巳午未为夏，申酉戌为秋，亥子丑为冬
 *   杨公忌日：农历正月十三、二月十一、三月初九、四月初七、五月初五、六月初三、七月初一、
 *          七月廿九、八月廿七、九月廿五、十月廿三、十一月廿一、十二月十九
 */
import { Solar } from "lunar-javascript";
import type { Ymd } from "../core/dayBoundary";

export type SpecialKind = "tianshe" | "festival" | "jieqi" | "yanggong";

export interface SpecialDay {
  kind: SpecialKind;
  /** 节日 / 节气名；天赦日、杨公忌日为空 */
  name?: string;
}

/** 传统节日（lunar-javascript 的农历节日都算，含除夕） */
const TRADITIONAL_FESTIVALS = new Set(["春节", "元宵节", "龙头节", "端午节", "七夕节", "中秋节", "重阳节", "腊八节", "除夕"]);

const TIANSHE: Record<string, string> = { 春: "戊寅", 夏: "甲午", 秋: "戊申", 冬: "甲子" };

const SEASON_OF_BRANCH: Record<string, string> = {
  寅: "春",
  卯: "春",
  辰: "春",
  巳: "夏",
  午: "夏",
  未: "夏",
  申: "秋",
  酉: "秋",
  戌: "秋",
  亥: "冬",
  子: "冬",
  丑: "冬",
};

/** 杨公忌：农历月 → 日 */
const YANGGONG: [number, number][] = [
  [1, 13],
  [2, 11],
  [3, 9],
  [4, 7],
  [5, 5],
  [6, 3],
  [7, 1],
  [7, 29],
  [8, 27],
  [9, 25],
  [10, 23],
  [11, 21],
  [12, 19],
];

export interface DayAlmanac {
  /** 值神，如「明堂」 */
  tianShen: string;
  /** 「黄道」或「黑道」 */
  tianShenType: "黄道" | "黑道";
  isTianshe: boolean;
  isYanggong: boolean;
  festivals: string[];
  jieqi: string | null;
  /** 同一天符合多个时按优先级取一个：天赦 > 传统节日 > 节气 > 杨公忌 */
  special: SpecialDay | null;
  /** 天赦日和春节加闪光特效 */
  sparkle: boolean;
}

export function getAlmanac(ymd: Ymd): DayAlmanac {
  const lunar = Solar.fromYmd(ymd.year, ymd.month, ymd.day).getLunar();
  const season = SEASON_OF_BRANCH[lunar.getMonthInGanZhi().slice(1)];
  const isTianshe = TIANSHE[season] === lunar.getDayInGanZhi();
  const lm = Math.abs(lunar.getMonth());
  const ld = lunar.getDay();
  const isYanggong = YANGGONG.some(([m, d]) => m === lm && d === ld);
  const festivals = lunar.getFestivals().filter((f) => TRADITIONAL_FESTIVALS.has(f));
  const jieqi = lunar.getJieQi() || null;

  let special: SpecialDay | null = null;
  if (isTianshe) special = { kind: "tianshe" };
  else if (festivals.length > 0) special = { kind: "festival", name: festivals[0] };
  else if (jieqi) special = { kind: "jieqi", name: jieqi };
  else if (isYanggong) special = { kind: "yanggong" };

  const type = lunar.getDayTianShenType();
  return {
    tianShen: lunar.getDayTianShen(),
    tianShenType: type === "黄道" ? "黄道" : "黑道",
    isTianshe,
    isYanggong,
    festivals,
    jieqi,
    special,
    sparkle: isTianshe || festivals.includes("春节"),
  };
}
