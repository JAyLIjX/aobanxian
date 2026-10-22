import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getDayDetail } from "./calendar/day";
import { DetailPanel } from "./components/DetailPanel";
import { HuangliSlip } from "./components/HuangliSlip";
import { MonthView } from "./components/MonthView";
import { TodayCard } from "./components/TodayCard";
import { displayFont } from "./config/appearance";
import type { Ymd } from "./core/dayBoundary";
import { defaultRules } from "./core/rules";
import { Figure } from "./figure";
import { useDragOrClick } from "./hooks/useDragOrClick";
import { useToday } from "./hooks/useToday";
import { focusWindow, resizeWindow } from "./platform/window";
import "./fonts.css";
import "./App.css";

/**
 * 窗口大小 = 内容实际大小 + 四周留白（逻辑像素），透明区域尽量小，少挡桌面。
 * 小人和黄历签固定在左上，展开时窗口只向右、向下长，小人在屏幕上的位置不会跳。
 */
const PAD = { x: 20, y: 18 };
/** 打开详情时窗口至少这么高 */
const DETAIL_HEIGHT = 612;

/** 窗口失去焦点（点了桌面或别的窗口）后稍等再收起，避开原生下拉框等短暂失焦 */
const BLUR_COLLAPSE_DELAY = 150;

document.documentElement.dataset.displayFont = displayFont;

export default function App() {
  const rules = defaultRules;
  const today = useToday(rules.dayBoundary);
  const todayDetail = useMemo(() => getDayDetail(today, rules), [today, rules]);

  const [cardOpen, setCardOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [detailDay, setDetailDay] = useState<Ymd | null>(null);
  const [bounce, setBounce] = useState(0);

  const collapseAll = useCallback(() => {
    setDetailDay(null);
    setMonthOpen(false);
    setCardOpen(false);
  }, []);
  const closeDetail = useCallback(() => setDetailDay(null), []);

  const toggleCard = useCallback(() => {
    if (cardOpen) collapseAll();
    else setCardOpen(true);
  }, [cardOpen, collapseAll]);

  const figureGesture = useDragOrClick(useCallback(() => setBounce((n) => n + 1), []));

  // 窗口大小跟着内容走：卡片、月历展开或字体加载完，内容尺寸一变就调整窗口
  const contentRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setContent({ width: Math.ceil(el.offsetWidth), height: Math.ceil(el.offsetHeight) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const hasDetail = detailDay !== null;
  useEffect(() => {
    if (content.width === 0) return;
    const height = content.height + PAD.y;
    resizeWindow(content.width + PAD.x, hasDetail ? Math.max(height, DETAIL_HEIGHT) : height);
  }, [content, hasDetail]);

  // Esc 逐层收起：详情 → 月历 → 卡片
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailDay) setDetailDay(null);
      else if (monthOpen) setMonthOpen(false);
      else setCardOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailDay, monthOpen]);

  // 点桌面或其他窗口时全部收起
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onBlur = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!document.hasFocus()) collapseAll();
      }, BLUR_COLLAPSE_DELAY);
    };
    window.addEventListener("blur", onBlur);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("blur", onBlur);
    };
  }, [collapseAll]);

  const { primary, accent } = todayDetail.outfit;

  return (
    <main className="app" onPointerDownCapture={focusWindow}>
      <div className="content" ref={contentRef}>
        <div className="stage">
          <div
            className="figure"
            role="button"
            tabIndex={0}
            aria-label={`小人：今日穿${primary.name}配${accent.name}`}
            title={`今日穿${primary.name}配${accent.name}`}
            {...figureGesture}
          >
            <Figure primary={primary.hex} accent={accent.hex} bounceSignal={bounce} />
          </div>

          <HuangliSlip info={todayDetail} open={cardOpen} onToggle={toggleCard} />

          {cardOpen && (
            <TodayCard
              detail={todayDetail}
              monthOpen={monthOpen}
              onOpenDetail={() => setDetailDay(today)}
              onToggleMonth={() => setMonthOpen((v) => !v)}
            />
          )}
        </div>

        {cardOpen && monthOpen && <MonthView today={today} onPick={setDetailDay} />}
      </div>

      {detailDay && <DetailPanel ymd={detailDay} rules={rules} onChange={setDetailDay} onClose={closeDetail} />}
    </main>
  );
}
