/**
 * 代码画的桌面：柔和的渐变天空 + 远山（几层半透明的山形），一条极简的顶部菜单栏。
 * 不用任何系统壁纸、苹果标志或品牌标志。
 */
import type { ReactNode } from "react";
import { clockText, MENU_TITLE } from "./text";
import { DAY } from "./data";

export function Desktop({ children, clock = clockText(DAY) }: { children?: ReactNode; clock?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg, #e9e1d0 0%, #efe6d6 45%, #dfe3dc 100%)" }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3c9a3" stopOpacity="0.9" />
            <stop offset="1" stopColor="#f3c9a3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="1480" cy="300" r="120" fill="url(#sun)" />
        <path d="M0 720 C 220 600, 360 640, 520 560 S 860 600, 1040 520 S 1380 600, 1600 540 S 1840 600, 1920 580 L1920 1080 L0 1080 Z" fill="#b9c2bb" opacity="0.45" />
        <path d="M0 800 C 180 720, 380 760, 600 690 S 980 760, 1200 700 S 1600 780, 1920 720 L1920 1080 L0 1080 Z" fill="#8fa29b" opacity="0.4" />
        <path d="M0 900 C 260 840, 520 880, 760 830 S 1240 890, 1480 850 S 1800 880, 1920 860 L1920 1080 L0 1080 Z" fill="#6f8580" opacity="0.35" />
      </svg>
      {/* 极简菜单栏：左边一个圆点，右边时间；没有任何品牌标志 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 34,
          background: "rgba(250, 247, 240, 0.72)",
          borderBottom: "1px solid rgba(42,36,32,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          font: "15px 'Promo Kai'",
          color: "#4a423b",
        }}
      >
        <span style={{ display: "flex", gap: 22, alignItems: "center" }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: "#4a423b", opacity: 0.55 }} />
          <span>{MENU_TITLE}</span>
        </span>
        <span>{clock}</span>
      </div>
      {children}
    </div>
  );
}
