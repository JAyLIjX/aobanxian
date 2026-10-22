import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { startWindowDrag } from "../platform/window";

/** 按下后移动超过这么多像素算拖动，否则松开时算点击 */
const DRAG_THRESHOLD = 4;

/**
 * 同一个元素既能点击、又能按住拖动整个窗口。
 * 按下时只记录位置；移动超过 4 像素才交给系统拖动窗口，没动就在松开时当作点击。
 * 键盘（Enter / 空格）也会触发点击。
 */
export function useDragOrClick(onClick: () => void) {
  const pending = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      pending.current = { x: e.screenX, y: e.screenY };

      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      };
      const onMove = (ev: globalThis.PointerEvent) => {
        const start = pending.current;
        if (!start) return;
        if (Math.hypot(ev.screenX - start.x, ev.screenY - start.y) > DRAG_THRESHOLD) {
          pending.current = null;
          cleanup();
          // 交给系统拖动后，这次按键的松开事件不会再回到网页里
          startWindowDrag();
        }
      };
      const onUp = () => {
        const wasClick = pending.current !== null;
        pending.current = null;
        cleanup();
        if (wasClick) onClick();
      };
      const onCancel = () => {
        pending.current = null;
        cleanup();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    },
    [onClick],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  return { onPointerDown, onKeyDown };
}
