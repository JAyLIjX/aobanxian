/**
 * 求签：每天一签。签号由「日期 + 本机随机种子」算出，同一天怎么求都是同一签，
 * 不同的电脑同一天抽到的不一样。签册按日期记下每天的签。
 */
import { ymdKey, type Ymd } from "./dayBoundary";

export type LotGrade = "上上" | "上" | "中" | "下" | "下下";
export const LOT_GRADES: LotGrade[] = ["上上", "上", "中", "下", "下下"];
export const LOT_COUNT = 100;

/** 原签等归并成五级 */
export const GRADE_OF: Record<string, LotGrade> = {
  大吉: "上上",
  上上: "上上",
  上吉: "上",
  上平: "上",
  中吉: "中",
  中平: "中",
  下吉: "下",
  下平: "下",
  下下: "下下",
};

/** FNV-1a，够用且各平台一致 */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // 再搅一下，避免相邻日期落在相邻签号
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

/** 某一天的签号（1–100） */
export function lotOfDay(day: Ymd, salt: string): number {
  return (hash(`${salt}|${ymdKey(day)}`) % LOT_COUNT) + 1;
}

export interface LotRecord {
  /** YYYY-MM-DD */
  date: string;
  n: number;
}

/** 记进签册：同一天只记一次，按日期从新到旧 */
export function addToBook(book: LotRecord[], rec: LotRecord): LotRecord[] {
  if (book.some((r) => r.date === rec.date)) return book;
  return [rec, ...book].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function newSalt(): string {
  return Math.random().toString(36).slice(2, 12);
}
