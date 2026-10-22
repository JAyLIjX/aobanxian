/**
 * 每日一诗：《唐詩三百首》（蘅塘退士選）的五言、七言绝句，原文录自维基文库（繁体，保持原文）。
 * 白话大意、英文诗题和大意是奥半仙自撰；繁体大意由 scripts/i18n/build-zh-tw.ts 从简体生成。
 */
import data from "./poems.json";
import { poemIndexOfDay } from "../core/poem";
import type { Lang } from "../i18n";

export interface Poem {
  id: number;
  form: "五言絕句" | "七言絕句";
  author: string;
  authorEn: string;
  title: string;
  titleEn: string;
  /** 两行原文，每行一联（含标点） */
  lines: [string, string];
  gist: Record<Lang, string>;
  /** 维基文库页面名 */
  page: string;
}

export const POEMS = data.poems as unknown as Poem[];
export const POEM_SOURCE = data.source;

export function poemOfDay(julianDay: number): Poem {
  return POEMS[poemIndexOfDay(julianDay, POEMS.length)];
}
