/**
 * 功德累计数的读写与跨窗口同步（主窗口敲木鱼，设置窗口显示）。存在 store 的 merit 键，只在本机。
 */
import { emit, listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { addMerit, sanitizeMerit } from "../core/merit";
import { inTauri } from "../platform/window";
import { getState, setState } from "./store";

const KEY = "merit";
const EVENT = "merit-changed";

export async function loadMerit(): Promise<number> {
  return sanitizeMerit(await getState<unknown>(KEY));
}

/** 敲一下：加一、存盘、通知其他窗口；返回新的累计数 */
export async function knockMerit(n = 1): Promise<number> {
  const next = addMerit(await loadMerit(), n);
  await setState(KEY, next);
  if (inTauri) await emit(EVENT, next).catch(() => {});
  else if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  return next;
}

export function useMerit(): number {
  const [merit, setMerit] = useState(0);
  useEffect(() => {
    void loadMerit().then(setMerit);
    if (inTauri) {
      const un = listen<number>(EVENT, (e) => setMerit(sanitizeMerit(e.payload)));
      return () => void un.then((f) => f());
    }
    const handler = (e: Event) => setMerit(sanitizeMerit((e as CustomEvent<number>).detail));
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return merit;
}
