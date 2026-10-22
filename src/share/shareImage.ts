/**
 * 「分享今日」图片：1080×1440，纸色底、朱砂边、墨字。
 * 只负责画图；文字由调用方按界面语言准备好。二维码离线生成（qrcode-generator）。
 */
import qrcode from "qrcode-generator";

export const SHARE_W = 1080;
export const SHARE_H = 1440;

const PAPER = "#f4eedf";
const INK = "#2a2420";
const INK_2 = "rgba(42, 36, 32, 0.66)";
const LINE = "rgba(42, 36, 32, 0.16)";
const CINNABAR = "#b83a2c";

export interface ShareContent {
  dateBig: string;
  dateLine: string;
  lunar: string;
  ganzhi: string;
  element: string;
  luckyLabel: string;
  families: { name: string; colors: string[] }[];
  yiLabel: string;
  jiLabel: string;
  yi: string[];
  ji: string[];
  brand: string;
  /** 落款下面那行仓库地址 */
  url: string;
  /** 二维码指向的地址：GitHub Releases 的最新版下载页 */
  qrUrl: string;
  scanHint: string;
  lot?: { title: string; poem: string[] };
  /** 道士：每格一个 RGBA 像素 */
  sprite: { pixels: Uint8ClampedArray; w: number; h: number };
  /** 幡上的字：幡面在精灵格子里的位置，和按 SPRITE_CELL 栅格化好的点阵 */
  banner?: { x: number; y: number; w: number; h: number; mask: Uint8Array };
  fonts: { display: string; body: string };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 道士放大倍数：每格 4 像素 */
export const SPRITE_CELL = 4;
const M = 56;

/** 各块的位置（测试里检查都在图内、不互相重叠） */
export function shareLayout(withLot: boolean, spriteW = 79, spriteH = 115) {
  const sw = spriteW * SPRITE_CELL;
  const sh = spriteH * SPRITE_CELL;
  const qr = 176;
  return {
    border: { x: M / 2, y: M / 2, w: SHARE_W - M, h: SHARE_H - M },
    sprite: { x: SHARE_W - M - 50 - sw, y: 110, w: sw, h: sh },
    text: { x: 110, y: 110, w: SHARE_W - M - 50 - sw - 130, h: 470 },
    lucky: { x: 110, y: 640, w: SHARE_W - 220, h: 90 },
    yiji: { x: 110, y: 770, w: SHARE_W - 220, h: 250 },
    lot: withLot ? { x: 110, y: 1035, w: SHARE_W - 220, h: 132 } : null,
    footer: { x: 110, y: 1220, w: SHARE_W - 220 - qr - 30, h: 130 },
    qr: { x: SHARE_W - 110 - qr, y: 1190, w: qr, h: qr },
  };
}

/** 二维码点阵（true 为黑），纠错级别 M */
/** GitHub Releases 的最新版下载页 */
export function latestReleaseUrl(repository: string): string {
  return `${repository.replace(/\/$/, "")}/releases/latest`;
}

export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

type Ctx = CanvasRenderingContext2D;

/** 字太宽时缩小字号 */
function fitText(ctx: Ctx, text: string, family: string, size: number, maxW: number, weight = ""): number {
  let s = size;
  for (; s > 12; s -= 2) {
    ctx.font = `${weight} ${s}px ${family}`.trim();
    if (ctx.measureText(text).width <= maxW) break;
  }
  return s;
}

function stamp(ctx: Ctx, char: string, x: number, y: number, size: number, filled: boolean, family: string) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = filled ? CINNABAR : INK;
  ctx.fillStyle = filled ? CINNABAR : "transparent";
  if (filled) ctx.fillRect(x, y, size, size);
  ctx.strokeRect(x, y, size, size);
  ctx.fillStyle = filled ? PAPER : INK;
  const chars = [...char];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (chars.length === 1) {
    ctx.font = `${Math.round(size * 0.66)}px ${family}`;
    ctx.fillText(char, x + size / 2, y + size / 2 + 2);
  } else {
    // 两个字竖排在印章里
    ctx.font = `${Math.round(size * 0.4)}px ${family}`;
    ctx.fillText(chars[0], x + size / 2, y + size * 0.3);
    ctx.fillText(chars[1], x + size / 2, y + size * 0.72);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function renderShareImage(canvas: HTMLCanvasElement, c: ShareContent): void {
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext("2d")!;
  const L = shareLayout(!!c.lot, c.sprite.w, c.sprite.h);
  const { display, body } = c.fonts;

  // 纸
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  ctx.fillStyle = "rgba(120, 90, 50, 0.035)";
  for (let y = 0; y < SHARE_H; y += 6) ctx.fillRect(0, y, SHARE_W, 2);
  // 朱砂双线边
  ctx.strokeStyle = CINNABAR;
  ctx.lineWidth = 6;
  ctx.strokeRect(L.border.x, L.border.y, L.border.w, L.border.h);
  ctx.lineWidth = 2;
  ctx.strokeRect(L.border.x + 12, L.border.y + 12, L.border.w - 24, L.border.h - 24);

  // 日期、农历、干支、当日五行
  const t = L.text;
  ctx.fillStyle = INK;
  fitText(ctx, c.dateBig, display, 120, t.w);
  ctx.fillText(c.dateBig, t.x, t.y + 130);
  ctx.fillStyle = INK_2;
  fitText(ctx, c.dateLine, body, 34, t.w);
  ctx.fillText(c.dateLine, t.x, t.y + 195);
  ctx.fillStyle = INK;
  fitText(ctx, c.lunar, display, 56, t.w);
  ctx.fillText(c.lunar, t.x, t.y + 290);
  ctx.fillStyle = INK_2;
  fitText(ctx, c.ganzhi, body, 32, t.w);
  ctx.fillText(c.ganzhi, t.x, t.y + 350);
  ctx.fillStyle = CINNABAR;
  fitText(ctx, c.element, body, 46, t.w);
  ctx.fillText(c.element, t.x, t.y + 430);

  // 放大的像素道士
  const s = L.sprite;
  for (let y = 0; y < c.sprite.h; y++) {
    for (let x = 0; x < c.sprite.w; x++) {
      const i = (y * c.sprite.w + x) * 4;
      if (!c.sprite.pixels[i + 3]) continue;
      ctx.fillStyle = `rgb(${c.sprite.pixels[i]},${c.sprite.pixels[i + 1]},${c.sprite.pixels[i + 2]})`;
      ctx.fillRect(s.x + x * SPRITE_CELL, s.y + y * SPRITE_CELL, SPRITE_CELL, SPRITE_CELL);
    }
  }
  if (c.banner) {
    const b = c.banner;
    const fw = b.w * SPRITE_CELL;
    ctx.fillStyle = INK;
    for (let y = 0; y < b.h * SPRITE_CELL; y++) {
      for (let x = 0; x < fw; x++) {
        if (b.mask[y * fw + x]) ctx.fillRect(s.x + b.x * SPRITE_CELL + x, s.y + b.y * SPRITE_CELL + y, 1, 1);
      }
    }
  }

  // 大吉的两个色系，相在前
  const lk = L.lucky;
  stamp(ctx, c.luckyLabel.slice(0, 2), lk.x, lk.y, 76, true, display);
  let x = lk.x + 104;
  for (const f of c.families) {
    ctx.fillStyle = INK;
    fitText(ctx, f.name, body, 34, 220);
    ctx.textBaseline = "middle";
    ctx.fillText(f.name, x, lk.y + 38);
    ctx.textBaseline = "alphabetic";
    x += Math.min(220, ctx.measureText(f.name).width) + 16;
    for (const col of f.colors.slice(0, 3)) {
      ctx.fillStyle = col;
      ctx.fillRect(x, lk.y + 16, 44, 44);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, lk.y + 16, 44, 44);
      x += 52;
    }
    x += 36;
  }

  // 宜、忌各前四项
  const yj = L.yiji;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(yj.x, yj.y - 16);
  ctx.lineTo(yj.x + yj.w, yj.y - 16);
  ctx.stroke();
  const colW = yj.w / 2;
  ([
    [c.yiLabel, c.yi, true],
    [c.jiLabel, c.ji, false],
  ] as const).forEach(([label, items], col) => {
    const cx = yj.x + col * colW;
    stamp(ctx, label, cx, yj.y + 10, 64, col === 0, display);
    items.slice(0, 4).forEach((item, i) => {
      ctx.fillStyle = INK;
      fitText(ctx, item, body, 36, colW - 110);
      ctx.fillText(item, cx + 90, yj.y + 50 + i * 60);
    });
  });

  // 今日签（可选）
  if (c.lot && L.lot) {
    const lt = L.lot;
    ctx.strokeStyle = CINNABAR;
    ctx.lineWidth = 2;
    ctx.strokeRect(lt.x, lt.y, lt.w, lt.h);
    ctx.fillStyle = CINNABAR;
    fitText(ctx, c.lot.title, body, 30, lt.w - 40);
    ctx.fillText(c.lot.title, lt.x + 20, lt.y + 40);
    ctx.fillStyle = INK;
    // 四句分两行：一、二句一行，三、四句一行
    const rows = [`${c.lot.poem[0]}，${c.lot.poem[1]}，`, `${c.lot.poem[2]}，${c.lot.poem[3]}。`];
    rows.forEach((row, i) => {
      fitText(ctx, row, body, 30, lt.w - 40);
      ctx.fillText(row, lt.x + 20, lt.y + 82 + i * 36);
    });
  }

  // 落款与二维码
  const ft = L.footer;
  ctx.fillStyle = CINNABAR;
  fitText(ctx, c.brand, display, 64, ft.w);
  ctx.fillText(c.brand, ft.x, ft.y + 60);
  ctx.fillStyle = INK_2;
  fitText(ctx, c.url, body, 26, ft.w);
  ctx.fillText(c.url, ft.x, ft.y + 104);
  const q = L.qr;
  const m = qrMatrix(c.qrUrl);
  const quiet = 2;
  const unit = Math.floor(q.w / (m.length + quiet * 2));
  const size = unit * (m.length + quiet * 2);
  const qx = q.x + Math.floor((q.w - size) / 2);
  const qy = q.y + Math.floor((q.h - size) / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qx, qy, size, size);
  ctx.fillStyle = INK;
  m.forEach((row, r) =>
    row.forEach((dark, col) => {
      if (dark) ctx.fillRect(qx + (col + quiet) * unit, qy + (r + quiet) * unit, unit, unit);
    }),
  );
  ctx.fillStyle = INK_2;
  ctx.font = `20px ${body}`;
  ctx.textAlign = "center";
  ctx.fillText(c.scanHint, q.x + q.w / 2, q.y + q.h + 28);
  ctx.textAlign = "left";
}

/** 二维码在图里的像素位置（测试用：从画好的图里截出来解码） */
export function qrPixelRect(url: string, withLot: boolean): Rect {
  const q = shareLayout(withLot).qr;
  const n = qrMatrix(url).length + 4;
  const unit = Math.floor(q.w / n);
  const size = unit * n;
  return { x: q.x + Math.floor((q.w - size) / 2), y: q.y + Math.floor((q.h - size) / 2), w: size, h: size };
}
