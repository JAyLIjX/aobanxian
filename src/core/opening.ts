/**
 * 每日开场白与特殊日子的幡面文字。只由当天的历法数据决定，所以「掐指一算」重播时
 * 和当天第一次说的是同一句。
 */
import type { DayAlmanac, SpecialDay } from "../calendar/special";

export type OpeningKey = "huangdao" | "heidao" | "tianshe" | "yanggong" | "festival" | "jieqi";

export interface Opening {
  key: OpeningKey;
  /** 节日 / 节气名（文案里的 {{name}}） */
  name?: string;
}

/** 特殊日子用对应的开场白；否则按黄道 / 黑道 */
export function openingFor(almanac: DayAlmanac): Opening {
  const s = almanac.special;
  if (s) return s.name ? { key: s.kind, name: s.name } : { key: s.kind };
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
