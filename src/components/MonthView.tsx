import { useMemo, useState } from "react";
import { getMonthGrid } from "../calendar/day";
import { sameYmd, type Ymd } from "../core/dayBoundary";

interface Props {
  today: Ymd;
  onPick: (ymd: Ymd) => void;
}

const WEEK_HEAD = ["日", "一", "二", "三", "四", "五", "六"];
const MIN_YEAR = 1901;
const MAX_YEAR = 2099;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function MonthView({ today, onPick }: Props) {
  const [view, setView] = useState({ year: today.year, month: today.month });
  const grid = useMemo(() => getMonthGrid(view.year, view.month), [view]);

  const shift = (delta: number) => {
    setView(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1);
      const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, d.getFullYear()));
      return { year: y, month: y === d.getFullYear() ? d.getMonth() + 1 : month };
    });
  };
  const isCurrentMonth = view.year === today.year && view.month === today.month;

  return (
    <section className="card paper month">
      <header className="month__bar">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="上个月">
          ‹
        </button>
        <select
          value={view.year}
          onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
          aria-label="年份"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
        <select
          value={view.month}
          onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
          aria-label="月份"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}月
            </option>
          ))}
        </select>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="下个月">
          ›
        </button>
        <button
          type="button"
          className="text-btn month__today"
          disabled={isCurrentMonth}
          onClick={() => setView({ year: today.year, month: today.month })}
        >
          回到今天
        </button>
      </header>

      <div className="month__grid">
        {WEEK_HEAD.map((w, i) => (
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
          ].join(" ");
          return (
            <button
              type="button"
              key={`${info.ymd.month}-${info.ymd.day}`}
              className={classes}
              onClick={() => onPick(info.ymd)}
              title={`${info.ymd.year}年${info.ymd.month}月${info.ymd.day}日 ${info.lunar.text}`}
            >
              <span className="month__solar">{info.ymd.day}</span>
              <span className={`month__sub kind-${info.cell.kind}`}>{info.cell.text}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
