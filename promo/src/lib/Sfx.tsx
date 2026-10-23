/** 音效（scripts/sfx.py 合成，在 audio/sfx/）：在第 at 帧响一下，音量低于背景音乐 */
import { Audio, Sequence, staticFile } from "remotion";

export type SfxName = "click" | "shake" | "drop" | "muyu" | "unroll" | "stamp" | "flip";

export function Sfx({ name, at, volume = 0.32 }: { name: SfxName; at: number; volume?: number }) {
  return (
    <Sequence from={at} durationInFrames={45} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
}
