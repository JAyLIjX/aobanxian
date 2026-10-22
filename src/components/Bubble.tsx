import type { CSSProperties } from "react";

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
}

/** 像素风对话气泡：宣纸底、墨色边、一个小尾巴 */
export function Bubble({ text, x, y, side, maxWidth, small }: Props) {
  const style = { left: x, top: y, maxWidth } as CSSProperties;
  return (
    <div className={`bubble bubble--${side} ${small ? "bubble--small" : ""}`} style={style} role="status">
      {text}
    </div>
  );
}
