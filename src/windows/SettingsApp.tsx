import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as autostartEnabled,
} from "@tauri-apps/plugin-autostart";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import { inTauri } from "../platform/window";
import { checkForUpdate } from "../platform/updater";
import { openView } from "../platform/windows";
import {
  MAX_BANNER_CHARS,
  MY_ZODIAC_OPTIONS,
  resetPage,
  rulesWith,
  sanitize,
  type Settings,
  type SettingsPage,
} from "../settings/settings";
import { ZODIAC, type Branch } from "../core/zodiac";
import { term } from "../i18n/terms";
import { CharacterPicker } from "../components/CharacterPicker";
import { TextField } from "../components/TextField";
import type { Lang } from "../i18n";
import { useSettings } from "../settings/useSettings";
import {
  exportPayload,
  mergeImported,
  useAnniversaries,
} from "../settings/anniversaries";
import { useMerit } from "../settings/merit";

const PAGES: SettingsPage[] = ["general", "appearance", "rules", "reminders"];

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? "is-on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsApp() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { settings, loaded, update } = useSettings();
  const [page, setPage] = useState<SettingsPage>("general");
  const anniv = useAnniversaries();
  const merit = useMerit();
  const rules = useMemo(() => rulesWith(settings), [settings]);
  const [dataMsg, setDataMsg] = useState<string | null>(null);
  // 立即检查更新：有新版就打开更新窗口，没有就显示「已是最新版本」
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const checkNow = async () => {
    setChecking(true);
    setUpdateMsg(null);
    try {
      const u = await checkForUpdate();
      if (u) {
        setUpdateMsg(t("update.found", { version: u.version }));
        openView("update", t("update.title"));
      } else {
        setUpdateMsg(t("update.upToDate", { version: inTauri ? await getVersion() : "dev" }));
      }
    } catch {
      setUpdateMsg(t("update.failed"));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => setLanguage(settings.language), [settings.language]);
  useEffect(() => {
    if (inTauri) void getCurrentWindow().setTitle(t("settings.title"));
    document.title = t("settings.title");
  }, [t]);

  // 开机启动以系统里的实际状态为准
  useEffect(() => {
    if (!loaded || !inTauri) return;
    void autostartEnabled().then((on) => {
      if (on !== settings.autostart)
        void update((s) => ({ ...s, autostart: on }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    void update((s) => ({ ...s, [key]: value }));

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
    if (
      page === "general" &&
      inTauri &&
      next.autostart !== settings.autostart
    ) {
      await (next.autostart ? enableAutostart() : disableAutostart()).catch(
        () => {},
      );
    }
    await update(next);
  };

  // 纪念日导出 / 导入（JSON 文件）。浏览器里退回下载 / 文件选择
  const exportAnniversaries = async () => {
    const text = JSON.stringify(exportPayload(anniv.list), null, 2);
    try {
      if (inTauri) {
        const path = await saveDialog({
          defaultPath: "aobanxian-anniversaries.json",
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (!path) return;
        await writeTextFile(path, text);
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        );
        a.download = "aobanxian-anniversaries.json";
        a.click();
      }
      setDataMsg(t("settings.exported", { n: anniv.list.length }));
    } catch (err) {
      console.error("导出纪念日失败", err);
    }
  };
  const importFrom = async (text: string) => {
    try {
      const { list, count } = mergeImported(anniv.list, JSON.parse(text));
      await anniv.save(list);
      setDataMsg(t("settings.imported", { n: count }));
    } catch {
      setDataMsg(t("settings.importFailed"));
    }
  };
  const importAnniversaries = async () => {
    if (inTauri) {
      const path = await openDialog({
        multiple: false,
        directory: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (typeof path !== "string") return;
      await importFrom(await readTextFile(path).catch(() => ""));
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => void input.files?.[0]?.text().then(importFrom);
    input.click();
  };

  const opts = <T extends string | number>(
    values: readonly T[],
    labelKey: string,
  ) => values.map((v) => ({ value: v, label: t(`${labelKey}.${v}`) }));

  return (
    <main className="settings paper">
      <nav className="settings__tabs" role="tablist">
        {PAGES.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={p === page}
            className={p === page ? "is-on" : ""}
            onClick={() => setPage(p)}
          >
            {t(`settings.tabs.${p}`)}
          </button>
        ))}
      </nav>

      <section className="settings__page" role="tabpanel">
        {page === "general" && (
          <>
            <Row
              label={t("settings.autostart")}
              hint={t("settings.autostartHint")}
            >
              <Toggle
                checked={settings.autostart}
                onChange={(v) => void setAutostart(v)}
                label={t("settings.autostart")}
              />
            </Row>
            <Row label={t("settings.onTop")} hint={t("settings.onTopHint")}>
              <Toggle
                checked={settings.onTop}
                onChange={(v) => set("onTop", v)}
                label={t("settings.onTop")}
              />
            </Row>
            <Row label={t("settings.size")} hint={t("settings.sizeHint")}>
              <Segmented
                value={settings.size}
                options={opts(
                  ["small", "medium", "large"] as const,
                  "settings.sizeOptions",
                )}
                onChange={(v) => set("size", v)}
              />
            </Row>
            <Row label={t("settings.language")}>
              <select
                value={settings.language}
                onChange={(e) =>
                  set(
                    "language",
                    sanitize("language", e.target.value) ?? "system",
                  )
                }
              >
                {(["system", "zh-CN", "zh-TW", "en"] as const).map((l) => (
                  <option key={l} value={l}>
                    {t(`settings.languageOptions.${l}`)}
                  </option>
                ))}
              </select>
            </Row>
            <Row
              label={t("settings.myZodiac")}
              hint={t("settings.myZodiacHint")}
            >
              <select
                value={settings.myZodiac}
                onChange={(e) =>
                  set(
                    "myZodiac",
                    sanitize("myZodiac", e.target.value) ?? "none",
                  )
                }
              >
                {MY_ZODIAC_OPTIONS.map((z) => (
                  <option key={z} value={z}>
                    {z === "none"
                      ? t("settings.myZodiacNone")
                      : term("zodiac", ZODIAC[z as Branch], lang)}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t("settings.expandOnLaunch")}>
              <Toggle
                checked={settings.expandOnLaunch}
                onChange={(v) => set("expandOnLaunch", v)}
                label={t("settings.expandOnLaunch")}
              />
            </Row>
            <Row label={t("settings.collapseOnBlur")}>
              <Toggle
                checked={settings.collapseOnBlur}
                onChange={(v) => set("collapseOnBlur", v)}
                label={t("settings.collapseOnBlur")}
              />
            </Row>
            <Row label={t("settings.autoUpdate")} hint={t("settings.autoUpdateHint")}>
              <Toggle checked={settings.autoUpdate} onChange={(v) => set("autoUpdate", v)} label={t("settings.autoUpdate")} />
            </Row>
            <Row label={t("settings.checkNow")} hint={updateMsg ?? undefined}>
              <button type="button" className="btn" disabled={checking} onClick={() => void checkNow()}>
                {checking ? t("settings.checking") : t("settings.checkNowButton")}
              </button>
            </Row>
          </>
        )}

        {page === "appearance" && (
          <>
            <div className="set-block">
              <div className="set-row__text">
                <div className="set-row__label">{t("settings.character")}</div>
                <div className="set-row__hint">
                  {t("settings.characterHint")}
                </div>
              </div>
              <CharacterPicker
                value={settings.character}
                rules={rules}
                lang={lang}
                onChange={(id) =>
                  set("character", sanitize("character", id) ?? "daoshi")
                }
              />
            </div>
            <p className="set-merit">
              {t("settings.meritTotal", { n: merit })}
            </p>
            <Row
              label={t("settings.displayFont")}
              hint={t("settings.displayFontHint")}
            >
              <Segmented
                value={settings.displayFont}
                options={opts(
                  ["A", "B"] as const,
                  "settings.displayFontOptions",
                )}
                onChange={(v) => set("displayFont", v)}
              />
            </Row>
            <Row label={t("settings.bannerFont")}>
              <Segmented
                value={settings.bannerFont}
                options={opts(
                  ["pixel", "brush"] as const,
                  "settings.bannerFontOptions",
                )}
                onChange={(v) => set("bannerFont", v)}
              />
            </Row>
            <Row
              label={t("settings.bannerText")}
              hint={t("settings.bannerTextHint")}
            >
              <TextField
                value={settings.bannerText}
                max={MAX_BANNER_CHARS}
                required
                ariaLabel={t("settings.bannerText")}
                onCommit={(v) => {
                  const clean = sanitize("bannerText", v);
                  if (clean) set("bannerText", clean);
                }}
              />
            </Row>
          </>
        )}

        {page === "rules" && (
          <>
            <Row
              label={t("settings.elementSource")}
              hint={t(`settings.elementSourceHints.${settings.elementSource}`)}
            >
              <Segmented
                value={settings.elementSource}
                options={opts(
                  ["branch", "nayin", "stem"] as const,
                  "settings.elementSourceOptions",
                )}
                onChange={(v) => set("elementSource", v)}
              />
            </Row>
            <Row
              label={t("settings.topPriority")}
              hint={t(`settings.topPriorityHints.${settings.topPriority}`)}
            >
              <Segmented
                value={settings.topPriority}
                options={opts(
                  ["xiang", "wang"] as const,
                  "settings.topPriorityOptions",
                )}
                onChange={(v) => set("topPriority", v)}
              />
            </Row>
            <Row
              label={t("settings.dayBoundary")}
              hint={t(`settings.dayBoundaryHints.${settings.dayBoundary}`)}
            >
              <Segmented
                value={settings.dayBoundary}
                options={opts(
                  ["midnight", "zi"] as const,
                  "settings.dayBoundaryOptions",
                )}
                onChange={(v) => set("dayBoundary", v)}
              />
            </Row>
          </>
        )}

        {page === "reminders" && (
          <>
            <Row
              label={t("settings.openingEnabled")}
              hint={t("settings.openingEnabledHint")}
            >
              <Toggle
                checked={settings.openingEnabled}
                onChange={(v) => set("openingEnabled", v)}
                label={t("settings.openingEnabled")}
              />
            </Row>
            <Row
              label={t("settings.effectsEnabled")}
              hint={t("settings.effectsEnabledHint")}
            >
              <Toggle
                checked={settings.effectsEnabled}
                onChange={(v) => set("effectsEnabled", v)}
                label={t("settings.effectsEnabled")}
              />
            </Row>
            <Row label={t("settings.bubbleSeconds")}>
              <Segmented
                value={settings.bubbleSeconds}
                options={([3, 5, 8] as const).map((n) => ({
                  value: n,
                  label: t("settings.seconds", { n }),
                }))}
                onChange={(v) => set("bubbleSeconds", v)}
              />
            </Row>
            <Row
              label={t("settings.muyuSound")}
              hint={t("settings.muyuSoundHint")}
            >
              <Toggle
                checked={settings.muyuSound}
                onChange={(v) => set("muyuSound", v)}
                label={t("settings.muyuSound")}
              />
            </Row>
            <Row
              label={t("settings.annivNotify")}
              hint={t("settings.annivNotifyHint")}
            >
              <Toggle
                checked={settings.annivNotify}
                onChange={(v) => set("annivNotify", v)}
                label={t("settings.annivNotify")}
              />
            </Row>
            {settings.annivNotify && (
              <Row label={t("settings.annivNotifyDays")}>
                <Segmented
                  value={settings.annivNotifyDays}
                  options={opts(
                    [0, 1, 3, 7] as const,
                    "settings.annivNotifyDaysOptions",
                  )}
                  onChange={(v) => set("annivNotifyDays", v)}
                />
              </Row>
            )}
            <Row
              label={t("settings.annivData")}
              hint={dataMsg ?? t("settings.annivDataHint")}
            >
              <div className="set-row__buttons">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void exportAnniversaries()}
                >
                  {t("settings.export")}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void importAnniversaries()}
                >
                  {t("settings.import")}
                </button>
              </div>
            </Row>
          </>
        )}
      </section>

      <footer className="settings__foot">
        <button
          type="button"
          className="text-btn"
          onClick={() => void restore()}
        >
          {t("settings.restoreDefaults")}
        </button>
      </footer>
    </main>
  );
}
