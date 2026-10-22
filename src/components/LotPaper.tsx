import { useTranslation } from "react-i18next";
import type { Lot } from "../data/lots";
import { LOT_ASPECTS, LOT_SOURCE } from "../data/lots";
import type { Lang } from "../i18n";

const CN_NUM = "〇一二三四五六七八九";
/** 1–100 → 一 … 一百 */
export function chineseNumber(n: number): string {
  if (n === 100) return "一百";
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (tens === 0) return CN_NUM[ones];
  return `${tens === 1 ? "" : CN_NUM[tens]}十${ones ? CN_NUM[ones] : ""}`;
}

/** 签纸：签号、签等、签诗（竖排原文）、白话总解、分事项、典故故事 */
export function LotPaper({ lot, date }: { lot: Lot; date?: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const number = lang === "en" ? t("lots.number", { n: lot.n }) : t("lots.number", { n: chineseNumber(lot.n) });
  return (
    <article className="lot-paper">
      <header className="lot-paper__head">
        <div>
          <div className="lot-paper__number display">{number}</div>
          {date && <div className="lot-paper__date muted">{date}</div>}
        </div>
        <div className={`lot-paper__grade grade-${lot.grade.length === 2 ? lot.grade === "上上" ? "best" : "worst" : lot.grade === "上" ? "good" : lot.grade === "中" ? "mid" : "low"}`}>
          <span className="lot-paper__seal">{lot.grade}</span>
          {lang === "en" && <span className="lot-paper__grade-en">{t(`lots.gradeEn.${lot.grade}`)}</span>}
        </div>
      </header>
      <div className="lot-paper__poem" lang="zh-Hant">
        {lot.poem.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="lot-paper__meta muted">{t("lots.originalGrade", { grade: lot.gradeRaw })}</p>
      <section className="lot-paper__reading">
        <h3>{t("lots.reading")}</h3>
        <p>{lot.reading[lang]}</p>
      </section>
      <section className="lot-paper__reading">
        <h3>{t("lots.aspectsTitle")}</h3>
        <dl className="lot-paper__aspects">
          {LOT_ASPECTS.map((k) => (
            <div key={k}>
              <dt>{t(`lots.aspects.${k}`)}</dt>
              <dd>{lot.aspects[k][lang]}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="lot-paper__reading">
        <h3>
          {t("lots.taleTitle")}
          <span className="lot-paper__tale-title" lang="zh-Hant">
            {lot.story}
          </span>
        </h3>
        <p>{lot.tale[lang]}</p>
      </section>
      <footer className="lot-paper__source muted">
        {t("lots.source", { title: LOT_SOURCE.title, edition: LOT_SOURCE.edition })}
      </footer>
    </article>
  );
}
