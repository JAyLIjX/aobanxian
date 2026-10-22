import { useCallback, useEffect, useRef, useState } from "react";
import { loadSettings, onSettingsChanged, saveSettings } from "./store";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

/** 读取设置并订阅其他窗口的改动；update 立即生效并存盘 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(settings);

  const apply = useCallback((s: Settings) => {
    current.current = s;
    setSettings(s);
  }, []);

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => {
      if (!alive) return;
      apply(s);
      setLoaded(true);
    });
    const off = onSettingsChanged(apply);
    return () => {
      alive = false;
      off();
    };
  }, [apply]);

  const update = useCallback(
    async (next: Settings | ((prev: Settings) => Settings)) => {
      const value = typeof next === "function" ? next(current.current) : next;
      apply(value);
      await saveSettings(value);
    },
    [apply],
  );

  return { settings, loaded, update };
}
