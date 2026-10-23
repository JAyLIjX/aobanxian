/**
 * 挂轴：和 src/components/Scroll.tsx 一样的结构和样式（上下木轴、中间宣纸），展开动作由帧号驱动：
 * 木轴先从幡的宽度横向拉宽，再拉开纸面（时长同软件：150ms + 200ms）。
 */
import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FPS } from "./timing";

export function ScrollFrame({ openAt, fromScale = 0.25, cell, children, style }: { openAt: number; fromScale?: number; cell: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const widenEnd = openAt + Math.round(0.15 * FPS);
  const unrollEnd = widenEnd + Math.round(0.2 * FPS);
  if (frame < openAt) return null;
  const sx = interpolate(frame, [openAt, widenEnd], [fromScale, 1], { extrapolateRight: "clamp" });
  const reveal = interpolate(frame, [widenEnd, unrollEnd], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div className="scroll scroll--down" style={{ "--cell": `${cell}px`, ...style } as CSSProperties}>
      <div className="scroll__rod-wrap">
        <div className="scroll__rod" style={{ transform: `scaleX(${sx})` }} />
      </div>
      <div className="scroll__paper paper" style={{ clipPath: `inset(0 0 ${reveal}% 0)` }}>
        {children}
      </div>
      <div className="scroll__rod-wrap" style={{ transform: `translateY(${-(reveal / 100) * 0}px)` }}>
        <div className="scroll__rod" style={{ transform: `scaleX(${sx})` }} />
      </div>
    </div>
  );
}
