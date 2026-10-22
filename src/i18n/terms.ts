/**
 * 文化专有词（历法、宜忌、颜色……）的多语言显示，依据 locales/glossary.json。
 *
 *   简体：原词
 *   繁体：术语表的 zh-TW，没有就查 zh-TW.terms.json（OpenCC 逐条转换），都没有原样返回
 *   英文：「中文原词 · 英文解释」，如「纳采 · Betrothal gifts」
 *         干支是「戊辰 Wu-Chen」，颜色是「Vermilion 银朱」（英文在前）
 */
import glossaryJson from "../../locales/glossary.json";
import twTerms from "../../locales/zh-TW.terms.json";
import type { Lang } from "./index";

export type Category =
  | "element"
  | "stem"
  | "branch"
  | "zodiac"
  | "direction"
  | "nayin"
  | "jieqi"
  | "festival"
  | "xiu"
  | "tianshen"
  | "special"
  | "color"
  | "traditionalColor"
  | "yiji";

type Entry = Partial<Record<Lang, string>>;
const glossary = glossaryJson as unknown as Record<Category, Record<string, Entry>>;
const tw = twTerms as Record<string, string>;

/** 简体 → 繁体（整条查表，查不到原样返回） */
export function toTW(s: string): string {
  return tw[s] ?? s;
}

/** 只要译文（英文气泡等）；没有译文返回原词 */
export function translate(cat: Category, zh: string, lang: Lang): string {
  if (lang === "zh-CN") return zh;
  const entry = glossary[cat]?.[zh];
  if (lang === "zh-TW") return entry?.["zh-TW"] ?? toTW(zh);
  return entry?.[lang] ?? zh;
}

/** 界面显示：英文时附上中文原词 */
export function term(cat: Category, zh: string, lang: Lang): string {
  if (lang !== "en") return translate(cat, zh, lang);
  const en = glossary[cat]?.[zh]?.en;
  if (!en) return zh;
  if (cat === "color" || cat === "traditionalColor") return `${en} ${zh}`;
  return `${zh} · ${en}`;
}

/** 干支：英文为「戊辰 Wu-Chen」 */
export function ganzhi(gz: string, lang: Lang): string {
  if (lang === "zh-TW") return toTW(gz);
  if (lang !== "en") return gz;
  const [s, b] = [...gz];
  const stem = glossary.stem[s]?.en;
  const branch = glossary.branch[b]?.en;
  return stem && branch ? `${gz} ${stem}-${branch}` : gz;
}

/** 术语表里收录了哪些词（测试用） */
export function glossaryKeys(cat: Category): string[] {
  return Object.keys(glossary[cat] ?? {});
}
