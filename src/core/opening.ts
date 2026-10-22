/**
 * 每日开场白与特殊日子的幡面文字。只由当天的历法数据决定，所以「掐指一算」重播时
 * 和当天第一次说的是同一句。
 */
import type { DayAlmanac, SpecialDay } from "../calendar/special";
import type { PersonalRelation } from "./zodiac";

export type OpeningKey =
  | "huangdao"
  | "heidao"
  | "tianshe"
  | "yanggong"
  | "festival"
  | "jieqi"
  | "personalClash"
  | "personalHarmony";

export interface Opening {
  key: OpeningKey;
  /** 节日 / 节气名（文案里的 {{name}}） */
  name?: string;
  /** 我的生肖（文案里的 {{animal}}） */
  animal?: string;
}

/**
 * 优先级（从高到低）：特殊日子（天赦日、传统节日、节气、杨公忌日）> 生肖相冲、相合 > 黄道日、黑道日。
 * （纪念日比这些都高，在 anniversary.ts 里处理。）
 */
export function openingFor(almanac: DayAlmanac, personal?: { relation: PersonalRelation; animal: string } | null): Opening {
  const s = almanac.special;
  if (s) return s.name ? { key: s.kind, name: s.name } : { key: s.kind };
  if (personal?.relation === "clash") return { key: "personalClash", animal: personal.animal };
  if (personal?.relation === "harmony") return { key: "personalHarmony", animal: personal.animal };
  return { key: almanac.tianShenType === "黄道" ? "huangdao" : "heidao" };
}

export interface SpecialBannerTexts {
  tianshe: string;
  yanggong: string;
}

/** 特殊日子的幡面文字（幡面循环的第一项） */
export function specialBannerText(special: SpecialDay | null, texts: SpecialBannerTexts): string | null {
  if (!special) return null;
  switch (special.kind) {
    case "tianshe":
      return texts.tianshe;
    case "yanggong":
      return texts.yanggong;
    case "festival":
    case "jieqi":
      return special.name ?? null;
  }
}
