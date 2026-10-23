/** 用软件里的 drawGrid 把格子图（签筒、签、木鱼）画到 canvas，整数倍放大 */
import { useLayoutEffect, useRef } from "react";
import { drawGrid } from "../../../src/sprite/lotCylinder";

export function GridCanvas({ grid, cell, palette, style }: { grid: string[]; cell: number; palette?: Record<string, string>; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (ref.current) drawGrid(ref.current, grid, cell, palette);
  }, [grid, cell, palette]);
  return <canvas ref={ref} style={{ imageRendering: "pixelated", display: "block", ...style }} />;
}
