import { disable as disableAutostart, enable as enableAutostart, isEnabled as autostartEnabled } from "@tauri-apps/plugin-autostart";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import { inTauri } from "../platform/window";
import { MAX_BANNER_CHARS, resetPage, sanitize, type Settings, type SettingsPage } from "../settings/settings";
import { useSettings } from "../settings/useSettings";

const PAGES: SettingsPage[] = ["general", "appearance", "rules", "reminders"];

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-row__text">
        <div className="set-row__label">{label}</div>
        {hint && <div className="set-row__hint">{hint}</div>}
      </div>
      <div className="set-row__control">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)}>
      <i />
    </button>
  );
}

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? "is-on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsApp() {
  const { t } = useTranslation();
  const { settings, loaded, update } = useSettings();
  const [page, setPage] = useState<SettingsPage>("general");
  const [bannerDraft, setBannerDraft] = useState(settings.bannerText);

  useEffect(() => setLanguage(settings.language), [settings.language]);
  useEffect(() => setBannerDraft(settings.bannerText), [settings.bannerText]);
  useEffect(() => {
    if (inTauri) void getCurrentWindow().setTitle(t("settings.title"));
    document.title = t("settings.title");
  }, [t]);

  // 开机启动以系统里的实际状态为准
  useEffect(() => {
    if (!loaded || !inTauri) return;
    void autostartEnabled().then((on) => {
      if (on !== settings.autostart) void update((s) => ({ ...s, autostart: on }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => void update((s) => ({ ...s, [key]: value }));

  const setAutostart = async (on: boolean) => {
    try {
      if (inTauri) await (on ? enableAutostart() : disableAutostart());
      set("autostart", inTauri ? await autostartEnabled() : on);
    } catch (err) {
      console.error("切换开机启动失败", err);
    }
  };

  const restore = async () => {
    const next = resetPage(settings, page);
    if (page === "general" && inTauri && next.autostart !== settings.autostart) {
      await (next.autostart ? enableAutostart() : disableAutostart()).catch(() => {});
    }
    await update(next);
  };

  const opts = <T extends string | number>(values: readonly T[], labelKey: string) =>
    values.map((v) => ({ value: v, label: t(`${labelKey}.${v}`) }));

  return (
    <main className="settings paper">
      <nav className="settings__tabs" role="tablist">
        {PAGES.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={p === page} className={p === page ? "is-on" : ""} onClick={() => setPage(p)}>
            {t(`settings.tabs.${p}`)}
          </button>
        ))}
      </nav>

      <section className="settings__page" role="tabpanel">
        {page === "general" && (
          <>
            <Row label={t("settings.autostart")} hint={t("settings.autostartHint")}>
              <Toggle checked={settings.autostart} onChange={(v) => void setAutostart(v)} label={t("settings.autostart")} />
            </Row>
            <Row label={t("settings.onTop")} hint={t("settings.onTopHint")}>
              <Toggle checked={settings.onTop} onChange={(v) => set("onTop", v)} label={t("settings.onTop")} />
            </Row>
            <Row label={t("settings.size")} hint={t("settings.sizeHint")}>
              <Segmented value={settings.size} options={opts(["small", "medium", "large"] as const, "settings.sizeOptions")} onChange={(v) => set("size", v)} />
            </Row>
            <Row label={t("settings.language")}>
              <select value={settings.language} onChange={(e) => set("language", sanitize("language", e.target.value) ?? "system")}>
                {(["system", "zh-CN", "zh-TW", "en"] as const).map((l) => (
                  <option key={l} value={l}>
                    {t(`settings.languageOptions.${l}`)}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t("settings.expandOnLaunch")}>
              <Toggle checked={settings.expandOnLaunch} onChange={(v) => set("expandOnLaunch", v)} label={t("settings.expandOnLaunch")} />
            </Row>
            <Row label={t("settings.collapseOnBlur")}>
              <Toggle checked={settings.collapseOnBlur} onChange={(v) => set("collapseOnBlur", v)} label={t("settings.collapseOnBlur")} />
            </Row>
          </>
        )}

        {page === "appearance" && (
          <>
            <Row label={t("settings.displayFont")} hint={t("settings.displayFontHint")}>
              <Segmented value={settings.displayFont} options={opts(["A", "B"] as const, "settings.displayFontOptions")} onChange={(v) => set("displayFont", v)} />
            </Row>
            <Row label={t("settings.bannerFont")}>
              <Segmented value={settings.bannerFont} options={opts(["pixel", "brush"] as const, "settings.bannerFontOptions")} onChange={(v) => set("bannerFont", v)} />
            </Row>
            <Row label={t("settings.bannerText")} hint={t("settings.bannerTextHint")}>
              <input
                className="text-input"
                value={bannerDraft}
                maxLength={MAX_BANNER_CHARS * 2}
                onChange={(e) => {
                  const draft = [...e.target.value].slice(0, MAX_BANNER_CHARS).join("");
                  setBannerDraft(draft);
                  const clean = sanitize("bannerText", draft);
                  if (clean) set("bannerText", clean);
                }}
                onBlur={() => setBannerDraft(settings.bannerText)}
              />
            </Row>
          </>
        )}

        {page === "rules" && (
          <>
            <Row label={t("settings.elementSource")} hint={t(`settings.elementSourceHints.${settings.elementSource}`)}>
              <Segmented value={settings.elementSource} options={opts(["branch", "nayin", "stem"] as const, "settings.elementSourceOptions")} onChange={(v) => set("elementSource", v)} />
            </Row>
            <Row label={t("settings.topPriority")} hint={t(`settings.topPriorityHints.${settings.topPriority}`)}>
              <Segmented value={settings.topPriority} options={opts(["xiang", "wang"] as const, "settings.topPriorityOptions")} onChange={(v) => set("topPriority", v)} />
            </Row>
            <Row label={t("settings.dayBoundary")} hint={t(`settings.dayBoundaryHints.${settings.dayBoundary}`)}>
              <Segmented value={settings.dayBoundary} options={opts(["midnight", "zi"] as const, "settings.dayBoundaryOptions")} onChange={(v) => set("dayBoundary", v)} />
            </Row>
          </>
        )}

        {page === "reminders" && (
          <>
            <Row label={t("settings.openingEnabled")} hint={t("settings.openingEnabledHint")}>
              <Toggle checked={settings.openingEnabled} onChange={(v) => set("openingEnabled", v)} label={t("settings.openingEnabled")} />
            </Row>
            <Row label={t("settings.effectsEnabled")} hint={t("settings.effectsEnabledHint")}>
              <Toggle checked={settings.effectsEnabled} onChange={(v) => set("effectsEnabled", v)} label={t("settings.effectsEnabled")} />
            </Row>
            <Row label={t("settings.bubbleSeconds")}>
              <Segmented
                value={settings.bubbleSeconds}
                options={([3, 5, 8] as const).map((n) => ({ value: n, label: t("settings.seconds", { n }) }))}
                onChange={(v) => set("bubbleSeconds", v)}
              />
            </Row>
          </>
        )}
      </section>

      <footer className="settings__foot">
        <button type="button" className="text-btn" onClick={() => void restore()}>
          {t("settings.restoreDefaults")}
        </button>
      </footer>
    </main>
  );
}
