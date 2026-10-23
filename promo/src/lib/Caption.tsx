/**
 * 每一段的字幕：大标题（马善政毛笔楷书，朱砂色）、一句说明（霞鹜文楷，墨色）、一行英文小字；
 * 宣纸色半透明底，固定在画面左侧（side="left"）或底部（side="bottom"），不挡演示内容。
 */
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export function Caption({ title, desc, en, side = "left", top = 150, left = 70, width = 520 }: { title: string; desc: string; en: string; side?: "left" | "bottom"; top?: number; left?: number; width?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const slide = interpolate(frame, [0, 10], [-24, 0], { extrapolateRight: "clamp" });
  const box: React.CSSProperties =
    side === "left"
      ? { left, top, width }
      : { left: "50%", bottom: 54, width: 1200, transform: `translateX(-50%) translateY(${-slide}px)`, textAlign: "center" };
  return (
    <div
      style={{
        position: "absolute",
        ...box,
        ...(side === "left" ? { transform: `translateX(${slide}px)` } : {}),
        opacity: Math.min(fadeIn, fadeOut),
        background: "rgba(244, 238, 223, 0.86)",
        border: "1px solid rgba(42,36,32,0.12)",
        boxShadow: "0 6px 24px rgba(42,36,32,0.12)",
        borderRadius: 6,
        padding: side === "left" ? "26px 34px 24px" : "18px 34px 16px",
        zIndex: 80,
      }}
    >
      <div style={{ font: `${side === "left" ? 76 : 64}px 'Promo Brush'`, color: "#b83a2c", lineHeight: 1.1 }}>{title}</div>
      <div style={{ font: `${side === "left" ? 34 : 32}px 'Promo Kai'`, color: "#2a2420", marginTop: 12, lineHeight: 1.4 }}>{desc}</div>
      <div style={{ font: "22px 'Promo Garamond'", color: "rgba(42,36,32,0.62)", marginTop: 8, lineHeight: 1.35 }}>{en}</div>
    </div>
  );
}
