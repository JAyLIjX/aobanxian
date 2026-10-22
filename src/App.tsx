import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { getDayDetail } from "./calendar/day";
import { DetailPanel } from "./components/DetailPanel";
import { MonthView } from "./components/MonthView";
import { TodayCard } from "./components/TodayCard";
import type { Ymd } from "./core/dayBoundary";
import { defaultRules } from "./core/rules";
import { Figure } from "./figure";
import { useToday } from "./hooks/useToday";
import { resizeWindow, startWindowDrag } from "./platform/window";
import "./App.css";

/** 窗口尺寸（逻辑像素）：收起时只放今日卡片和小人，展开月历或打开详情时变高 */
const WIDTH = 420;
const COMPACT_HEIGHT = 210;
const EXPANDED_HEIGHT = 600;

/** 按住空白处拖动窗口；按钮、下拉框和标了 data-no-drag 的区域除外 */
function handleDragStart(e: MouseEvent) {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  if (target.closest("button, select, input, a, [data-no-drag]")) return;
  startWindowDrag();
}

export default function App() {
  const rules = defaultRules;
  const today = useToday(rules.dayBoundary);
  const todayDetail = useMemo(() => getDayDetail(today, rules), [today, rules]);

  const [monthOpen, setMonthOpen] = useState(false);
  const [detailDay, setDetailDay] = useState<Ymd | null>(null);
  const closeDetail = useCallback(() => setDetailDay(null), []);

  const expanded = monthOpen || detailDay !== null;
  useEffect(() => {
    resizeWindow(WIDTH, expanded ? EXPANDED_HEIGHT : COMPACT_HEIGHT);
  }, [expanded]);

  const { primary, accent } = todayDetail.outfit;

  return (
    <main className="app" onMouseDown={handleDragStart}>
      <div className="app__top">
        <TodayCard detail={todayDetail} monthOpen={monthOpen} onToggleMonth={() => setMonthOpen((v) => !v)} />
        <Figure
          primary={primary.hex}
          accent={accent.hex}
          title={`今日穿${primary.name}配${accent.name}，点我看详情`}
          onClick={() => setDetailDay(today)}
        />
      </div>

      {monthOpen && <MonthView today={today} onPick={setDetailDay} />}

      {detailDay && <DetailPanel ymd={detailDay} rules={rules} onChange={setDetailDay} onClose={closeDetail} />}
    </main>
  );
}
