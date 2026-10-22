import { useEffect, useRef } from "react";

interface Props {
  /** 闪光范围（窗口内坐标） */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 粒子大小 = 一格 */
  cell: number;
}

const COLORS = ["#FFF6C8", "#F2BE45", "#FFFFFF", "#FFD86B"];
const COUNT = 18;

/** 像素闪光粒子：天赦日和春节绕着道士一闪一闪 */
export function Sparkles({ x, y, w, h, cell }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d")!;
    const unit = Math.max(1, Math.round(cell * dpr));
    // 粒子只出现在边缘一圈，不压在道士身上
    const ring = () => {
      const side = Math.floor(Math.random() * 4);
      const edge = 0.18;
      const t = Math.random();
      const d = Math.random() * edge;
      const [fx, fy] = side === 0 ? [t, d] : side === 1 ? [1 - d, t] : side === 2 ? [t, 1 - d] : [d, t];
      return { x: fx * canvas.width, y: fy * canvas.height };
    };
    const parts = Array.from({ length: COUNT }, () => ({ ...ring(), phase: Math.random() * Math.PI * 2, speed: 2 + Math.random() * 2, color: COLORS[Math.floor(Math.random() * COLORS.length)] }));
    let raf = 0;
    const draw = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        const v = Math.sin(now / 1000 * p.speed + p.phase);
        if (v < 0.2) {
          if (v < -0.95) Object.assign(p, ring());
          continue;
        }
        const px = Math.round(p.x / unit) * unit;
        const py = Math.round(p.y / unit) * unit;
        ctx.fillStyle = p.color;
        // 十字形小星：中心一格 + 亮的时候四周再各一格
        ctx.fillRect(px, py, unit, unit);
        if (v > 0.7) {
          ctx.fillRect(px - unit, py, unit, unit);
          ctx.fillRect(px + unit, py, unit, unit);
          ctx.fillRect(px, py - unit, unit, unit);
          ctx.fillRect(px, py + unit, unit, unit);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, h, cell]);

  return <canvas ref={ref} className="pixel sparkles" style={{ left: x, top: y, width: w, height: h }} aria-hidden="true" />;
}
