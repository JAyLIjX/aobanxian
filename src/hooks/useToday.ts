import { useEffect, useState } from "react";
import { effectiveDate, sameYmd, type Ymd } from "../core/dayBoundary";
import type { DayBoundary } from "../core/rules";

/** 定时轮询的间隔。睡眠唤醒后计时器恢复运行，最多这么久就会发现日期变了 */
const POLL_MS = 15_000;

/** 距离下一次换日还有多少毫秒（多留 1 秒余量） */
function msUntilNextBoundary(now: Date, boundary: DayBoundary): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), boundary === "zi" ? 23 : 24);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime() + 1000;
}

/**
 * 当前「历日」。午夜（或子时）自动切到新的一天；
 * 电脑睡眠唤醒、窗口重新可见或获得焦点时也会立即重新判断。
 */
export function useToday(boundary: DayBoundary): Ymd {
  const [today, setToday] = useState(() => effectiveDate(new Date(), boundary));

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      const now = new Date();
      const next = effectiveDate(now, boundary);
      setToday((prev) => (sameYmd(prev, next) ? prev : next));
      // 精确对准换日时刻；睡眠会让它延迟，所以另有轮询兜底
      clearTimeout(timeout);
      timeout = setTimeout(check, msUntilNextBoundary(now, boundary));
    };

    check();
    const interval = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [boundary]);

  return today;
}
