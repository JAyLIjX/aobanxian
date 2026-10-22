/**
 * 多语言：i18next 管理界面文字，语言文件在 locales/。
 * 默认跟随系统语言，设置里可手动切换；切换后所有窗口即时更新。
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en.json";
import zhCN from "../../locales/zh-CN.json";
import zhTW from "../../locales/zh-TW.json";
import type { Language } from "../settings/settings";

export type Lang = "zh-CN" | "zh-TW" | "en";
export const LANGS: Lang[] = ["zh-CN", "zh-TW", "en"];

/** 系统语言 → 支持的语言：繁体地区用 zh-TW，其他中文用 zh-CN，其余用英文 */
export function resolveSystemLang(tags: readonly string[]): Lang {
  for (const tag of tags) {
    const t = tag.toLowerCase();
    if (/^zh-(tw|hk|mo)|^zh-hant/.test(t)) return "zh-TW";
    if (t.startsWith("zh")) return "zh-CN";
    if (t.startsWith("en")) return "en";
  }
  return "en";
}

export function resolveLang(setting: Language): Lang {
  if (setting !== "system") return setting;
  const tags = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  return resolveSystemLang(tags);
}

void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    "zh-TW": { translation: zhTW },
    en: { translation: en },
  },
  lng: resolveLang("system"),
  fallbackLng: "zh-CN",
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export function setLanguage(setting: Language): void {
  const lang = resolveLang(setting);
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export default i18n;
