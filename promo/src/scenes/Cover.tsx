/** B 站封面 1920×1200：「奥半仙」大字在上，道士居中（整数倍放大），下面「会看黄历的桌面小道士」 */
import { AbsoluteFill } from "remotion";
import { COVER } from "../captions";
import { DETAIL, outfitOf } from "../lib/data";
import { PixelSprite } from "../lib/PixelSprite";

export function Cover() {
  const cell = 6;
  return (
    <AbsoluteFill className="paper">
      <div style={{ position: "absolute", left: 0, right: 0, top: 50, textAlign: "center", font: "230px 'Promo Brush'", color: "#b83a2c", lineHeight: 1, letterSpacing: 30 }}>{COVER.title}</div>
      <div style={{ position: "absolute", left: 960 - Math.round((79 * cell) / 2) + 6 * cell, top: 330 }}>
        <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={cell} text="奥半仙" breathing={false} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, textAlign: "center", font: "70px 'Promo Kai'", color: "#2a2420", letterSpacing: 12 }}>{COVER.subtitle}</div>
    </AbsoluteFill>
  );
}
