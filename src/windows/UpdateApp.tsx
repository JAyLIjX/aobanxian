import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { checkForUpdate, installUpdate, type UpdateInfo } from "../platform/updater";
import { inTauri } from "../platform/window";
import { useWindowSetup } from "./useWindowSetup";
import { displayClass } from "../i18n/displayFont";

type Stage = "checking" | "available" | "none" | "installing" | "error";

/** 更新窗口（?view=update）：新版本号、更新说明，「现在更新」「稍后」 */
export function UpdateApp() {
  const { t } = useTranslation();
  useWindowSetup("update.title");
  const [stage, setStage] = useState<Stage>("checking");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [current, setCurrent] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (inTauri) void getVersion().then(setCurrent);
    checkForUpdate()
      .then((u) => {
        setInfo(u);
        setStage(u ? "available" : "none");
      })
      .catch(() => setStage("error"));
  }, []);

  const later = () => {
    if (inTauri) void getCurrentWindow().close();
    else window.close();
  };
  const install = async () => {
    setStage("installing");
    try {
      await installUpdate(setProgress);
    } catch {
      setStage("error");
    }
  };

  return (
    <main className="tool paper update">
      <div className="tool__body">
        {stage === "checking" && <p className="tool__summary">{t("update.checking")}</p>}
        {stage === "none" && <p className="tool__summary">{t("update.upToDate", { version: current })}</p>}
        {stage === "error" && <p className="tool__summary">{t("update.failed")}</p>}
        {info && (stage === "available" || stage === "installing") && (
          <>
            <h2 className={`update__title ${displayClass(t("update.newVersion", { version: info.version }))}`}>{t("update.newVersion", { version: info.version })}</h2>
            <p className="muted">{t("update.current", { version: info.currentVersion })}</p>
            {info.notes && (
              <section className="update__notes">
                <h3>{t("update.notes")}</h3>
                <pre>{info.notes}</pre>
              </section>
            )}
          </>
        )}
        {stage === "installing" && (
          <p className="update__progress">
            {t("update.installing")}
            {progress !== null && ` ${Math.round(progress * 100)}%`}
          </p>
        )}
      </div>
      <footer className="update__actions">
        {stage === "available" ? (
          <>
            <button type="button" className="text-btn" onClick={later}>
              {t("update.later")}
            </button>
            <button type="button" className="btn" onClick={() => void install()}>
              {t("update.now")}
            </button>
          </>
        ) : (
          stage !== "installing" && (
            <button type="button" className="btn" onClick={later}>
              {t("update.close")}
            </button>
          )
        )}
      </footer>
    </main>
  );
}
