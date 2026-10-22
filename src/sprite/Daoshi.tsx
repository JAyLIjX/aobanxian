import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { startWindowDrag } from "../platform/window";
import { dissolve, ensureBannerFonts, renderBannerText, type BannerFont, type BannerMask } from "./bannerText";
import { writingArea } from "./writingArea";
import { hitTest, renderSprite, type HitPart, type Outfit, type SpriteData } from "./sprite";

/** 幡上字的颜色：深墨 */
const INK = "#2A2420";
/** 换字过渡时长 */
const DISSOLVE_MS = 200;
/** 按下后移动超过这么多像素算拖动 */
const DRAG_THRESHOLD = 4;

interface Props {
  /** 角色精灵数据（characters.ts） */
  data: SpriteData;
  outfit: Outfit;
  /** 每格多少 CSS 像素（小 1 / 中 2 / 大 3） */
  scale: number;
  bannerText: string;
  bannerFont: BannerFont;
  /** 卷轴展开时幡不画 */
  hideBanner: boolean;
  breathing: boolean;
  /** 每次变化（> 0）轻跳一下 */
  jumpSignal: number;
  /** 每次变化（> 0）幡晃一下 */
  swaySignal: number;
  onClickPart: (part: Exclude<HitPart, null>) => void;
  onContextMenu: (e: MouseEvent) => void;
}

function useDevicePixelRatio() {
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1);
  useEffect(() => {
    const mq = matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [dpr]);
  return dpr;
}

