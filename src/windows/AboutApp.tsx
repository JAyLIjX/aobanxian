import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import branding from "../../config/branding.json";
import { setLanguage } from "../i18n";
import { inTauri } from "../platform/window";
import { useSettings } from "../settings/useSettings";

export function AboutApp() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [version, setVersion] = useState("");

  useEffect(() => setLanguage(settings.language), [settings.language]);
  useEffect(() => {
    if (inTauri) {
      void getVersion().then(setVersion);
      void getCurrentWindow().setTitle(t("about.title"));
    }
    document.title = t("about.title");
  }, [t]);

  const open = (url: string) => (inTauri ? void openUrl(url) : window.open(url, "_blank"));

  return (
    <main className="about paper">
      <h1 className="display">{t("app.name")}</h1>
      <p className="about__tagline">{t("app.tagline")}</p>
      {version && <p className="muted">{t("about.version", { version })}</p>}
      <dl className="facts about__facts">
        <dt>{t("branding.author")}</dt>
        <dd>
          <button type="button" className="text-btn" onClick={() => open(`https://github.com/${branding.author}`)}>
            {branding.author}
          </button>
        </dd>
        <dt>{t("about.repo")}</dt>
        <dd>
          <button type="button" className="text-btn" onClick={() => open(branding.repository)}>
            {branding.repository.replace("https://", "")}
          </button>
        </dd>
      </dl>
      <p>{t("about.license")}</p>
      <h2>{t("about.thanks")}</h2>
      <p className="about__thanks">{t("about.thanksList")}</p>
      <p className="muted about__disclaimer">{t("about.disclaimer")}</p>
    </main>
  );
}
