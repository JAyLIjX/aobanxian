/**
 * 宣传片的公共设置：引入软件自己的字体和样式；每种语言一个 i18n 实例（不改全局语言，渲染结果确定）；
 * 等字体加载完再渲染。
 */
import "../../../src/fonts.css";
import "../../../src/App.css";
import "./promo.css";
import i18n from "../../../src/i18n";
import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { continueRender, delayRender } from "remotion";
import type { Lang } from "../../../src/i18n";

// 软件按 <html lang> 选字体变量；宣传片里每段自己设（见 Lang），全局先固定成简体
document.documentElement.lang = "zh-CN";

const FONT_VARS: Record<Lang, Record<string, string>> = {
  "zh-CN": { "--font-body": '"WX WenKai", var(--font-fallback)', "--font-display": '"WX MaShanZheng", var(--font-body)' },
  "zh-TW": { "--font-body": '"WX WenKai", var(--font-fallback)', "--font-display": '"WX MaShanZheng", var(--font-body)' },
  en: { "--font-body": '"WX Garamond", "WX WenKai", var(--font-fallback)', "--font-display": '"WX Garamond", "WX WenKai", var(--font-fallback)' },
};

const instances = new Map<Lang, typeof i18n>();
export function i18nFor(lang: Lang) {
  let inst = instances.get(lang);
  if (!inst) {
    inst = i18n.cloneInstance({ lng: lang });
    void inst.changeLanguage(lang);
    instances.set(lang, inst);
  }
  return inst;
}

export function Lang({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18nFor(lang)}>
      <div lang={lang === "zh-TW" ? "zh-Hant" : lang === "en" ? "en" : "zh-Hans"} data-lang={lang} style={{ display: "contents", ...FONT_VARS[lang] }}>
        {children}
      </div>
    </I18nextProvider>
  );
}

const FAMILIES = ["WX WenKai", "WX MaShanZheng", "WX ZhiMangXing", "WX FusionPixel12", "WX FusionPixel10", "WX ZhiMangXing Banner", "WX Garamond", "Promo Brush", "Promo Kai", "Promo Garamond"];

/** 等所有字体加载完 */
export function FontGate({ children }: { children: ReactNode }) {
  const [handle] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void Promise.all(FAMILIES.map((f) => document.fonts.load(`32px "${f}"`, "奥半仙宜忌Aa1").catch(() => []))).then(() =>
      document.fonts.ready.then(() => {
        setReady(true);
        continueRender(handle);
      }),
    );
  }, [handle]);
  return ready ? <>{children}</> : null;
}
