/**
 * 详情里代码画的小图：罗盘（喜神、财神、福神方位）、月相小月亮。
 */

/** 方位 → 角度（北为 0°，顺时针） */
const ANGLE: Record<string, number> = {
  北: 0,
  正北: 0,
  东北: 45,
  东: 90,
  正东: 90,
  东南: 135,
  南: 180,
  正南: 180,
  西南: 225,
  西: 270,
  正西: 270,
  西北: 315,
};

export type CompassMark = { dir: string; shape: "circle" | "diamond" | "triangle"; label: string };

/** 小罗盘：上北下南，三个方向用不同记号；同一个方向有几个记号时沿半径错开 */
export function Compass({ marks, labels }: { marks: CompassMark[]; labels: { n: string; e: string; s: string; w: string } }) {
  const size = 124;
  const c = size / 2;
  const R = 40;
  const seen = new Map<number, number>();
  return (
    <svg className="compass" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={marks.map((m) => `${m.label} ${m.dir}`).join("，")}>
      <circle cx={c} cy={c} r={R + 8} className="compass__ring" />
      <circle cx={c} cy={c} r={R - 14} className="compass__inner" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        const r0 = i % 2 === 0 ? R + 1 : R + 4;
        return <line key={i} x1={c + r0 * Math.sin(a)} y1={c - r0 * Math.cos(a)} x2={c + (R + 8) * Math.sin(a)} y2={c - (R + 8) * Math.cos(a)} className="compass__tick" />;
      })}
      <text x={c} y={c - R - 11} className="compass__label">
        {labels.n}
      </text>
      <text x={c + R + 13} y={c + 4} className="compass__label">
        {labels.e}
      </text>
      <text x={c} y={c + R + 19} className="compass__label">
        {labels.s}
      </text>
      <text x={c - R - 13} y={c + 4} className="compass__label">
        {labels.w}
      </text>
      {marks.map((m) => {
        const deg = ANGLE[m.dir];
        if (deg === undefined) return null;
        const k = seen.get(deg) ?? 0;
        seen.set(deg, k + 1);
        const r = R - 4 - k * 11;
        const a = (deg * Math.PI) / 180;
        const x = c + r * Math.sin(a);
        const y = c - r * Math.cos(a);
        return <MarkShape key={m.label} shape={m.shape} x={x} y={y} />;
      })}
      <circle cx={c} cy={c} r={2} className="compass__center" />
    </svg>
  );
}

export function MarkShape({ shape, x, y, size = 5 }: { shape: CompassMark["shape"]; x: number; y: number; size?: number }) {
  if (shape === "circle") return <circle cx={x} cy={y} r={size} className="mark--circle" />;
  if (shape === "diamond") return <polygon points={`${x},${y - size - 1} ${x + size + 1},${y} ${x},${y + size + 1} ${x - size - 1},${y}`} className="mark--diamond" />;
  return <polygon points={`${x},${y - size - 1} ${x + size + 1},${y + size} ${x - size - 1},${y + size}`} className="mark--triangle" />;
}

/** 图例里的小记号 */
export function MarkIcon({ shape }: { shape: CompassMark["shape"] }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true" className="mark-icon">
      <MarkShape shape={shape} x={7} y={7} size={4.5} />
    </svg>
  );
}

/**
 * 月相小月亮：按农历日画出盈亏（初一朔、十五前后望），北半球视角——上半月亮在右边，下半月亮在左边。
 * 亮面 = 半个圆 + 明暗交界线（半椭圆，横半径 r·|cos 2πp|）。
 */
export function MoonIcon({ lunarDay, size = 40 }: { lunarDay: number; size?: number }) {
  const p = Math.min(Math.max((lunarDay - 1) / 29.53, 0), 0.999);
  const r = size / 2 - 2;
  const c = size / 2;
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(k) * r;
  const waxing = p < 0.5;
  const crescent = k > 0;
  // 从上到下画亮面的外缘（半圆），再沿交界线回到顶上
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx} ${r} 0 0 ${inner} ${c} ${c - r} Z`;
  return (
    <svg className="moon-icon" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={c} cy={c} r={r} className="moon-icon__dark" />
      <path d={d} className="moon-icon__lit" />
    </svg>
  );
}
