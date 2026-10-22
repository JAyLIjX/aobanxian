/**
 * 开发用：书写物上字号的效果图（scripts/render-text-fit.sh 用无头 Chrome 截图到 preview/text-fit/）。
 *   ?view=textfit&id=<角色>&what=area   放大的精灵图上标出「识别出的写字区域」和「实际排字用的框」
 *   ?view=textfit&id=<角色>&what=sizes  小、中、大三种尺寸 × 3 个字、4 个字 × 像素字、行书
 */
import { useEffect, useRef, useState } from "react";
import { defaultRules } from "../core/rules";
import { ensureBannerFonts, renderBannerText, type BannerFont, type BannerRender } from "../sprite/bannerText";
import { getCharacter } from "../sprite/characters";
import { renderSprite, type Outfit, type Ramp, type SpriteData } from "../sprite/sprite";
import { writingArea } from "../sprite/writingArea";

const ramp = (e: "火" | "土") => defaultRules.pixelRamps[e].map((l) => l.hex) as Ramp;
const OUTFIT: Outfit = { robe: ramp("土"), sash: ramp("火") };
const INK = "#2A2420";
const TEXTS = ["奥半仙", "宜红宜黄"];
const FONTS: [BannerFont, string][] = [
  ["pixel", "像素字体"],
  ["brush", "像素化行书"],
];
const SIZES: [number, string][] = [
  [1, "小"],
  [2, "中"],
  [3, "大"],
];

function drawRgba(ctx: CanvasRenderingContext2D, rgba: Uint8ClampedArray, w: number, sx: number, sy: number, sw: number, sh: number, unit: number) {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = ((sy + y) * w + sx + x) * 4;
      if (!rgba[i + 3]) continue;
      ctx.fillStyle = `rgb(${rgba[i]},${rgba[i + 1]},${rgba[i + 2]})`;
      ctx.fillRect(x * unit, y * unit, unit, unit);
    }
  }
}

/** 书写物（裁到书写物的外接框）+ 字，按设备像素画 */
function Writing({ data, text, font, cssCell, onInk }: { data: SpriteData; text: string; font: BannerFont; cssCell: number; onInk: (r: BannerRender) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    void ensureBannerFonts(text, font).then(() => {
      const dpr = window.devicePixelRatio || 1;
      const unit = Math.max(1, Math.round(cssCell * dpr));
      const b = data.banner;
      canvas.width = b.w * unit;
      canvas.height = b.h * unit;
      canvas.style.width = `${(b.w * unit) / dpr}px`;
      canvas.style.height = `${(b.h * unit) / dpr}px`;
      const ctx = canvas.getContext("2d")!;
      drawRgba(ctx, renderSprite(data, OUTFIT, { onlyBanner: true }), data.width, b.x, b.y, b.w, b.h, unit);
      const area = writingArea(data);
      const r = renderBannerText(text, font, area, unit, unit / dpr);
      ctx.fillStyle = INK;
      const ox = (area.box.x - b.x) * unit;
      const oy = (area.box.y - b.y) * unit;
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.mask[y * r.w + x]) ctx.fillRect(ox + x, oy + y, 1, 1);
      onInk(r);
    });
  }, [data, text, font, cssCell, onInk]);
  return <canvas ref={ref} style={{ imageRendering: "pixelated" }} />;
}

function Cell({ data, text, font, cssCell }: { data: SpriteData; text: string; font: BannerFont; cssCell: number }) {
  const [ink, setInk] = useState<BannerRender | null>(null);
  const dpr = window.devicePixelRatio || 1;
  return (
    <figure className="tf__cell">
      <Writing data={data} text={text} font={font} cssCell={cssCell} onInk={setInk} />
      <figcaption>
        {text}
        {ink && (
          <span>
            　墨迹 {Math.round(ink.ink.along / dpr)}×{Math.round(ink.ink.across / dpr)} 屏幕像素 · {ink.mode === "integer" ? "整数倍" : ink.mode === "smooth" ? "精确倍数" : "行书"}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** 放大的精灵图，标出识别出的写字区域（蓝）和实际排字用的框（红） */
function Area({ data }: { data: SpriteData }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const S = 8;
  useEffect(() => {
    const canvas = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = data.width * S * dpr;
    canvas.height = data.height * S * dpr;
    canvas.style.width = `${data.width * S}px`;
    canvas.style.height = `${data.height * S}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    drawRgba(ctx, renderSprite(data, OUTFIT), data.width, 0, 0, data.width, data.height, S);
    const area = writingArea(data);
    const outline = (color: string, dash: number[], draw: () => void) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash(dash);
      ctx.beginPath();
      draw();
      ctx.stroke();
    };
    const sector = (a: { cx: number; cy: number; r0: number; r1: number; a0: number; a1: number }) => {
      ctx.arc(a.cx * S, a.cy * S, a.r1 * S, a.a0, a.a1);
      ctx.arc(a.cx * S, a.cy * S, a.r0 * S, a.a1, a.a0, true);
      ctx.closePath();
    };
    const f = data.bannerFace;
    // 识别出的写字区域：整块留白
    outline("#1f6feb", [10, 6], () => (data.writingArc ? sector(data.writingArc) : ctx.rect(f.x * S, f.y * S, f.w * S, f.h * S)));
    // 实际排字用的框：扣掉 1 格边距
    outline("#d1242f", [], () => (area.kind === "arc" ? sector(area) : ctx.rect(area.box.x * S, area.box.y * S, area.box.w * S, area.box.h * S)));
  }, [data]);
  return <canvas ref={ref} />;
}

export function TextFitApp() {
  const q = new URLSearchParams(location.search);
  const c = getCharacter(q.get("id") ?? "daoshi");
  if (q.get("what") === "area") {
    return (
      <main className="tf">
        <h1>
          {c.name["zh-CN"]}：写字区域　<span style={{ color: "#1f6feb" }}>蓝虚线 = 识别出的整块留白</span>　
          <span style={{ color: "#d1242f" }}>红线 = 实际排字用的框（扣 1 格边距）</span>
        </h1>
        <Area data={c.data} />
      </main>
    );
  }
  return (
    <main className="tf">
      <h1>{c.name["zh-CN"]}：字号效果（2 倍屏）</h1>
      {SIZES.map(([cssCell, label]) => (
        <section key={cssCell} className="tf__row">
          <h2>{label}尺寸（每格 {cssCell} 屏幕像素）</h2>
          <div className="tf__grid">
            {FONTS.flatMap(([font, fontLabel]) =>
              TEXTS.map((text) => (
                <div key={font + text}>
                  <div className="tf__font">{fontLabel}</div>
                  <Cell data={c.data} text={text} font={font} cssCell={cssCell} />
                </div>
              )),
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
