/**
 * 推镜头：把画面里某个元素（CSS 选择器，多个就取外接框）推近、平移到目标区域里，停一会再拉回。
 * 只包演示内容，字幕框在外面，不跟着缩放。目标位置每帧从真实 DOM 量（滚动之后），渲染结果确定。
 *
 * keys：按时间排的镜头状态。target 为空 = 全景；到第 frame 帧时到位，从上一个状态过渡用 move 帧（缓入缓出）。
 * dest：放大后内容要落在画面上的区域（避开字幕框），scale 不填就按目标自动放到能放下的最大倍数（不超过 maxScale）。
 */
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

export type Rect = [number, number, number, number];
export interface CameraKey {
  frame: number;
  target?: string | null;
  dest?: Rect;
  scale?: number;
  /** 目标框四周留白（画面像素） */
  pad?: number;
}

const FULL = { s: 1, tx: 0, ty: 0 };

export function Camera({ keys, move = 12, maxScale = 3, defaultDest = [640, 50, 1250, 980], children }: { keys: CameraKey[]; move?: number; maxScale?: number; defaultDest?: Rect; children: ReactNode }) {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "none";
    const base = el.getBoundingClientRect();
    const solve = (k: CameraKey) => {
      if (!k.target) return FULL;
      const nodes = [...el.querySelectorAll<HTMLElement>(k.target)];
      if (nodes.length === 0) return FULL;
      const rs = nodes.map((n) => n.getBoundingClientRect());
      const pad = k.pad ?? 16;
      const x0 = Math.min(...rs.map((r) => r.left)) - base.left - pad;
      const y0 = Math.min(...rs.map((r) => r.top)) - base.top - pad;
      const x1 = Math.max(...rs.map((r) => r.right)) - base.left + pad;
      const y1 = Math.max(...rs.map((r) => r.bottom)) - base.top + pad;
      const [dx, dy, dw, dh] = k.dest ?? defaultDest;
      const s = k.scale ?? Math.min(maxScale, dw / (x1 - x0), dh / (y1 - y0));
      return { s, tx: dx + dw / 2 - s * (x0 + x1) / 2, ty: dy + dh / 2 - s * (y0 + y1) / 2 };
    };
    let i = 0;
    while (i + 1 < keys.length && frame >= keys[i + 1].frame - move) i++;
    const cur = solve(keys[i]);
    let t = cur;
    const next = keys[i + 1];
    if (i > 0 && frame < keys[i].frame) {
      // 正在从上一个状态过渡到 keys[i]
      const prev = solve(keys[i - 1]);
      const p = interpolate(frame, [keys[i].frame - move, keys[i].frame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
      // 缩放按对数插值；平移按「画面中心看到的那一点」插值，推拉更自然
      const s = Math.exp(Math.log(prev.s) + (Math.log(cur.s) - Math.log(prev.s)) * p);
      const cx = 960;
      const cy = 540;
      const wpx = (cx - prev.tx) / prev.s + ((cx - cur.tx) / cur.s - (cx - prev.tx) / prev.s) * p;
      const wpy = (cy - prev.ty) / prev.s + ((cy - cur.ty) / cur.s - (cy - prev.ty) / prev.s) * p;
      t = { s, tx: cx - s * wpx, ty: cy - s * wpy };
    }
    void next;
    el.style.transformOrigin = "0 0";
    el.style.transform = `translate(${t.tx}px, ${t.ty}px) scale(${t.s})`;
  });
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      {children}
    </div>
  );
}
