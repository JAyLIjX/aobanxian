/**
 * 8. 择日与纪念日：左边择日（点「搬家」，列出 30 天里宜搬家、不忌搬家的日子；我的生肖设为猴，冲你的日子变灰、害你的标浅色），
 * 推近择日列表里标「黄道」「害你」的几行，拉回。
 * 右边纪念日（6 个示例，见 lib/anniv.ts）。软件只在纪念日当天提醒，所以画面翻到 2027 年 1 月 2 日（好友的生日）：
 * 菜单栏的日期、纪念日窗口一起换到那天，择日窗口淡出，道士冒气泡「今日是好友的生日」，推近气泡和道士，拉回。
 */
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { ANNIV_CLOCK_DAY, ANNIV_TODAY, DEMO_ANNIVERSARIES } from "../lib/anniv";
import { BigBubble } from "../lib/BigBubble";
import { Camera } from "../lib/Camera";
import { Caption } from "../lib/Caption";
import { Cursor } from "../lib/Cursor";
import { DAY, DETAIL, MY_ZODIAC, outfitOf } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { PixelSprite } from "../lib/PixelSprite";
import { Place } from "../lib/Place";
import { i18nFor, Lang } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { clockText, WINDOW_TITLES } from "../lib/text";
import { localBeatF } from "../lib/timing";
import { WindowFrame } from "../lib/WindowFrame";
import { anniversaryTitle } from "../../../src/i18n/format";
import { getCharacter, voiceLine } from "../../../src/sprite/characters";
import { AnniversariesApp } from "../../../src/windows/AnniversariesApp";
import { ZeriApp } from "../../../src/windows/ZeriApp";

const t = i18nFor("zh-CN").t;
const b = (k: number) => localBeatF("zeri", k);
/** 道士的位置和格子大小；推近时镜头按 2 倍放大，正好是整数倍 */
const SPRITE = { x: 1560, y: 640, cell: 3 };
/** 择日列表里推近的几行：标「害你」的那一行和它上面一行（10 月 26 日黄道、28 日黄道 + 害你） */
const ZERI_ROWS = ".zeri__list li:has(.tag--soft), .zeri__list li:has(+ li .tag--soft)";

export function ZeriAnniv() {
  const frame = useCurrentFrame();
  const clickMove = b(1);
  const flipAt = b(5.6);
  const bubbleAt = b(6.4);
  const picked = frame >= clickMove;
  const flipped = frame >= flipAt;
  const zeriFade = interpolate(frame, [flipAt - 8, flipAt], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = voiceLine(getCharacter("daoshi"), "zh-CN", "anniversary", { name: anniversaryTitle(ANNIV_TODAY, t) });
  return (
    <AbsoluteFill>
      <Camera
        keys={[
          { frame: 0 },
          { frame: b(2.6), target: ZERI_ROWS, dest: [80, 60, 1760, 560] },
          { frame: b(5), target: null },
          { frame: b(8.2), target: ".bubble, .promo-anniv-head", scale: 2, dest: [1080, 40, 820, 560] },
          { frame: b(11.4), target: null },
        ]}
      >
        <Desktop clock={clockText(flipped ? ANNIV_CLOCK_DAY : DAY)}>
          <Lang lang="zh-CN">
            {zeriFade > 0 && (
              <Place x={40} y={60} zoom={1.12}>
                <WindowFrame title={WINDOW_TITLES.zeri} width={560} height={860} style={{ position: "relative", opacity: zeriFade }}>
                  <ZeriApp key={picked ? "move" : "first"} demo={{ today: DAY, myBranch: MY_ZODIAC, eventId: picked ? "move" : "travel" }} />
                </WindowFrame>
              </Place>
            )}
            {/* 6 个纪念日都放得下，窗口底边在字幕框上面 */}
            <Place x={700} y={60} zoom={1}>
              <WindowFrame title={WINDOW_TITLES.anniversaries} width={560} height={606} style={{ position: "relative" }}>
                <AnniversariesApp key={flipped ? "flip" : "today"} demo={{ today: flipped ? ANNIV_CLOCK_DAY : DAY, list: DEMO_ANNIVERSARIES }} />
              </WindowFrame>
            </Place>
          </Lang>
          <div style={{ position: "absolute", left: SPRITE.x, top: SPRITE.y }}>
            <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={SPRITE.cell} text="奥半仙" jumps={[bubbleAt]} />
            {/* 推镜头的目标：道士的头和上身 */}
            <div className="promo-anniv-head" style={{ position: "absolute", left: 0, top: 0, width: 79 * SPRITE.cell, height: 75 * SPRITE.cell, pointerEvents: "none" }} />
            {frame >= bubbleAt && <BigBubble text={line} x={150} y={30} />}
          </div>
          <Cursor keys={[{ frame: 0, x: 600, y: 600 }, { frame: clickMove - 8, x: 178, y: 126 }, { frame: clickMove, x: 178, y: 126, click: true }, { frame: clickMove + 24, x: 690, y: 1000 }]} />
        </Desktop>
      </Camera>
      <Caption {...CAPTIONS.zeri} left={720} top={680} width={600} />
      <Sfx name="click" at={clickMove} />
      <Sfx name="flip" at={flipAt - 8} volume={0.4} />
    </AbsoluteFill>
  );
}
