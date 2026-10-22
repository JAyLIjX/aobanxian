/**
 * 设置的读写与跨窗口同步。
 * Tauri 里存在应用数据目录的 settings.json（tauri-plugin-store），只存改过的项；
 * 普通浏览器里（npm run dev 直接打开）退回 localStorage，方便调界面。
 */
import { emit, listen } from "@tauri-apps/api/event";
import { load, type Store } from "@tauri-apps/plugin-store";
import { inTauri } from "../platform/window";
import { DEFAULT_SETTINGS, diffFromDefaults, mergeSettings, type Settings } from "./settings";

const FILE = "settings.json";
const KEY = "settings";
const EVENT = "settings-changed";

let storePromise: Promise<Store> | null = null;
function getStore(): Promise<Store> {
  storePromise ??= load(FILE, { autoSave: false, defaults: {} });
  return storePromise;
}

export async function loadSettings(): Promise<Settings> {
  try {
    if (inTauri) {
      const store = await getStore();
      return mergeSettings((await store.get<Record<string, unknown>>(KEY)) ?? {});
    }
    return mergeSettings(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
  } catch (err) {
    console.error("读取设置失败，使用默认值", err);
    return { ...DEFAULT_SETTINGS };
  }
}

/** 保存完整设置（只写改过的项），并通知所有窗口 */
export async function saveSettings(settings: Settings): Promise<void> {
  const diff = diffFromDefaults(settings);
  if (inTauri) {
    const store = await getStore();
    await store.set(KEY, diff);
    await store.save();
    await emit(EVENT, settings);
  } else {
    localStorage.setItem(KEY, JSON.stringify(diff));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: settings }));
  }
}

export function onSettingsChanged(cb: (s: Settings) => void): () => void {
  if (inTauri) {
    const un = listen<Settings>(EVENT, (e) => cb(mergeSettings(e.payload as unknown as Record<string, unknown>)));
    return () => void un.then((f) => f());
  }
  const handler = (e: Event) => cb((e as CustomEvent<Settings>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** 不属于设置、但要跨重启保存的小状态：道士位置、今天是否已说过开场白 */
export async function getState<T>(key: string): Promise<T | undefined> {
  try {
    if (inTauri) return (await (await getStore()).get<T>(key)) ?? undefined;
    const raw = localStorage.getItem(`state:${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export async function setState<T>(key: string, value: T): Promise<void> {
  try {
    if (inTauri) {
      const store = await getStore();
      await store.set(key, value);
      await store.save();
    } else {
      localStorage.setItem(`state:${key}`, JSON.stringify(value));
    }
  } catch (err) {
    console.error("保存状态失败", err);
  }
}
