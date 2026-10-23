/** 二维码：用软件分享图同一个函数（qrMatrix）生成，画成 SVG 方块 */
import { qrMatrix } from "../../../src/share/shareImage";

export function Qr({ text, size }: { text: string; size: number }) {
  const m = qrMatrix(text);
  const n = m.length + 4;
  const u = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" style={{ background: "#fff" }}>
      {m.flatMap((row, y) => row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x + 2} y={y + 2} width={1} height={1} fill="#2a2420" /> : null)))}
    </svg>
  );
}
