/** 12. 结尾：「奥半仙」大字、「免费开源 · macOS / Windows」、仓库地址、指向最新版下载页的二维码、一行小字 */
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ENDING } from "../captions";
import { DETAIL, outfitOf, REPOSITORY } from "../lib/data";
import { PixelSprite } from "../lib/PixelSprite";
import { Qr } from "../lib/Qr";
import { localBeat } from "../lib/timing";
import { latestReleaseUrl } from "../../../src/share/shareImage";

export function Ending() {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const b = interpolate(frame, [localBeat("ending", 2), localBeat("ending", 2) + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="paper">
      <div style={{ position: "absolute", left: 220, top: 230, opacity: a }}>
        <div style={{ font: "200px 'Promo Brush'", color: "#b83a2c", lineHeight: 1, letterSpacing: 10 }}>{ENDING.title}</div>
        <div style={{ font: "50px 'Promo Kai'", color: "#2a2420", marginTop: 34 }}>{ENDING.line}</div>
        <div style={{ font: "34px 'Promo Garamond'", color: "rgba(42,36,32,0.75)", marginTop: 18, opacity: b }}>{REPOSITORY.replace("https://", "")}</div>
        <div style={{ font: "26px 'Promo Garamond'", color: "rgba(42,36,32,0.55)", marginTop: 10, opacity: b }}>{ENDING.en}</div>
      </div>
      <div style={{ position: "absolute", left: 1290, top: 250, opacity: b, textAlign: "center" }}>
        <div style={{ padding: 14, background: "#fff", border: "3px solid #2a2420", boxShadow: "8px 8px 0 rgba(42,36,32,0.18)" }}>
          <Qr text={latestReleaseUrl(REPOSITORY)} size={300} />
        </div>
        <div style={{ font: "34px 'Promo Kai'", color: "#2a2420", marginTop: 16 }}>{ENDING.scan}</div>
      </div>
      <div style={{ position: "absolute", left: 1690, top: 640 }}>
        <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={3} text="奥半仙" />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, textAlign: "center", font: "30px 'Promo Kai'", color: "rgba(42,36,32,0.6)", opacity: a }}>{ENDING.foot}</div>
    </AbsoluteFill>
  );
}
