/**
 * 每日一诗：精选唐诗宋词约 400 首，诗文来自 chinese-poetry（https://github.com/chinese-poetry/chinese-poetry，MIT 协议）。
 * 唐诗原数据是繁体、宋词是简体；另一种字形由 scripts/poems/build-poems.ts 用 OpenCC 转出，简体界面显示简体，繁体界面显示繁体。
 * 季节、标签、名句、英文题名、赏析是奥半仙自撰；节日、节气的专属诗在 config/poem-days.json。
 */
import data from "./poems.json";
import poemDays from "../../config/poem-days.json";
import { pickPoemsForYear, type PickReason, type PoemMeta, type Season } from "../core/poemPick";
import { poemDaysOfYear } from "../calendar/poemDay";
import type { Ymd } from "../core/dayBoundary";
import type { Lang } from "../i18n";

type Zh = "zh-CN" | "zh-TW";

export interface Poem extends PoemMeta {
  kind: "shi" | "ci";
  dynasty: "唐" | "宋";
  title: Record<Zh, string>;
  author: Record<Zh, string>;
  lines: Record<Zh, string[]>;
  /** 最有名的两句 */
  famous: Record<Zh, string>;
  titleEn: string;
  authorEn: string;
  /** 一句白话赏析（中文）/ 英文大意 */
  appreciation: Record<Lang, string>;
  seasons: Season[];
  festival?: string;
  jieqi?: string;
}

export const POEMS = data.poems as unknown as Poem[];
export const POEM_SOURCE = data.source;
const BY_ID = new Map(POEMS.map((p) => [p.id, p]));

export function getPoem(id: string): Poem | undefined {
  return BY_ID.get(id);
}

const yearCache = new Map<number, Map<string, { id: string; reason: PickReason }>>();

function yearPicks(year: number) {
  let m = yearCache.get(year);
  if (!m) {
    const days = poemDaysOfYear(year);
    const picks = pickPoemsForYear(
      year,
      days.map((d) => d.day),
      POEMS,
      poemDays as { festival: Record<string, string>; jieqi: Record<string, string> },
    );
    m = new Map(days.map((d, i) => [`${d.ymd.month}-${d.ymd.day}`, picks[i]]));
    yearCache.set(year, m);
  }
  return m;
}

/** 某一天的诗和选它的原因（节日 / 节气 / 满月 / 当季） */
export function poemForDay(ymd: Ymd): { poem: Poem; reason: PickReason } {
  const pick = yearPicks(ymd.year).get(`${ymd.month}-${ymd.day}`)!;
  return { poem: BY_ID.get(pick.id)!, reason: pick.reason };
}

/** 界面用的字形：繁体界面用繁体，其他用简体（英文界面保留中文原诗） */
export function poemScript(lang: Lang): Zh {
  return lang === "zh-TW" ? "zh-TW" : "zh-CN";
}
