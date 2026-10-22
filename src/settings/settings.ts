/**
 * 用户设置：类型、默认值、校验与「只存改过的项」。纯函数部分不依赖 Tauri，测试里可直接用。
 */
import branding from "../../config/branding.json";
import defaultsJson from "../../config/settings.default.json";
import { defaultRules, type DayBoundary, type ElementSource, type Rules, type TopPriority } from "../core/rules";
import { MAX_BANNER_CHARS, clampBannerText } from "../core/banner";

export type Language = "system" | "zh-CN" | "zh-TW" | "en";
export type FigureSize = "small" | "medium" | "large";

export interface Settings {
  // 通用
  autostart: boolean;
  onTop: boolean;
  size: FigureSize;
  language: Language;
  expandOnLaunch: boolean;
  collapseOnBlur: boolean;
  // 外观
  displayFont: "A" | "B";
  bannerFont: "pixel" | "brush";
  bannerText: string;
  // 规则
  elementSource: ElementSource;
  topPriority: TopPriority;
  dayBoundary: DayBoundary;
  // 提醒
  openingEnabled: boolean;
  effectsEnabled: boolean;
  bubbleSeconds: 3 | 5 | 8;
}

export type SettingsPage = "general" | "appearance" | "rules" | "reminders";

/** 每一页有哪些设置项（「恢复默认」按页恢复） */
export const SETTINGS_PAGES: Record<SettingsPage, (keyof Settings)[]> = {
  general: ["autostart", "onTop", "size", "language", "expandOnLaunch", "collapseOnBlur"],
  appearance: ["displayFont", "bannerFont", "bannerText"],
  rules: ["elementSource", "topPriority", "dayBoundary"],
  reminders: ["openingEnabled", "effectsEnabled", "bubbleSeconds"],
};

// 去掉 JSON 里 "$comment" 这类注释字段
const { $comment: _comment, ...defaultsFromFile } = defaultsJson;
void _comment;

export const DEFAULT_SETTINGS: Settings = {
  ...(defaultsFromFile as Omit<Settings, "bannerText" | "elementSource" | "topPriority" | "dayBoundary">),
  bannerText: branding.bannerText,
  elementSource: defaultRules.elementSource,
  topPriority: defaultRules.topPriority,
  dayBoundary: defaultRules.dayBoundary,
};

/** 每格多少个 CSS 像素 */
export const SIZE_SCALE: Record<FigureSize, number> = { small: 1, medium: 2, large: 3 };

const CHOICES: Partial<Record<keyof Settings, readonly unknown[]>> = {
  size: ["small", "medium", "large"],
  language: ["system", "zh-CN", "zh-TW", "en"],
  displayFont: ["A", "B"],
  bannerFont: ["pixel", "brush"],
  elementSource: ["nayin", "stem", "branch"],
  topPriority: ["xiang", "wang"],
  dayBoundary: ["midnight", "zi"],
  bubbleSeconds: [3, 5, 8],
};

/** 校验单个值；不合法时返回 undefined（用默认值） */
export function sanitize<K extends keyof Settings>(key: K, value: unknown): Settings[K] | undefined {
  const def = DEFAULT_SETTINGS[key];
  const choices = CHOICES[key];
  if (choices) return choices.includes(value) ? (value as Settings[K]) : undefined;
  if (typeof def === "boolean") return typeof value === "boolean" ? (value as Settings[K]) : undefined;
  if (key === "bannerText") {
    if (typeof value !== "string") return undefined;
    const text = clampBannerText(value.trim());
    return (text || undefined) as Settings[K] | undefined;
  }
  return undefined;
}

/** 用户覆盖项 + 默认值 = 完整设置 */
export function mergeSettings(overrides: Record<string, unknown>): Settings {
  const out = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (!(key in overrides)) continue;
    const v = sanitize(key, overrides[key]);
    if (v !== undefined) (out as Record<string, unknown>)[key] = v;
  }
  return out;
}

/** 只保留和默认值不同的项（存盘用） */
export function diffFromDefaults(settings: Settings): Partial<Settings> {
  const out: Partial<Settings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (settings[key] !== DEFAULT_SETTINGS[key]) (out as Record<string, unknown>)[key] = settings[key];
  }
  return out;
}

/** 某一页恢复默认 */
export function resetPage(settings: Settings, page: SettingsPage): Settings {
  const out = { ...settings };
  for (const key of SETTINGS_PAGES[page]) (out as Record<string, unknown>)[key] = DEFAULT_SETTINGS[key];
  return out;
}

/** 把设置里的规则项叠到规则上 */
export function rulesWith(settings: Settings, base: Rules = defaultRules): Rules {
  return {
    ...base,
    elementSource: settings.elementSource,
    topPriority: settings.topPriority,
    dayBoundary: settings.dayBoundary,
  };
}

export { MAX_BANNER_CHARS };
