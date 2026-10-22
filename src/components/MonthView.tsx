import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { daysWithAnniversary, type Anniversary } from "../calendar/anniversary";
import { getMonthGrid } from "../calendar/day";
import { sameYmd, type Ymd } from "../core/dayBoundary";
import type { Lang } from "../i18n";
import { cellText, fmtDate, lunarText, monthName } from "../i18n/format";

interface Props {
  today: Ymd;
  anniversaries: Anniversary[];
  onPick: (ymd: Ymd) => void;
}

const MIN_YEAR = 1901;
const MAX_YEAR = 2099;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function MonthView({ today, anniversaries, onPick }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const [view, setView] = useState({ year: today.year, month: today.month });
  const grid = useMemo(() => getMonthGrid(view.year, view.month), [view]);
  // 有纪念日的格子右上角一个小红点；前后月份露出来的格子也要算
  const marked = useMemo(() => {
    const keys = new Set<string>();
    for (const delta of [-1, 0, 1]) {
      const d = new Date(view.year, view.month - 1 + delta, 1);
      for (const k of daysWithAnniversary(anniversaries, d.getFullYear(), d.getMonth() + 1)) keys.add(k);
    }
    return keys;
  }, [view, anniversaries]);
  const weekHead = t("date.weekHead", { returnObjects: true }) as string[];

  const shift = (delta: number) => {
    setView(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1);
      const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, d.getFullYear()));
      return { year: y, month: y === d.getFullYear() ? d.getMonth() + 1 : month };
    });
  };
  const isCurrentMonth = view.year === today.year && view.month === today.month;

  return (
    <section className="month">
      <header className="month__bar">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label={t("month.prev")}>
          ‹
        </button>
        <select value={view.year} onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))} aria-label={t("month.yearLabel")}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {t("date.year", { year: y })}
            </option>
          ))}
        </select>
        <select value={view.month} onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))} aria-label={t("month.monthLabel")}>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {t("date.month", { month: m, monthName: monthName(m, lang) })}
            </option>
          ))}
        </select>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label={t("month.next")}>
          ›
        </button>
        <button
          type="button"
          className="text-btn month__today"
          disabled={isCurrentMonth}
          onClick={() => setView({ year: today.year, month: today.month })}
        >
          {t("month.backToday")}
        </button>
      </header>

      <div className="month__grid">
        {weekHead.map((w, i) => (
          <div key={w} className={`month__week ${i === 0 || i === 6 ? "is-weekend" : ""}`}>
            {w}
          </div>
        ))}
        {grid.map(({ info, inMonth }) => {
          const classes = [
            "month__cell",
            inMonth ? "" : "is-other",
            info.weekIndex === 0 || info.weekIndex === 6 ? "is-weekend" : "",
            sameYmd(info.ymd, today) ? "is-today" : "",
            marked.has(`${info.ymd.year}-${info.ymd.month}-${info.ymd.day}`) ? "has-anniv" : "",
          ].join(" ");
          return (
            <button
              type="button"
              key={`${info.ymd.month}-${info.ymd.day}`}
              className={classes}
              onClick={() => onPick(info.ymd)}
              title={`${fmtDate(info.ymd, lang, t)} ${lunarText(info, lang, t)}`}
            >
              <span className="month__solar">{info.ymd.day}</span>
              <span className={`month__sub kind-${info.cell.kind}`}>{cellText(info, lang)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
