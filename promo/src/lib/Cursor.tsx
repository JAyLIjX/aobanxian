/**
 * 代码画的鼠标指针：按关键帧平滑移动（缓入缓出），点击时缩一下并扩散一圈小涟漪。
 */
import { Easing, interpolate, useCurrentFrame } from "remotion";

export interface CursorKey {
  frame: number;
  x: number;
  y: number;
  click?: boolean;
}

export function cursorAt(keys: CursorKey[], frame: number): { x: number; y: number } {
  if (frame <= keys[0].frame) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.frame) {
      const t = interpolate(frame, [a.frame, b.frame], [0, 1], { easing: Easing.inOut(Easing.cubic) });
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return keys[keys.length - 1];
}

export function Cursor({ keys, hideBefore = -1, hideAfter = Infinity }: { keys: CursorKey[]; hideBefore?: number; hideAfter?: number }) {
  const frame = useCurrentFrame();
  if (frame < hideBefore || frame > hideAfter) return null;
  const { x, y } = cursorAt(keys, frame);
  const clicks = keys.filter((k) => k.click);
  const press = clicks.some((k) => frame >= k.frame && frame < k.frame + 4);
  return (
    <>
      {clicks.map((k) => {
        const dt = frame - k.frame;
        if (dt < 0 || dt > 14) return null;
        const r = 6 + dt * 2.4;
        return (
          <div
            key={k.frame}
            style={{
              position: "absolute",
              left: k.x - r,
              top: k.y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: "3px solid rgba(184, 58, 44, 0.85)",
              opacity: 1 - dt / 14,
              zIndex: 99,
            }}
          />
        );
      })}
      <svg
        width="34"
        height="44"
        viewBox="0 0 34 44"
        style={{ position: "absolute", left: x - 3, top: y - 2, zIndex: 100, transform: `scale(${press ? 0.86 : 1})`, transformOrigin: "3px 2px", filter: "drop-shadow(1px 3px 3px rgba(0,0,0,0.35))" }}
      >
        <path d="M3 2 L3 34 L11 26 L17 40 L23 37 L17 24 L28 24 Z" fill="#fff" stroke="#2a2420" strokeWidth="2.4" strokeLinejoin="round" />
      </svg>
    </>
  );
}
