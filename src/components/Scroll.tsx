import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** 展开分两段：木轴先横向拉宽，再上下拉开纸面 */
const WIDEN_MS = 150;
const UNROLL_MS = 200;

interface Props {
  /** 卷轴左上角（窗口内坐标）；为 null 时还在测量尺寸，先不显示 */
  x: number | null;
  y: number | null;
  direction: "down" | "up";
  /** 展开起点：幡的宽度和幡中心相对卷轴左边的位置 */
  fromWidth: number;
  fromCenterX: number;
  /** 一格多少像素（木轴高度按格算） */
  cell: number;
  closing: boolean;
  onClosed: () => void;
  onResize: (w: number, h: number) => void;
  children: ReactNode;
}

/** 挂轴：上下各一根木轴，中间宣纸。从幡的位置展开、卷回 */
export function Scroll({ x, y, direction, fromWidth, fromCenterX, cell, closing, onClosed, onResize, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const topWrap = useRef<HTMLDivElement>(null);
  const bottomWrap = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  // 报告自己的尺寸（内容变化，比如展开月历时，卷轴变长）
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => onResize(el.offsetWidth, el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [onResize]);

  const play = (reverse: boolean) => {
    const el = root.current;
    if (!el || !top.current || !paper.current || !bottom.current || !topWrap.current || !bottomWrap.current) return null;
    const w = el.offsetWidth;
    const paperH = paper.current.offsetHeight;
    const s = Math.min(1, fromWidth / w);
    const origin = `${fromCenterX}px 50%`;
    const widen = [{ transform: `scaleX(${s})` }, { transform: "scaleX(1)" }];
    const down = direction === "down";
    const clipFrom = down ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)";
    const travel = [{ transform: `translateY(${down ? -paperH : paperH}px)` }, { transform: "translateY(0)" }];
    const opts = (delay: number, duration: number): KeyframeAnimationOptions => ({
      duration,
      delay: reverse ? (delay === 0 ? UNROLL_MS : 0) : delay,
      fill: "both",
      easing: "ease-out",
      direction: reverse ? "reverse" : "normal",
    });
    for (const rod of [top.current, bottom.current]) {
      rod.style.transformOrigin = origin;
    }
    // 向下展开时下木轴往下走，向上展开时上木轴往上走
    const movingRod = down ? bottomWrap.current : topWrap.current;
    return [
      top.current.animate(widen, opts(0, WIDEN_MS)),
      bottom.current.animate(widen, opts(0, WIDEN_MS)),
      movingRod.animate(travel, opts(WIDEN_MS, UNROLL_MS)),
      paper.current.animate([{ clipPath: clipFrom }, { clipPath: "inset(0 0 0 0)" }], opts(WIDEN_MS, UNROLL_MS)),
    ];
  };

  // 有了位置就播放展开
  useEffect(() => {
    if (x === null || opened.current) return;
    opened.current = true;
    play(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x]);

  useEffect(() => {
    if (!closing) return;
    const anims = play(true);
    if (!anims) return onClosed();
    let done = false;
    Promise.all(anims.map((a) => a.finished)).then(() => {
      if (!done) onClosed();
    });
    return () => {
      done = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  const style = {
    left: x ?? 0,
    top: y ?? 0,
    visibility: x === null ? "hidden" : "visible",
    "--cell": `${cell}px`,
  } as CSSProperties;

  return (
    <div ref={root} className={`scroll scroll--${direction}`} style={style}>
      <div ref={topWrap} className="scroll__rod-wrap">
        <div ref={top} className="scroll__rod" />
      </div>
      <div ref={paper} className="scroll__paper paper">
        {children}
      </div>
      <div ref={bottomWrap} className="scroll__rod-wrap">
        <div ref={bottom} className="scroll__rod" />
      </div>
    </div>
  );
}