function drawCells(canvas: HTMLCanvasElement, rgba: Uint8ClampedArray, w: number, h: number, unit: number) {
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

/** 像素角色（默认道士）：canvas 绘制，整数倍放大，image-rendering: pixelated */
export function Daoshi(props: Props) {
  const { data: sprite, outfit, scale, bannerText, bannerFont, hideBanner, breathing, jumpSignal, swaySignal } = props;
  const dpr = useDevicePixelRatio();
  // 每格的设备像素必须是整数，像素才锐利
  const unit = Math.max(1, Math.round(scale * dpr));
  const cssCell = unit / dpr;

  const bodyRef = useRef<HTMLCanvasElement>(null);
  const jumpRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLCanvasElement>(null);
  const b = sprite.banner;
  // 写字区域（已扣 1 格边距）；扇面是扇区，点阵画在它的外接框里
  const area = useMemo(() => writingArea(sprite), [sprite]);
  const face = area.box;

  const body = useMemo(() => renderSprite(sprite, outfit, { hideBanner: true }), [sprite, outfit]);
  const bannerPixels = useMemo(() => {
    const only = renderSprite(sprite, outfit, { onlyBanner: true });
    const out = new Uint8ClampedArray(b.w * b.h * 4);
    for (let y = 0; y < b.h; y++) {
      const src = ((b.y + y) * sprite.width + b.x) * 4;
      out.set(only.subarray(src, src + b.w * 4), y * b.w * 4);
    }
    return out;
  }, [sprite, outfit, b]);

  useEffect(() => {
    if (bodyRef.current) drawCells(bodyRef.current, body, sprite.width, sprite.height, unit);
  }, [body, unit]);

  // 幡：底图 + 文字。字号按幡面大小和字数自动选（见 bannerText.ts）；换字时像素溶解
  const shown = useRef<{ text: string; style: string; mask: BannerMask } | null>(null);
  useEffect(() => {
    const canvas = bannerRef.current;
    if (!canvas) return;
    let cancelled = false;
    let raf = 0;
    // 字体或尺寸变了直接换；只是换字才溶解
    const style = `${bannerFont}|${unit}`;
    const faceW = face.w * unit;
    const ox = (face.x - b.x) * unit;
    const oy = (face.y - b.y) * unit;

    const paint = (mask: BannerMask) => {
      drawCells(canvas, bannerPixels, b.w, b.h, unit);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = INK;
      // 按行合并连续的点，少调几次 fillRect
      for (let y = 0; y < face.h * unit; y++) {
        let x = 0;
        while (x < faceW) {
          if (!mask[y * faceW + x]) {
            x++;
            continue;
          }
          const start = x;
          while (x < faceW && mask[y * faceW + x]) x++;
          ctx.fillRect(ox + start, oy + y, x - start, 1);
        }
      }
    };

    void ensureBannerFonts(bannerText, bannerFont).then(() => {
      if (cancelled) return;
      const next = renderBannerText(bannerText, bannerFont, area, unit, cssCell).mask;
      const prev = shown.current;
      if (!prev || prev.style !== style || prev.text === bannerText) {
        shown.current = { text: bannerText, style, mask: next };
        paint(next);
        return;
      }
      const block = Math.max(1, Math.round(unit / 2));
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - start) / DISSOLVE_MS);
        paint(dissolve(prev.mask, next, p, faceW, block));
        if (p < 1) raf = requestAnimationFrame(step);
        else shown.current = { text: bannerText, style, mask: next };
      };
      raf = requestAnimationFrame(step);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [bannerText, bannerFont, bannerPixels, unit, cssCell, b, face, area]);

  // 轻跳、晃幡：用 Web Animations 播放，按格跳变（steps），保持像素感；不重新挂载 canvas
  useEffect(() => {
    if (jumpSignal <= 0 || !jumpRef.current) return;
    const ys = [0, -1, -2, -3, -3, -2, -1, 0, -1, 0];
    jumpRef.current.animate(
      ys.map((y) => ({ transform: `translateY(${y * cssCell}px)`, easing: "steps(1, end)" })),
      { duration: 480 },
    );
  }, [jumpSignal, cssCell]);

  useEffect(() => {
    if (swaySignal <= 0 || !bannerRef.current) return;
    const xs = [0, 1, 1, 0, -1, -1, 0, 1, 0];
    bannerRef.current.animate(
      xs.map((x) => ({ transform: `translateX(${x * cssCell}px)`, easing: "steps(1, end)" })),
      { duration: 320 },
    );
  }, [swaySignal, cssCell]);

  // 点击 / 拖动：按下时只记位置，移动超过 4px 交给系统拖动窗口，没动就按落点分区当点击
  const press = useRef<{ x: number; y: number; part: Exclude<HitPart, null> } | null>(null);
  const partAt = (e: { clientX: number; clientY: number; currentTarget: Element }): HitPart => {
    const r = e.currentTarget.getBoundingClientRect();
    return hitTest(sprite, ((e.clientX - r.left) / r.width) * sprite.width, ((e.clientY - r.top) / r.height) * sprite.height);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    let part = partAt(e);
    if (part === "banner" && hideBanner) part = null;
    if (!part) return;
    press.current = { x: e.screenX, y: e.screenY, part };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    const onMove = (ev: globalThis.PointerEvent) => {
      const p = press.current;
      if (p && Math.hypot(ev.screenX - p.x, ev.screenY - p.y) > DRAG_THRESHOLD) {
        press.current = null;
        cleanup();
        startWindowDrag();
      }
    };
    const onUp = () => {
      const p = press.current;
      press.current = null;
      cleanup();
      if (p) props.onClickPart(p.part);
    };
    const onCancel = () => {
      press.current = null;
      cleanup();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    if (!partAt(e)) return;
    e.preventDefault();
    props.onContextMenu(e);
  };

  const style = {
    "--cell": `${cssCell}px`,
    width: sprite.width * cssCell,
    height: sprite.height * cssCell,
  } as CSSProperties;

  return (
    <div className="daoshi" style={style} onPointerDown={onPointerDown} onContextMenu={onContextMenu}>
      <div ref={jumpRef} className="daoshi__jump">
        <div className={breathing ? "daoshi__float is-breathing" : "daoshi__float"}>
          <canvas ref={bodyRef} className="pixel daoshi__body" />
          <canvas
            ref={bannerRef}
            className={`pixel daoshi__banner ${hideBanner ? "is-hidden" : ""}`}
            style={{ left: b.x * cssCell, top: b.y * cssCell, width: b.w * cssCell, height: b.h * cssCell }}
          />
        </div>
      </div>
    </div>
  );
}
