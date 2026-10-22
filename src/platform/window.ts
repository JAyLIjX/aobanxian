/**
 * 对 Tauri 窗口接口的薄封装。在普通浏览器里（npm run dev 直接打开）这些调用什么都不做，
 * 方便单独调界面。
 */
import { invoke } from "@tauri-apps/api/core";
import { availableMonitors, getCurrentWindow } from "@tauri-apps/api/window";
import type { Rect } from "../core/layout";

export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function report(what: string) {
  return (err: unknown) => console.error(`${what}失败`, err);
}

export function startWindowDrag(): void {
  if (!inTauri) return;
  getCurrentWindow().startDragging().catch(report("拖动窗口"));
}

/**
 * 让窗口成为焦点窗口。窗口开了 acceptFirstMouse，点击时不会自动获得焦点，
 * 不主动拿焦点的话收不到 Esc，点别处时也不会触发失焦收起。
 */
export function focusWindow(): void {
  // 不能用 document.hasFocus() 判断：acceptFirstMouse 下网页可能以为自己有焦点，窗口其实不是焦点窗口
  if (!inTauri) return;
  getCurrentWindow().setFocus().catch(report("窗口获取焦点"));
}

/** 一次设好窗口位置和大小（逻辑像素） */
export async function setWindowRect(r: Rect): Promise<void> {
  if (!inTauri) return;
  await invoke("set_window_rect", { x: r.x, y: r.y, w: r.w, h: r.h }).catch(report("调整窗口"));
}

export async function showWindow(): Promise<void> {
  if (!inTauri) return;
  await getCurrentWindow().show().catch(report("显示窗口"));
}

/** 置顶，或像桌面小组件一样待在其他窗口下面 */
export async function setOnTop(onTop: boolean): Promise<void> {
  if (!inTauri) return;
  const w = getCurrentWindow();
  if (onTop) {
    await w.setAlwaysOnBottom(false);
    await w.setAlwaysOnTop(true);
  } else {
    await w.setAlwaysOnTop(false);
    await w.setAlwaysOnBottom(true);
  }
}

/** 窗口左上角的屏幕位置（逻辑像素） */
export async function windowPosition(): Promise<{ x: number; y: number } | null> {
  if (!inTauri) return null;
  const w = getCurrentWindow();
  const [pos, scale] = await Promise.all([w.outerPosition(), w.scaleFactor()]);
  return { x: pos.x / scale, y: pos.y / scale };
}

export function onWindowMoved(cb: () => void): () => void {
  if (!inTauri) return () => {};
  const un = getCurrentWindow().onMoved(cb);
  return () => void un.then((f) => f());
}

/** 屏幕可用区域（去掉菜单栏、任务栏，逻辑像素）。返回包含给定点的那块屏幕 */
export async function workAreaAt(x: number, y: number): Promise<Rect> {
  const fallback = { x: 0, y: 0, w: window.screen.availWidth || 1440, h: window.screen.availHeight || 900 };
  if (!inTauri) return fallback;
  try {
    const monitors = await availableMonitors();
    const areas = monitors.map((m) => {
      const s = m.scaleFactor;
      const wa = m.workArea ?? { position: m.position, size: m.size };
      return { x: wa.position.x / s, y: wa.position.y / s, w: wa.size.width / s, h: wa.size.height / s };
    });
    return areas.find((a) => x >= a.x && y >= a.y && x < a.x + a.w && y < a.y + a.h) ?? areas[0] ?? fallback;
  } catch {
    return fallback;
  }
}

export interface HitMask {
  x: number;
  y: number;
  cell: number;
  rows: string[];
}

/** 告诉 Rust 端哪些区域能点（其余透明处点穿到桌面） */
export function setHitRegions(regions: { all?: boolean; rects: [number, number, number, number][]; masks: HitMask[] }): void {
  if (!inTauri) return;
  invoke("set_hit_regions", { regions }).catch(report("设置点击区域"));
}

export function quitApp(): void {
  if (!inTauri) return;
  invoke("quit_app").catch(report("退出"));
}
