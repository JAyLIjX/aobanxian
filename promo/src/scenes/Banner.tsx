/**
 * 3. 点幡换字：鼠标点幡，幡晃一下，字按软件的顺序换（宜事 → 忌事 → 吉色 → 吉生肖 → 合你），像素溶解过渡；
 * 镜头按整数倍一格一格推近幡面（像素不糊）。
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { bannerItemsOf, DETAIL, MY_ZODIAC, outfitOf } from "../lib/data";
import { Cursor, type CursorKey } from "../lib/Cursor";
import { Desktop } from "../lib/Desktop";
import { PixelSprite } from "../lib/PixelSprite";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";
import { getCharacter } from "../../../src/sprite/characters";

export function Banner() {
  const frame = useCurrentFrame();
  const items = bannerItemsOf(DETAIL, MY_ZODIAC);
  const clicks = [1, 3, 5, 7, 9].map((k) => localBeat("banner", k));
  let shown = 0;
  clicks.forEach((f, i) => {
    if (frame >= f) shown = i + 1;
  });
  const text = items[Math.min(shown, items.length - 1)].text;
  const prev = shown > 0 ? items[shown - 1].text : undefined;
  // 推近：每格 6 → 7 → 8 像素，按拍子一档一档推，幡面中心保持在同一点
  const cell = frame < localBeat("banner", 4) ? 6 : frame < localBeat("banner", 8) ? 7 : 8;
  const sprite = getCharacter("daoshi").data;
  const anchorX = 1260;
  const anchorY = 470;
  const bx = sprite.bannerFace.x + sprite.bannerFace.w / 2;
  const by = sprite.bannerFace.y + sprite.bannerFace.h / 2;
  const left = Math.round(anchorX - bx * cell);
  const top = Math.round(anchorY - by * cell);
  const keys: CursorKey[] = [{ frame: 0, x: 1650, y: 900 }, ...clicks.flatMap((f) => [{ frame: f - 6, x: anchorX + 4, y: anchorY + 10 }, { frame: f, x: anchorX + 4, y: anchorY + 10, click: true }])];
  return (
    <AbsoluteFill>
      <Desktop>
        <div style={{ position: "absolute", left, top }}>
          <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={cell} text={text} from={prev} changeAt={shown > 0 ? clicks[shown - 1] : undefined} sways={clicks} />
        </div>
        <Cursor keys={keys} />
      </Desktop>
      <Caption {...CAPTIONS.banner} />
      {clicks.map((f) => (
        <Sfx key={f} name="click" at={f} />
      ))}
    </AbsoluteFill>
  );
}
