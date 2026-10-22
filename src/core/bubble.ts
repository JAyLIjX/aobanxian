/**
 * 气泡计时：显示一段时间后自动消失；还在显示时再次触发就重新计时。
 */
export interface BubbleController {
  show(text: string, seconds: number): void;
  hide(): void;
  dispose(): void;
}

export function createBubble(onChange: (text: string | null) => void): BubbleController {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => {
    clearTimeout(timer);
    timer = undefined;
    onChange(null);
  };
  return {
    show(text, seconds) {
      clearTimeout(timer);
      onChange(text);
      timer = setTimeout(hide, seconds * 1000);
    },
    hide,
    dispose() {
      clearTimeout(timer);
    },
  };
}
