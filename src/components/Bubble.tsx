import type { CSSProperties, Ref } from "react";

interface Props {
  text: string;
  /** 尾巴尖指向的点（窗口内坐标） */
  x: number;
  y: number;
  /**
   * above-left：气泡在这个点的左上方（头顶的开场白，向左长，不挡幡）
   * right：气泡在这个点的右边（幡旁边的翻译小气泡）
   */
  side: "above-left" | "right";
  maxWidth: number;
  small?: boolean;
  /** 可以点（如「有新版了」）：气泡接收鼠标，主窗口把它的范围加进点穿区域 */
  onClick?: () => void;
  ref?: Ref<HTMLDivElement>;
}

/** 像素风对话气泡：宣纸底、墨色边、一个小尾巴 */
export function Bubble({ text, x, y, side, maxWidth, small, onClick, ref }: Props) {
  const style = { left: x, top: y, maxWidth } as CSSProperties;
  return (
    <div
      ref={ref}
      className={`bubble bubble--${side} ${small ? "bubble--small" : ""} ${onClick ? "bubble--clickable" : ""}`}
      style={style}
      role={onClick ? "button" : "status"}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onPointerDown={onClick ? (e) => e.stopPropagation() : undefined}
    >
      {text}
    </div>
  );
}
