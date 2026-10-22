import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import { inTauri } from "../platform/window";
import { useSettings } from "../settings/useSettings";

/** 独立窗口的公共设置：跟随语言设置、窗口标题随语言变化 */
export function useWindowSetup(titleKey: string) {
  const { t, i18n } = useTranslation();
  const settingsState = useSettings();
  const { settings } = settingsState;
  useEffect(() => setLanguage(settings.language), [settings.language]);
  useEffect(() => {
    document.documentElement.dataset.displayFont = settings.displayFont;
  }, [settings.displayFont]);
  useEffect(() => {
    const title = t(titleKey);
    document.title = title;
    if (inTauri) void getCurrentWindow().setTitle(title);
  }, [t, titleKey, i18n.language]);
  return settingsState;
}
