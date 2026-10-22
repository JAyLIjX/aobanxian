import type { DayInfo } from "../calendar/day";
import { useDragOrClick } from "../hooks/useDragOrClick";

interface Props {
  info: DayInfo;
  open: boolean;
  onToggle: () => void;
}

/** 黄历签：朱砂色小纸签，写今天的公历日和农历日。点击展开 / 收起卡片，按住可拖动窗口 */
export function HuangliSlip({ info, open, onToggle }: Props) {
  const gesture = useDragOrClick(onToggle);
  return (
    <div
      className={`slip ${open ? "slip--open" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={`${info.ymd.month}月${info.ymd.day}日 ${info.lunar.text}，${open ? "收起" : "展开"}日历`}
      title={open ? "收起日历" : "展开日历"}
      {...gesture}
    >
      <span className="slip__day">{info.ymd.day}</span>
      <span className="slip__sep">/</span>
      <span className="slip__lunar">{info.lunar.monthName + info.lunar.dayName}</span>
    </div>
  );
}
