/** 1. 开场：宣纸底，「奥半仙」盖章般落下，副标题，像素道士从下方探出头 */
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { OPENING } from "../captions";
import { DETAIL, outfitOf } from "../lib/data";
import { PixelSprite } from "../lib/PixelSprite";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";

export function Opening() {
  const frame = useCurrentFrame();
  const stampAt = localBeat("opening", 1);
  const subAt = localBeat("opening", 3);
  const peekFrom = localBeat("opening", 4);
  const peekTo = localBeat("opening", 6);
  // 盖章：从 1.7 倍、半透明落到 1 倍，3 帧内按下，再回弹一点
  const s = frame < stampAt ? 0 : interpolate(frame - stampAt, [0, 3, 5, 7], [1.7, 0.96, 1.02, 1], { extrapolateRight: "clamp" });
  const stampOpacity = frame < stampAt ? 0 : interpolate(frame - stampAt, [0, 3], [0.2, 1], { extrapolateRight: "clamp" });
  const subOpacity = interpolate(frame, [subAt, subAt + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cell = 5;
  const spriteH = 115 * cell;
  // 探头：按整格往上冒，露出头和幡顶
  const shown = Math.round(interpolate(frame, [peekFrom, peekTo], [0, 46], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) * cell;
  return (
    <AbsoluteFill className="paper" style={{ alignItems: "center" }}>
      <div style={{ position: "absolute", top: 210, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            transform: `scale(${s})`,
            opacity: stampOpacity,
            font: "220px 'Promo Brush'",
            color: "#b83a2c",
            lineHeight: 1,
            padding: "18px 46px 26px",
            border: "10px solid #b83a2c",
            borderRadius: 14,
            letterSpacing: 12,
          }}
        >
          {OPENING.title}
        </div>
        <div style={{ opacity: subOpacity, marginTop: 40, font: "54px 'Promo Kai'", color: "#2a2420", letterSpacing: 6 }}>{OPENING.subtitle}</div>
        <div style={{ opacity: subOpacity, marginTop: 10, font: "28px 'Promo Garamond'", color: "rgba(42,36,32,0.6)" }}>{OPENING.en}</div>
      </div>
      <div style={{ position: "absolute", left: 960 - (79 * cell) / 2, top: 1080 - shown, height: shown, overflow: "hidden" }}>
        <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={cell} text="奥半仙" breathing={false} style={{ height: spriteH }} />
      </div>
      <Sfx name="stamp" at={stampAt} volume={0.5} />
    </AbsoluteFill>
  );
}
