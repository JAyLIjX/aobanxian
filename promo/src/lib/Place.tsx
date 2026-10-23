/** 把内容放在画面的 (x, y)，内容按 zoom 放大（CSS zoom 让文字清晰重排；位置不受 zoom 影响） */
import type { CSSProperties, ReactNode } from "react";

export function Place({ x, y, zoom = 1, children, style }: { x: number; y: number; zoom?: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ zoom, ...style }}>{children}</div>
    </div>
  );
}
