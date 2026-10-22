/**
 * 把一天的数据按语言格式化成界面文字。
 * 简体界面里，四档文字、解释句、星宿吉凶、小贴士直接用 rules/default.json（它们是流派的一部分）；
 * 其他语言用语言文件里的 rulesText。
 */
import type { TFunction } from "i18next";
import type { DayDetail, DayInfo } from "../calendar/day";
import type { Ymd } from "../core/dayBoundary";
import type { Rules, TierKey } from "../core/rules";
import { pickTip, type Outfit, type Phase } from "../core/wuxing";
import type { Lang } from "./index";
import { ganzhi, term, toTW, translate } from "./terms";

const INTL_LOCALE: Record<Lang, string> = { "zh-CN": "zh-CN", "zh-TW": "zh-TW", en: "en-US" };

const jsDate = (d: Ymd) => new Date(d.year, d.month - 1, d.day);

export function monthName(month: number, lang: Lang): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { month: "long" }).format(new Date(2000, month - 1, 1));
}

export function fmtDate(d: Ymd, lang: Lang, t: TFunction): string {
  return t("date.full", { year: d.year, month: d.month, day: d.day, monthName: monthName(d.month, lang) });
}

export function fmtYearMonth(d: { year: number; month: number }, lang: Lang, t: TFunction): string {
  return t("date.yearMonth", { year: d.year, month: d.month, monthName: monthName(d.month, lang) });
}

export function weekday(d: Ymd, lang: Lang): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { weekday: "long" }).format(jsDate(d));
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** 农历月日，如「农历九月十二」「Lunar 9th month, day 12」 */
export function lunarText(info: DayInfo, lang: Lang, t: TFunction): string {
  const l = info.lunar;
  if (lang === "en") {
    const month = `${l.isLeapMonth ? t("date.leap") : ""}${ordinal(l.month)} month`;
    return t("date.lunar", { month, day: l.day });
  }
  const text = t("date.lunar", { month: l.monthName, day: l.dayName });
  return lang === "zh-TW" ? toTW(text) : text;
}

export function ganzhiLine(info: DayInfo, lang: Lang, t: TFunction): string {
  const g = info.ganzhi;
  return t("date.ganzhi", { year: ganzhi(g.year, lang), month: ganzhi(g.month, lang), day: ganzhi(g.day, lang) });
}

/** 月历格子里的小字：英文格子窄，只放英文 */
export function cellText(info: DayInfo, lang: Lang): string {
  const c = info.cell;
  if (lang === "zh-CN") return c.text;
  if (lang === "zh-TW") return toTW(c.text);
  switch (c.kind) {
    case "jieqi":
      return translate("jieqi", c.text, lang);
    case "festival":
      return translate("festival", c.text, lang);
    case "month":
      return `${info.lunar.isLeapMonth ? "Leap " : ""}M${info.lunar.month}`;
    case "day":
      return String(info.lunar.day);
  }
}

export function tierLabel(key: TierKey, rules: Rules, lang: Lang, t: TFunction): string {
  return lang === "zh-CN" ? rules.tierLabels[key] : t(`rulesText.tiers.${key}`);
}

export function phaseLabel(phase: Phase, t: TFunction): string {
  return t(`phase.${phase}`);
}

/** 当日五行的说法：纳音「大林木」/ 日干「庚金」/ 日支「子水」 */
export function dayLabel(outfit: Outfit, lang: Lang): string {
  const d = outfit.day;
  if (d.source === "nayin") return term("nayin", d.label, lang);
  if (lang === "en") return `${d.label} · ${translate("element", d.element, lang)}`;
  return lang === "zh-TW" ? toTW(d.label) : d.label;
}

export function explanation(outfit: Outfit, rules: Rules, lang: Lang, t: TFunction): string {
  if (lang === "zh-CN") return outfit.explanation;
  const el = (e: string) => translate("element", e, lang);
  return t(`rulesText.explanation.${rules.topPriority}`, {
    label: dayLabel(outfit, lang),
    D: el(outfit.day.element),
    wang: el(outfit.phases.wang),
    xiang: el(outfit.phases.xiang),
    primaryColor: translate("color", outfit.primary.name, lang),
    accentColor: translate("color", outfit.accent.name, lang),
  });
}

export function xiuLuck(detail: DayDetail, rules: Rules, lang: Lang, t: TFunction): string {
  if (lang === "zh-CN") return detail.xiu.luckLabel;
  // luckLabel 是按 rules.xiuLuckLabels 映射过的；反查原始吉凶
  const raw = Object.entries(rules.xiuLuckLabels).find(([, v]) => v === detail.xiu.luckLabel)?.[0] ?? detail.xiu.luckLabel;
  return t(`rulesText.xiuLuck.${raw}`, { defaultValue: detail.xiu.luckLabel });
}

export function tip(detail: DayDetail, rules: Rules, lang: Lang, t: TFunction): string | null {
  if (lang === "zh-CN") return detail.tip;
  const list = t(`rulesText.tips.${detail.outfit.day.element}`, { returnObjects: true }) as unknown;
  if (!Array.isArray(list) || list.length === 0) return null;
  return pickTip(detail.outfit.day.element, detail.julianDay, { ...rules, tips: { ...rules.tips, [detail.outfit.day.element]: list } });
}

export function xiuName(detail: DayDetail, lang: Lang): string {
  if (lang === "en") {
    const en = translate("xiu", detail.xiu.name, lang);
    return en === detail.xiu.name ? detail.xiu.fullName : `${detail.xiu.fullName} · ${en}`;
  }
  return lang === "zh-TW" ? toTW(detail.xiu.fullName) : detail.xiu.fullName;
}
