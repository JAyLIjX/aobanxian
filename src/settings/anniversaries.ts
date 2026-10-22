/**
 * 纪念日列表的读写与跨窗口同步。和设置存在同一个 store 文件（anniversaries 键），只存在本机。
 */
import { emit, listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeAnniversaries, type Anniversary } from "../calendar/anniversary";
import { inTauri } from "../platform/window";
import { getState, setState } from "./store";

const KEY = "anniversaries";
const EVENT = "anniversaries-changed";

export async function loadAnniversaries(): Promise<Anniversary[]> {
  return sanitizeAnniversaries(await getState<unknown>(KEY));
}

export async function saveAnniversaries(list: Anniversary[]): Promise<void> {
  await setState(KEY, list);
  if (inTauri) await emit(EVENT, list);
  else window.dispatchEvent(new CustomEvent(EVENT, { detail: list }));
}

function onAnniversariesChanged(cb: (list: Anniversary[]) => void): () => void {
  if (inTauri) {
    const un = listen<unknown>(EVENT, (e) => cb(sanitizeAnniversaries(e.payload)));
    return () => void un.then((f) => f());
  }
  const handler = (e: Event) => cb((e as CustomEvent<Anniversary[]>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function newAnniversaryId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 读取纪念日并订阅其他窗口的改动；save 立即生效并存盘 */
export function useAnniversaries() {
  const [list, setList] = useState<Anniversary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(list);
  useEffect(() => {
    let alive = true;
    void loadAnniversaries().then((l) => {
      if (!alive) return;
      current.current = l;
      setList(l);
      setLoaded(true);
    });
    const off = onAnniversariesChanged((l) => {
      current.current = l;
      setList(l);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);
  const save = useCallback(async (next: Anniversary[] | ((prev: Anniversary[]) => Anniversary[])) => {
    const value = typeof next === "function" ? next(current.current) : next;
    current.current = value;
    setList(value);
    await saveAnniversaries(value);
  }, []);
  return { list, loaded, save };
}

/** 导出文件的格式 */
export function exportPayload(list: Anniversary[]) {
  return { app: "aobanxian", kind: "anniversaries", version: 1, anniversaries: list };
}

/** 导入：接受导出文件或直接一个数组；同 id 的覆盖，新的追加 */
export function mergeImported(current: Anniversary[], json: unknown): { list: Anniversary[]; count: number } {
  const raw = Array.isArray(json) ? json : (json as { anniversaries?: unknown } | null)?.anniversaries;
  const incoming = sanitizeAnniversaries(raw);
  const byId = new Map(current.map((a) => [a.id, a]));
  for (const a of incoming) byId.set(a.id, a);
  return { list: [...byId.values()], count: incoming.length };
}
