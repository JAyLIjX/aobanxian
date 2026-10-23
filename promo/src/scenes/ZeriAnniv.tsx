/**
 * 8. 择日与纪念日：左边择日（点「搬家」，列出 30 天里宜搬家、不忌搬家的日子；我的生肖设为猴，冲你的日子变灰、害你的标浅色），
 * 右边纪念日（妈妈的农历生日是九月十三，正好今天），道士冒气泡提醒。
 */
import { useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useScrollStops } from "../lib/useScrollStops";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { DAY, DETAIL, MY_ZODIAC, outfitOf } from "../lib/data";
import { Cursor } from "../lib/Cursor";
import { Desktop } from "../lib/Desktop";
import { PixelSprite } from "../lib/PixelSprite";
import { Place } from "../lib/Place";
import { i18nFor, Lang } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";
import { WindowFrame } from "../lib/WindowFrame";
import type { Anniversary } from "../../../src/calendar/anniversary";
import { BigBubble } from "../lib/BigBubble";
import { anniversaryTitle } from "../../../src/i18n/format";
import { getCharacter, voiceLine } from "../../../src/sprite/characters";
import { AnniversariesApp } from "../../../src/windows/AnniversariesApp";
import { ZeriApp } from "../../../src/windows/ZeriApp";

const t = i18nFor("zh-CN").t;
export const DEMO_ANNIVERSARIES: Anniversary[] = [
  { id: "mom", name: "妈妈", type: "birthday", calendar: "lunar", month: 9, day: 13, leap: false, repeat: true },
  { id: "wedding", name: "结婚纪念日", type: "anniversary", calendar: "solar", month: 11, day: 18, leap: false, repeat: true },
  { id: "dad", name: "爸爸", type: "birthday", calendar: "lunar", month: 12, day: 8, leap: false, repeat: true },
];

export function ZeriAnniv() {
  const frame = useCurrentFrame();
  // 列表滚到「冲你」那一天（变灰）
  const zeriRef = useRef<HTMLDivElement>(null);
  useScrollStops(zeriRef, ".zeri__list", [":top", ".zeri__day.is-clash"], [
    { frame: 0, target: 0 },
    { frame: localBeat("zeri", 6), target: 1 },
  ], 12, 330);
  const clickMove = localBeat("zeri", 1);
  const bubbleAt = localBeat("zeri", 4);
  const picked = frame >= clickMove;
  const line = voiceLine(getCharacter("daoshi"), "zh-CN", "anniversary", { name: anniversaryTitle(DEMO_ANNIVERSARIES[0], t) });
  return (
    <AbsoluteFill>
      <Desktop>
        <Lang lang="zh-CN">
          <Place x={40} y={60} zoom={1.12}>
            <div ref={zeriRef}>
            <WindowFrame title="择日" width={560} height={860} style={{ position: "relative" }}>
              <ZeriApp key={picked ? "move" : "first"} demo={{ today: DAY, myBranch: MY_ZODIAC, eventId: picked ? "move" : "travel" }} />
            </WindowFrame>
            </div>
          </Place>
          <Place x={700} y={60} zoom={1.12}>
            <WindowFrame title="纪念日" width={560} height={520} style={{ position: "relative" }}>
              <AnniversariesApp demo={{ today: DAY, list: DEMO_ANNIVERSARIES }} />
            </WindowFrame>
          </Place>
        </Lang>
        <div style={{ position: "absolute", left: 1560, top: 640 }}>
          <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={3} text="奥半仙" jumps={[bubbleAt]} />
          {frame >= bubbleAt && <BigBubble text={line} x={150} y={30} />}
        </div>
        <Cursor keys={[{ frame: 0, x: 600, y: 600 }, { frame: clickMove - 8, x: 180, y: 182 }, { frame: clickMove, x: 180, y: 182, click: true }, { frame: clickMove + 30, x: 300, y: 420 }]} />
      </Desktop>
      <Caption {...CAPTIONS.zeri} left={720} top={680} width={600} />
      <Sfx name="click" at={clickMove} />
    </AbsoluteFill>
  );
}
