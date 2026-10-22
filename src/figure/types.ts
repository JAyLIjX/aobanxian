/**
 * 小人组件的统一接口。占位版和日后的正式形象都实现这个接口，
 * 换形象时只需要改 figure/index.ts 里导出的那一个组件。
 */
export interface FigureProps {
  /** 上衣颜色（#RRGGBB） */
  primary: string;
  /** 围巾颜色（#RRGGBB） */
  accent: string;
  /** 悬停提示，如「今日穿红配绿」 */
  title?: string;
  onClick?: () => void;
}
