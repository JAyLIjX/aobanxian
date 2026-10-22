/**
 * 小人组件的统一接口。占位版和日后的正式形象都实现这个接口，
 * 换形象时只需要改 figure/index.ts 里导出的那一个组件。
 *
 * 小人只负责「画」：点击、拖动窗口由外层（App 里的 useDragOrClick）处理，
 * 外层每次想让小人跳一下，就把 bounceSignal 加一。
 */
export interface FigureProps {
  /** 上衣颜色（#RRGGBB） */
  primary: string;
  /** 围巾颜色（#RRGGBB） */
  accent: string;
  /** 每次变化（> 0）播放一次轻跳动画 */
  bounceSignal: number;
}
