/** 用软件里的 drawGrid 把格子图（签筒、签、木鱼）画到 canvas，整数倍放大；after 在画完后再加笔（如签筒牌子上的字） */
import { useLayoutEffect, useRef } from "react";
import { drawGrid } from "../../../src/sprite/lotCylinder";

export function GridCanvas({ grid, cell, palette, style, after }: { grid: string[]; cell: number; palette?: Record<string, string>; style?: React.CSSProperties; after?: (canvas: HTMLCanvasElement) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    drawGrid(ref.current, grid, cell, palette);
    after?.(ref.current);
  }, [grid, cell, palette, after]);
  return <canvas ref={ref} style={{ imageRendering: "pixelated", display: "block", ...style }} />;
}
