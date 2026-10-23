/**
 * 像素角色：用软件里同一套函数画（renderSprite 换色、renderBannerText 幡上文字、dissolve 换字溶解），
 * 只是动作由帧号驱动（Remotion 逐帧渲染）。只按整数倍放大、关闭图像平滑，像素锐利。
 * 轻跳、晃幡、换字的时长和步子与 src/sprite/Daoshi.tsx 一样。
 */
import { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame } from "remotion";
import { dissolve, renderBannerText } from "../../../src/sprite/bannerText";
import { getCharacter } from "../../../src/sprite/characters";
import { renderSprite, type Outfit } from "../../../src/sprite/sprite";
import { writingArea } from "../../../src/sprite/writingArea";
import { FPS } from "./timing";

const INK = "#2A2420";
const JUMP = [0, -1, -2, -3, -3, -2, -1, 0, -1, 0]; // 480ms
const SWAY = [0, 1, 1, 0, -1, -1, 0, 1, 0]; // 320ms

interface Props {
  id: string;
  outfit: Outfit;
  /** 每格多少像素（整数） */
  cell: number;
  /** 幡上的字；换字时给 from、changeAt（帧，相对本组件所在序列），在 200ms 内像素溶解 */
  text: string;
  from?: string;
  changeAt?: number;
  hideBanner?: boolean;
  /** 这些帧开始轻跳一下 */
  jumps?: number[];
  /** 这些帧开始晃一下幡 */
  sways?: number[];
  /** 呼吸：每秒浮动一格（和软件一样） */
  breathing?: boolean;
  style?: React.CSSProperties;
}

function stepAt(frames: number[] | undefined, frame: number, table: number[], ms: number): number {
  for (const f of frames ?? []) {
    const dt = ((frame - f) / FPS) * 1000;
    if (dt >= 0 && dt < ms) return table[Math.min(table.length - 1, Math.floor((dt / ms) * table.length))];
  }
  return 0;
}

export function PixelSprite({ id, outfit, cell, text, from, changeAt, hideBanner, jumps, sways, breathing = true, style }: Props) {
  const frame = useCurrentFrame();
  const sprite = getCharacter(id).data;
  const area = useMemo(() => writingArea(sprite), [sprite]);
  const face = area.box;
  const b = sprite.banner;
  const bodyRef = useRef<HTMLCanvasElement>(null);
  const bannerRef = useRef<HTMLCanvasElement>(null);
  const body = useMemo(() => renderSprite(sprite, outfit, { hideBanner: true }), [sprite, outfit]);
  const bannerPixels = useMemo(() => {
    const only = renderSprite(sprite, outfit, { onlyBanner: true });
    const out = new Uint8ClampedArray(b.w * b.h * 4);
    for (let y = 0; y < b.h; y++) out.set(only.subarray(((b.y + y) * sprite.width + b.x) * 4, ((b.y + y) * sprite.width + b.x + b.w) * 4), y * b.w * 4);
    return out;
  }, [sprite, outfit, b]);
  const toMask = useMemo(() => renderBannerText(text, "pixel", area, cell, cell).mask, [text, area, cell]);
  const fromMask = useMemo(() => (from ? renderBannerText(from, "pixel", area, cell, cell).mask : null), [from, area, cell]);
  const p = changeAt === undefined || !fromMask ? 1 : Math.max(0, Math.min(1, ((frame - changeAt) / FPS) * 5));

  useLayoutEffect(() => {
    if (bodyRef.current) paintCells(bodyRef.current, body, sprite.width, sprite.height, cell);
  }, [body, sprite, cell]);
  useLayoutEffect(() => {
    const c = bannerRef.current;
    if (!c || hideBanner) return;
    paintCells(c, bannerPixels, b.w, b.h, cell);
    const mask = fromMask && p < 1 ? dissolve(fromMask, toMask, p, face.w * cell, Math.max(1, Math.round(cell / 2))) : toMask;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = INK;
    const W = face.w * cell;
    const ox = (face.x - b.x) * cell;
    const oy = (face.y - b.y) * cell;
    for (let y = 0; y < face.h * cell; y++) {
      let x = 0;
      while (x < W) {
        if (!mask[y * W + x]) {
          x++;
          continue;
        }
        const s = x;
        while (x < W && mask[y * W + x]) x++;
        ctx.fillRect(ox + s, oy + y, x - s, 1);
      }
    }
  }, [bannerPixels, toMask, fromMask, p, cell, hideBanner, b, face]);

  // 呼吸：每秒上下浮动一格（按格跳变）
  const breath = breathing && Math.floor(frame / FPS) % 2 === 1 ? -1 : 0;
  const jump = stepAt(jumps, frame, JUMP, 480);
  const sway = stepAt(sways, frame, SWAY, 320);
  return (
    <div style={{ position: "relative", width: sprite.width * cell, height: sprite.height * cell, ...style }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${(breath + jump) * cell}px)` }}>
        <canvas ref={bodyRef} style={{ position: "absolute", left: 0, top: 0, imageRendering: "pixelated" }} />
        {!hideBanner && (
          <canvas ref={bannerRef} style={{ position: "absolute", left: b.x * cell + sway * cell, top: b.y * cell, imageRendering: "pixelated" }} />
        )}
      </div>
    </div>
  );
}

function paintCells(canvas: HTMLCanvasElement, rgba: Uint8ClampedArray, w: number, h: number, unit: number) {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  off.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
  canvas.width = w * unit;
  canvas.height = h * unit;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(off, 0, 0, w * unit, h * unit);
}
