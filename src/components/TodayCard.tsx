import type { KeyboardEvent, MouseEvent } from "react";
import type { DayDetail } from "../calendar/day";
import { ColorChip } from "./ColorChip";

interface Props {
  detail: DayDetail;
  monthOpen: boolean;
  onOpenDetail: () => void;
  onToggleMonth: () => void;
}

/** 今日卡片：点卡片主体看当天详情，点「月历」展开月历 */
export function TodayCard({ detail, monthOpen, onOpenDetail, onToggleMonth }: Props) {
  const { ymd, ganzhi, outfit } = detail;
  const marks = [detail.jieqi, ...detail.festivals].filter((x): x is string => !!x);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpenDetail();
    }
  };
  const toggleMonth = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleMonth();
  };

  return (
    <section
      className="card paper today"
      role="button"
      tabIndex={0}
      aria-label="查看今日详情"
      onClick={onOpenDetail}
      onKeyDown={onKeyDown}
    >
      <div className="today__head">
        <span>
          {ymd.year}年{ymd.month}月
        </span>
        <span>{detail.weekday}</span>
      </div>

      <div className="today__main">
        <div className="today__day display">{ymd.day}</div>
        <div className="today__lunar">
          <div className="today__lunar-date display">{detail.lunar.text}</div>
          <div className="today__ganzhi">
            {ganzhi.year}年 {ganzhi.month}月 {ganzhi.day}日
          </div>
          {marks.length > 0 && (
            <div className="today__marks">
              {marks.map((m) => (
                <span key={m} className="mark">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="today__outfit">
        今日{outfit.day.label}　穿
        <ColorChip color={outfit.primary} />
        配
        <ColorChip color={outfit.accent} />
      </div>
      {detail.tip && <div className="today__tip">{detail.tip}</div>}

      <div className="today__foot">
        <span className="today__hint">点此看今日详情</span>
        <button type="button" className="text-btn" onClick={toggleMonth} aria-expanded={monthOpen}>
          {monthOpen ? "收起月历" : "月历"}
        </button>
      </div>
    </section>
  );
}
