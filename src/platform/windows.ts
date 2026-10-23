/**
 * 打开独立的普通窗口（设置、关于、择日、纪念日……）。窗口已经开着就拿到前面来。
 * 所有窗口共用同一个页面，用 ?view= 区分。
 */
import { emit, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { Ymd } from "../core/dayBoundary";
import { inTauri } from "./window";

export type ViewName = "settings" | "about" | "zeri" | "anniversaries" | "lots" | "gua" | "share" | "update";

export const WINDOW_SIZES: Record<ViewName, { width: number; height: number; resizable: boolean }> = {
  settings: { width: 560, height: 600, resizable: true },
  about: { width: 420, height: 460, resizable: false },
  zeri: { width: 560, height: 640, resizable: true },
  anniversaries: { width: 560, height: 640, resizable: true },
  lots: { width: 440, height: 620, resizable: true },
  gua: { width: 520, height: 680, resizable: true },
  share: { width: 520, height: 760, resizable: true },
  update: { width: 460, height: 420, resizable: true },
};

export function openView(view: ViewName, title: string): void {
  if (!inTauri) {
    window.open(`?view=${view}`, view);
    return;
  }
  void (async () => {
    const existing = await WebviewWindow.getByLabel(view);
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const { width, height, resizable } = WINDOW_SIZES[view];
    new WebviewWindow(view, { url: `index.html?view=${view}`, title, width, height, resizable, center: true, focus: true });
  })();
}

const OPEN_DETAIL = "open-detail";

/** 其他窗口（择日、纪念日）请主窗口打开某一天的详情 */
export async function requestOpenDetail(ymd: Ymd): Promise<void> {
  if (!inTauri) return;
  await emit(OPEN_DETAIL, ymd);
  const main = await WebviewWindow.getByLabel("main");
  await main?.setFocus();
}

export function onOpenDetailRequest(cb: (ymd: Ymd) => void): () => void {
  if (!inTauri) return () => {};
  const un = listen<Ymd>(OPEN_DETAIL, (e) => cb(e.payload));
  return () => void un.then((f) => f());
}

const SAY = "say";

/** 其他窗口请道士说一句话（主窗口头顶冒气泡）；传语言文件里的键，主窗口按自己的语言显示 */
export async function requestSay(key: string): Promise<void> {
  if (inTauri) await emit(SAY, key);
}

export function onSayRequest(cb: (key: string) => void): () => void {
  if (!inTauri) return () => {};
  const un = listen<string>(SAY, (e) => cb(e.payload));
  return () => void un.then((f) => f());
}
