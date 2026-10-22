import type { FigureProps } from "./types";

const SKIN = "#FFE0C7";
const HAIR = "#3B2A26";
const PANTS = "#4A4E5A";
const LINE = "#3A3030";

/**
 * 占位小人：纯 SVG 几何图形。上衣（#shirt）和围巾（#scarf）是两块独立形状，
 * 颜色由外部传入；bounceSignal 变化时轻轻弹一下。
 */
export function PlaceholderFigure({ primary, accent, bounceSignal }: FigureProps) {
  return (
    // key 变化让 SVG 重新挂载，连续触发也能重新播放弹跳动画
    <svg
      key={bounceSignal}
      className={bounceSignal > 0 ? "figure__svg figure__svg--bounce" : "figure__svg"}
      viewBox="0 0 120 180"
      width="110"
      height="165"
      aria-hidden="true"
    >
      <ellipse cx="60" cy="172" rx="30" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* 腿和鞋 */}
      <rect x="45" y="128" width="12" height="34" rx="5" fill={PANTS} stroke={LINE} strokeWidth="1.5" />
      <rect x="63" y="128" width="12" height="34" rx="5" fill={PANTS} stroke={LINE} strokeWidth="1.5" />
      <ellipse cx="50" cy="164" rx="9" ry="5" fill={LINE} />
      <ellipse cx="70" cy="164" rx="9" ry="5" fill={LINE} />

      {/* 上衣：躯干 + 两只袖子 */}
      <g id="shirt" fill={primary} stroke={LINE} strokeWidth="2" strokeLinejoin="round">
        <path d="M40 132 L42 86 Q60 76 78 86 L80 132 Q60 138 40 132 Z" />
        <path d="M42 88 Q30 96 27 118 L36 121 Q39 104 46 98 Z" />
        <path d="M78 88 Q90 96 93 118 L84 121 Q81 104 74 98 Z" />
      </g>
      <circle cx="31" cy="122" r="5" fill={SKIN} stroke={LINE} strokeWidth="1.5" />
      <circle cx="89" cy="122" r="5" fill={SKIN} stroke={LINE} strokeWidth="1.5" />

      {/* 头 */}
      <circle cx="60" cy="50" r="26" fill={SKIN} stroke={LINE} strokeWidth="2" />
      <path d="M34 48 Q34 22 60 22 Q86 22 86 48 Q78 34 60 36 Q44 36 34 48 Z" fill={HAIR} />
      <circle cx="51" cy="52" r="2.6" fill={LINE} />
      <circle cx="69" cy="52" r="2.6" fill={LINE} />
      <ellipse cx="45" cy="60" rx="4" ry="2.4" fill="#F7A8A8" opacity="0.7" />
      <ellipse cx="75" cy="60" rx="4" ry="2.4" fill="#F7A8A8" opacity="0.7" />
      <path d="M55 62 Q60 66 65 62" fill="none" stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />

      {/* 围巾：绕颈一圈 + 垂下的一端 */}
      <g id="scarf" fill={accent} stroke={LINE} strokeWidth="2" strokeLinejoin="round">
        <path d="M40 80 Q60 90 80 80 L81 88 Q60 98 39 88 Z" />
        <path d="M66 88 L74 90 L72 114 L64 112 Z" />
      </g>
    </svg>
  );
}
