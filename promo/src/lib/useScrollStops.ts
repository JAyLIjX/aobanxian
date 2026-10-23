/**
 * 按帧滚动某个容器：stops 里每一项是「到第 frame 帧时，滚到第 i 个目标元素的顶部」，两个停点之间缓动过去。
 * 目标位置用 offsetTop 量（不受 CSS zoom 影响），在 useLayoutEffect 里设 scrollTop，渲染结果确定。
 */
import { useLayoutEffect, type RefObject } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

export function useScrollStops(ref: RefObject<HTMLElement | null>, container: string, targets: string[], stops: { frame: number; target: number }[], moveFrames = 10, offset = 8) {
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const root = ref.current;
    const box = root?.querySelector<HTMLElement>(container) ?? root;
    if (!box) return;
    const tops = targets.map((sel) => {
      const el = sel === ":top" ? null : box.querySelector<HTMLElement>(sel);
      if (!el) return 0;
      let y = 0;
      let n: HTMLElement | null = el;
      while (n && n !== box) {
        y += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
        if (n && !box.contains(n) && n !== box) break;
      }
      return Math.max(0, y - offset);
    });
    let y = tops[stops[0].target];
    for (let i = 1; i < stops.length; i++) {
      const s = stops[i];
      if (frame >= s.frame - moveFrames) {
        const p = interpolate(frame, [s.frame - moveFrames, s.frame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
        y = tops[stops[i - 1].target] + (tops[s.target] - tops[stops[i - 1].target]) * p;
      }
    }
    box.scrollTop = y;
  });
}
