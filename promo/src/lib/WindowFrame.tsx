/** 一个朴素的应用窗口外框：标题栏（灰色圆点 + 标题）+ 宣纸底的内容区。不模仿任何系统的品牌样式 */
import type { CSSProperties, ReactNode } from "react";

export function WindowFrame({ title, width, height, zoom = 1, children, style }: { title: string; width: number; height: number; zoom?: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="promo-window"
      style={{
        position: "absolute",
        width,
        height,
        zoom,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 18px 50px rgba(42,36,32,0.28), 0 0 0 1px rgba(42,36,32,0.18)",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper)",
        ...style,
      }}
    >
      <div style={{ height: 30, flex: "none", display: "flex", alignItems: "center", gap: 7, padding: "0 12px", background: "#f7f2e7", borderBottom: "1px solid rgba(42,36,32,0.12)", font: "13px 'WX WenKai'", color: "#4a423b" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: 6, background: "rgba(42,36,32,0.22)" }} />
        ))}
        <span style={{ flex: 1, textAlign: "center", marginRight: 50 }}>{title}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>
    </div>
  );
}
