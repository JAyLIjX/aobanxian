/**
 * 窗口布局：卷轴卡片放在哪、窗口该多大。纯函数，坐标都是屏幕上的逻辑像素。
 *
 * - 道士在屏幕上的位置始终不变，窗口围绕它伸缩
 * - 卡片水平方向以幡为中心；默认放在道士下方，下面放不下就放上方，
 *   上下都放不下就放在空间大的一侧并压回屏幕内
 * - 靠近屏幕边缘时卡片整体往屏幕内收，不超出屏幕
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

/** 道士周围给气泡、闪光粒子、翻译小气泡留的空白 */
export interface Chrome {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface PanelPlacement {
  rect: Rect;
  direction: "down" | "up";
}

export function placePanel(opts: {
  work: Rect;
  sprite: Rect;
  bannerCenterX: number;
  panel: Size;
  gap: number;
  margin: number;
}): PanelPlacement {
  const { work, sprite, bannerCenterX, panel, gap, margin } = opts;
  const minX = work.x + margin;
  const maxX = work.x + work.w - margin - panel.w;
  const x = Math.round(maxX < minX ? minX : clamp(bannerCenterX - panel.w / 2, minX, maxX));

  const minY = work.y + margin;
  const maxY = work.y + work.h - margin - panel.h;
  const below = sprite.y + sprite.h + gap;
  const above = sprite.y - gap - panel.h;

  if (below <= maxY) return { rect: { x, y: below, w: panel.w, h: panel.h }, direction: "down" };
  if (above >= minY) return { rect: { x, y: above, w: panel.w, h: panel.h }, direction: "up" };

  // 上下都放不下：放在空间大的一侧，压回屏幕内（这时会和道士重叠）
  const spaceBelow = work.y + work.h - (sprite.y + sprite.h);
  const spaceAbove = sprite.y - work.y;
  const direction = spaceBelow >= spaceAbove ? "down" : "up";
  const y = Math.round(maxY < minY ? minY : clamp(direction === "down" ? below : above, minY, maxY));
  return { rect: { x, y, w: panel.w, h: panel.h }, direction };
}

export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export function expand(r: Rect, c: Chrome): Rect {
  return { x: r.x - c.left, y: r.y - c.top, w: r.w + c.left + c.right, h: r.h + c.top + c.bottom };
}

/** 窗口 = 道士（含四周空白）∪ 卡片 */
export function windowRect(sprite: Rect, chrome: Chrome, panel?: Rect): Rect {
  const frame = expand(sprite, chrome);
  return panel ? union(frame, panel) : frame;
}

/** 把屏幕坐标换算成窗口内坐标 */
export function toLocal(r: Rect, win: Rect): Rect {
  return { x: r.x - win.x, y: r.y - win.y, w: r.w, h: r.h };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * 书写物本身就是卷轴（青天大老爷的告示）：卡片的上木轴对齐告示的上边、以告示为中心向下展开，
 * 把告示整个盖住（告示后面的原画没有衣服，藏起告示会露出一个洞）。人的头和帽子露在外面，点它们收起。
 * 屏幕下方放不下时整体往上推，仍然盖住告示；左右贴边时压回屏幕内。
 */
export function placeOverWriting(opts: { work: Rect; writing: Rect; panel: Size; margin: number }): PanelPlacement {
  const { work, writing, panel, margin } = opts;
  const minX = work.x + margin;
  const maxX = work.x + work.w - margin - panel.w;
  const x = Math.round(maxX < minX ? minX : clamp(writing.x + writing.w / 2 - panel.w / 2, minX, maxX));
  const minY = work.y + margin;
  const maxY = work.y + work.h - margin - panel.h;
  const y = Math.round(maxY < minY ? minY : clamp(writing.y, minY, maxY));
  return { rect: { x, y, w: panel.w, h: panel.h }, direction: "down" };
}
