/**
 * 像素道士精灵图：数据结构与换色渲染。纯函数，不依赖浏览器，测试里可以直接用。
 *
 * 精灵数据由 scripts/process-sprite.py 生成（src/assets/sprite/daoshi.json）：
 *   base     每格一个字符，指向 palette 里的底层颜色；"." 表示透明或换色区域
 *   regions  每格一个字符，a/b/c = 道袍 暗/中/亮，x/y/z = 腰带 暗/中/亮，"." = 不换色
 */
import spriteJson from "../assets/sprite/daoshi.json";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RegionName = "robe" | "sash";

export interface SpriteData {
  width: number;
  height: number;
  palette: string[];
  alphabet: string;
  base: string[];
  regionCodes: Record<string, [RegionName, number]>;
  regions: string[];
  /** 幡面米白空白处（印字） */
  bannerFace: Rect;
  /** 整面幡的外接矩形：宝珠、上下木轴、红框、幡面、旗杆上半段（卷轴动画定位用） */
  banner: Rect;
  /** 整面幡的形状，相对 banner 矩形，'1' 表示属于幡（点击判定、展开时隐藏用） */
  bannerMask: string[];
  /** 道士头顶所在的行（气泡放在它上面） */
  headTop: number;
}

export const sprite = spriteJson as unknown as SpriteData;

/** 三档颜色（暗、中、亮），#RRGGBB */
export type Ramp = [string, string, string];

export interface Outfit {
  robe: Ramp;
  sash: Ramp;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 某格是否属于整面幡 */
export function inBanner(data: SpriteData, x: number, y: number): boolean {
  const b = data.banner;
  if (!inRect(b, x, y)) return false;
  return data.bannerMask[y - b.y][x - b.x] === "1";
}

/**
 * 按格渲染成 RGBA（width × height，每格一个像素）。
 * hideBanner：整面幡不画（身体层、展开成卷轴时）；onlyBanner：只画整面幡（幡层）。
 */
export function renderSprite(data: SpriteData, outfit: Outfit, opts: { hideBanner?: boolean; onlyBanner?: boolean } = {}): Uint8ClampedArray {
  const { width, height } = data;
  const out = new Uint8ClampedArray(width * height * 4);
  const basePalette = data.palette.map(hexToRgb);
  const ramps = { robe: outfit.robe.map(hexToRgb), sash: outfit.sash.map(hexToRgb) };

  for (let y = 0; y < height; y++) {
    const baseRow = data.base[y];
    const regionRow = data.regions[y];
    for (let x = 0; x < width; x++) {
      if (opts.hideBanner || opts.onlyBanner) {
        const banner = inBanner(data, x, y);
        if ((opts.hideBanner && banner) || (opts.onlyBanner && !banner)) continue;
      }
      const r = regionRow[x];
      let rgb: [number, number, number] | undefined;
      if (r !== ".") {
        const [name, level] = data.regionCodes[r];
        rgb = ramps[name][level];
      } else if (baseRow[x] !== ".") {
        rgb = basePalette[data.alphabet.indexOf(baseRow[x])];
      }
      if (!rgb) continue;
      const i = (y * width + x) * 4;
      out[i] = rgb[0];
      out[i + 1] = rgb[1];
      out[i + 2] = rgb[2];
      out[i + 3] = 255;
    }
  }
  return out;
}

/** 某格是否不透明（底层或换色区域有像素） */
export function isOpaque(data: SpriteData, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= data.width || y >= data.height) return false;
  return data.base[y][x] !== "." || data.regions[y][x] !== ".";
}

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export type HitPart = "banner" | "body" | null;

/** 按格判断点击落在哪：幡的像素算幡，其他不透明像素算人，透明处为 null */
export function hitTest(data: SpriteData, x: number, y: number): HitPart {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (!isOpaque(data, cx, cy)) return null;
  return inBanner(data, cx, cy) ? "banner" : "body";
}
