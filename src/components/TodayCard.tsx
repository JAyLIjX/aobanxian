import type { DayDetail } from "../calendar/day";

interface Props {
  detail: DayDetail;
  monthOpen: boolean;
  onToggleMonth: () => void;
}

export function TodayCard({ detail, monthOpen, onToggleMonth }: Props) {
  const { ymd, ganzhi, outfit } = detail;
  const marks = [detail.jieqi, ...detail.festivals].filter((x): x is string => !!x);

  return (
    <section className="card today">
      <div className="today__head">
        <span>
          {ymd.year}年{ymd.month}月
        </span>
        <span>{detail.weekday}</span>
      </div>

      <div className="today__main">
        <div className="today__day">{ymd.day}</div>
        <div className="today__lunar">
          <div className="today__lunar-date">{detail.lunar.text}</div>
          <div className="today__ganzhi">
            {ganzhi.year}年 {ganzhi.month}月 {ganzhi.day}日
          </div>
          {marks.length > 0 && (
            <div className="today__marks">
              {marks.map((m) => (
                <span key={m} className="tag tag--mark">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="today__outfit">
        今日{outfit.day.label} · 穿
        <i className="dot" style={{ background: outfit.primary.hex }} />
        {outfit.primary.name}配
        <i className="dot" style={{ background: outfit.accent.hex }} />
        {outfit.accent.name}
      </div>
      {detail.tip && <div className="today__tip">{detail.tip}</div>}

      <button type="button" className="link-btn today__toggle" onClick={onToggleMonth}>
        {monthOpen ? "收起月历 ▴" : "月历 ▾"}
      </button>
    </section>
  );
}
