/**
 * 对 Tauri 窗口接口的薄封装。在普通浏览器里（npm run dev 直接打开）这些调用什么都不做，
 * 方便单独调界面。
 */
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function resizeWindow(width: number, height: number): void {
  if (!inTauri) return;
  getCurrentWindow()
    .setSize(new LogicalSize(width, height))
    .catch((err) => console.error("调整窗口大小失败", err));
}

export function startWindowDrag(): void {
  if (!inTauri) return;
  getCurrentWindow()
    .startDragging()
    .catch((err) => console.error("拖动窗口失败", err));
}

/**
 * 让窗口成为焦点窗口。窗口开了 acceptFirstMouse，点击时不会自动获得焦点，
 * 不主动拿焦点的话收不到 Esc，点别处时也不会触发失焦收起。
 */
export function focusWindow(): void {
  if (!inTauri || document.hasFocus()) return;
  getCurrentWindow()
    .setFocus()
    .catch((err) => console.error("窗口获取焦点失败", err));
}
