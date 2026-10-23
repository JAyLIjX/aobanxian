/** 软件的对话气泡（src/components/Bubble），按 zoom 放大，坐标是画面上的像素 */
import { Bubble } from "../../../src/components/Bubble";

export function BigBubble({ text, x, y, zoom = 2.2, maxWidth = 240 }: { text: string; x: number; y: number; zoom?: number; maxWidth?: number }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zoom }}>
      <Bubble text={text} x={x / zoom} y={y / zoom} side="above-left" maxWidth={maxWidth} />
    </div>
  );
}
