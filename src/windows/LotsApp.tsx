import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { chineseNumber, LotPaper } from "../components/LotPaper";
import { effectiveDate, ymdKey } from "../core/dayBoundary";
import type { LotRecord } from "../core/lots";
import { getLot } from "../data/lots";
import type { Lang } from "../i18n";
import { fmtDate } from "../i18n/format";
import { requestSay } from "../platform/windows";
import { drawToday, loadBook } from "../settings/lotBook";
import { CYLINDER_H, CYLINDER_LABEL, CYLINDER_W, cylinderGrid, drawCylinderLabel, drawGrid, stickGrid } from "../sprite/lotCylinder";
import { useWindowSetup } from "./useWindowSetup";

type Stage = "loading" | "idle" | "shaking" | "drawn";
const CELL = 4;

const parseKey = (k: string) => {
  const [year, month, day] = k.split("-").map(Number);
  return { year, month, day };
};

/** 求签：摇签筒、掉出一根签、展开签纸；每天一签，签册按日期查看 */
export function LotsApp() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { settings, loaded } = useWindowSetup("lots.title");
  const today = effectiveDate(new Date(), settings.dayBoundary);
  const [stage, setStage] = useState<Stage>("loading");
  const [record, setRecord] = useState<LotRecord | null>(null);
  const [book, setBook] = useState<LotRecord[]>([]);
  const [tab, setTab] = useState<"today" | "book">("today");
  const [viewing, setViewing] = useState<LotRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cylRef = useRef<HTMLCanvasElement>(null);
  const stickRef = useRef<HTMLCanvasElement>(null);

  // 今天已经求过就直接显示那签
  useEffect(() => {
    if (!loaded) return;
    void loadBook().then((b) => {
      setBook(b);
      const mine = b.find((r) => r.date === ymdKey(today)) ?? null;
      setRecord(mine);
      setStage(mine ? "drawn" : "idle");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    const cyl = cylRef.current;
    if (cyl) {
      drawGrid(cyl, cylinderGrid(), CELL);
      // 小牌子上的「签」字用像素字画，等字体加载好
      const label = CYLINDER_LABEL[lang];
      void document.fonts.load('12px "WX FusionPixel12"', label).then(() => drawCylinderLabel(cyl, CELL, label));
    }
    if (stickRef.current) drawGrid(stickRef.current, stickGrid(), CELL);
  }, [stage, tab, lang]);

  const shake = async () => {
    if (stage === "shaking") return;
    if (stage === "drawn") {
      // 每天只能求一次
      setNotice(t("lots.already"));
      void requestSay("lots.already");
      return;
    }
    setStage("shaking");
    const { record: rec, book: b } = await drawToday(today);
    const cyl = cylRef.current;
    const stick = stickRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (cyl && stick && !reduce) {
      // 签筒左右摇晃（按格跳变），然后一根签跳出来、落到筒前
      await cyl.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-8deg)" },
          { transform: "rotate(8deg)" },
          { transform: "rotate(-8deg)" },
          { transform: "rotate(8deg)" },
          { transform: "rotate(-5deg)" },
          { transform: "rotate(5deg)" },
          { transform: "rotate(0deg)" },
        ],
        { duration: 1100, easing: "steps(16, end)" },
      ).finished;
      stick.style.visibility = "visible";
      await stick.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)" },
          { transform: "translate(0, -48px) rotate(-10deg)", offset: 0.35 },
          { transform: "translate(36px, 96px) rotate(80deg)" },
        ],
        { duration: 700, easing: "steps(10, end)", fill: "forwards" },
      ).finished;
      await new Promise((r) => setTimeout(r, 350));
    }
    setRecord(rec);
    setBook(b);
    setStage("drawn");
  };

  const shown = viewing ?? record;

  return (
    <main className="tool paper lots">
      <nav className="settings__tabs" role="tablist">
        {(["today", "book"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? "is-on" : ""}
            onClick={() => {
              setTab(k);
              setViewing(null);
            }}
          >
            {t(k === "today" ? "lots.today" : "lots.book")}
          </button>
        ))}
      </nav>

      {tab === "today" && (
        <div className="tool__body lots__body">
          {stage !== "drawn" && (
            <div className="lots__stage">
              <p className="tool__summary">{t("lots.hint")}</p>
              <button
                type="button"
                className="lots__cylinder"
                aria-label={t("lots.shake")}
                onClick={() => void shake()}
                style={{ width: CYLINDER_W * CELL, height: CYLINDER_H * CELL }}
              >
                <canvas ref={stickRef} className="lots__stick" />
                <canvas ref={cylRef} />
              </button>
              <button type="button" className="btn" disabled={stage !== "idle"} onClick={() => void shake()}>
                {stage === "shaking" ? t("lots.shaking") : t("lots.shake")}
              </button>
            </div>
          )}
          {stage === "drawn" && record && (
            <>
              <LotPaper lot={getLot(record.n)} date={fmtDate(today, lang, t)} />
              <div className="lots__again">
                {notice && <span className="lots__notice">{notice}</span>}
                <button type="button" className="text-btn" onClick={() => void shake()}>
                  {t("lots.again")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "book" && (
        <div className="tool__body lots__body">
          {viewing && shown ? (
            <>
              <button type="button" className="text-btn" onClick={() => setViewing(null)}>
                ‹ {t("lots.backToBook")}
              </button>
              <LotPaper lot={getLot(shown.n)} date={fmtDate(parseKey(shown.date), lang, t)} />
            </>
          ) : book.length === 0 ? (
            <p className="tool__summary">{t("lots.bookEmpty")}</p>
          ) : (
            <ol className="zeri__list lots__book">
              {book.map((r) => {
                const lot = getLot(r.n);
                return (
                  <li key={r.date}>
                    <button type="button" className="zeri__day" onClick={() => setViewing(r)}>
                      <span className="zeri__date">
                        <b>{fmtDate(parseKey(r.date), lang, t)}</b>{" "}
                        <span className="tag tag--red">{lot.grade}</span>
                      </span>
                      <span className="zeri__meta" lang="zh-Hant">
                        {t("lots.number", { n: lang === "en" ? lot.n : chineseNumber(lot.n) })}　{lot.poem[0]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </main>
  );
}
