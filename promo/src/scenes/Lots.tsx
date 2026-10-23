/**
 * 6. 求签：道士双手捧着签筒（软件里的像素签筒，牌子上写「签」）摇晃，掉出一支签落在他脚边，
 * 签纸展开（签号、签等、签诗、白话总解）；推近签诗，拉回；滚到典故故事，推近故事开头，拉回。
 * 签号用软件的 lotOfDay（固定种子），签纸是这一签的真实内容。
 * 捧签筒的两只手是按道士的肤色画的几格像素（软件里道士不捧签筒，这是宣传片的演示）。
 */
import { useCallback, useMemo, useRef } from "react";
import { BeforeCamera } from "../lib/useScrollStops";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { Camera } from "../lib/Camera";
import { Caption } from "../lib/Caption";
import { DAY, DETAIL, LOT_N, outfitOf } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { GridCanvas } from "../lib/GridCanvas";
import { holdCylinderPose } from "../lib/holdPose";
import { PixelSprite } from "../lib/PixelSprite";
import { Place } from "../lib/Place";
import { i18nFor, Lang } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { localBeatF } from "../lib/timing";
import { LotPaper } from "../../../src/components/LotPaper";
import { getLot } from "../../../src/data/lots";
import { fmtDate } from "../../../src/i18n/format";
import { CYLINDER_LABEL, CYLINDER_W, cylinderGrid, drawCylinderLabel, stickGrid, STICK_H, STICK_W } from "../../../src/sprite/lotCylinder";

const t = i18nFor("zh-CN").t;
const b = (k: number) => localBeatF("lots", k);
const CELL = 6;
/** 道士左上角、签筒在道士身上的位置（格） */
const SX = 600;
const SY = 1080 - 115 * CELL - 50;
/** 签筒左上角在道士身上的位置（格）：捧在胸腹前，筒身在两只袖子中间 */
const CYL = { x: 17, y: 66 };
/** 手：8×7 格，o 描边、s 皮肤、d 暗面；左手的指头搭在签筒左边，右手镜像 */
const HAND = [".oooo...", "osssso..", "osssssso", "osdsdsso", "osssssso", ".oddddo.", "..oooo.."];
const HAND_R = HAND.map((r) => [...r].reverse().join(""));
const SKIN = { o: "#180204", s: "#FCC08A", d: "#F59A63" };
/** 两只手在签筒格子里的位置：左手从左袖里衬伸出（x 14），右手从右袖内侧伸出 */
const HAND_L_AT = { x: 14 - 17, y: 84 - 66 };
const HAND_R_AT = { x: 32 - 17, y: 84 - 66 };

export function Lots() {
  const frame = useCurrentFrame();
  const shakeFrom = b(0.3);
  const dropAt = b(3);
  const paperAt = b(4.5);
  const cyl = useMemo(() => cylinderGrid(), []);
  const stick = useMemo(() => stickGrid(), []);
  const label = useCallback((c: HTMLCanvasElement) => drawCylinderLabel(c, CELL, CYLINDER_LABEL["zh-CN"]), []);
  // 摇：签筒连同两只手左右各倾 5°、上下错一格，每 3 帧换一次方向（按步跳）
  const shaking = frame >= shakeFrom && frame < dropAt;
  const phase = Math.floor((frame - shakeFrom) / 3) % 2 === 0 ? -1 : 1;
  const angle = shaking ? phase * 5 : 0;
  const bob = shaking ? (phase < 0 ? -1 : 0) : 0;
  // 签：从筒口冒出，落到道士脚边（按整格移动）
  const cylLeft = SX + CYL.x * CELL;
  const cylTop = SY + CYL.y * CELL;
  const footY = SY + 113 * CELL;
  const rise = interpolate(frame, [dropAt - 5, dropAt], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fall = interpolate(frame, [dropAt, dropAt + 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => x * x });
  const stickX = cylLeft + 9 * CELL + fall * 26 * CELL;
  const stickY = cylTop - rise * 16 * CELL + fall * (footY - (cylTop - 16 * CELL) - STICK_W * CELL);
  const stickRot = fall * 90;
  const landed = frame >= dropAt + 9;
  const paperOpen = frame >= paperAt;
  // 签纸展开：纵向按 6 步拉开（同软件 0.36s steps(6)）
  const unfold = paperOpen ? Math.min(1, Math.ceil(((frame - paperAt) / 11) * 6) / 6) : 0;
  const paperRef = useRef<HTMLDivElement>(null);
  const scrollPaper = () => {
    const box = paperRef.current;
    const tale = box?.querySelectorAll<HTMLElement>(".lot-paper__reading")[2];
    if (!box || !tale) return;
    // 用屏幕上的位置算「典故」离纸面顶端多远，再除以总缩放（CSS zoom、镜头）换成纸面自己的像素
    const scale = box.getBoundingClientRect().height / box.offsetHeight || 1;
    const target = box.scrollTop + (tale.getBoundingClientRect().top - box.getBoundingClientRect().top) / scale - 12;
    const p = interpolate(frame, [b(9.5) - 10, b(9.5)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    box.scrollTop = Math.min(Math.max(0, target), box.scrollHeight - box.clientHeight) * p;
    // 纸面不够长，典故滚不到最上面：推镜头的目标框跟着典故实际的位置走
    const mark = box.parentElement?.querySelector<HTMLElement>(".promo-tale");
    if (mark) mark.style.top = `${(tale.getBoundingClientRect().top - box.getBoundingClientRect().top) / scale}px`;
  };
  const lot = getLot(LOT_N);
  return (
    <AbsoluteFill>
      <Camera
        keys={[
          { frame: 0 },
          { frame: b(6), target: ".lot-paper__poem" },
          { frame: b(8.5), target: null },
          { frame: b(10.4), target: ".promo-tale" },
          { frame: b(12.9), target: null },
        ]}
      >
        <Desktop>
          <div style={{ position: "absolute", left: SX, top: SY }}>
            <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={CELL} text="奥半仙" hideBanner jumps={[dropAt]} edit={holdCylinderPose}>
              {/* 双手捧着签筒：签筒和两只手一起晃 */}
              <div style={{ position: "absolute", left: CYL.x * CELL, top: (CYL.y + bob) * CELL, transform: `rotate(${angle}deg)`, transformOrigin: `${(CYLINDER_W * CELL) / 2}px ${21 * CELL}px` }}>
                <GridCanvas grid={cyl} cell={CELL} after={label} />
                <GridCanvas grid={HAND} cell={CELL} palette={SKIN} style={{ position: "absolute", left: HAND_L_AT.x * CELL, top: HAND_L_AT.y * CELL }} />
                <GridCanvas grid={HAND_R} cell={CELL} palette={SKIN} style={{ position: "absolute", left: HAND_R_AT.x * CELL, top: HAND_R_AT.y * CELL }} />
              </div>
            </PixelSprite>
          </div>
          {/* 掉出来的签：从筒口冒出，落到道士脚边 */}
          {frame >= dropAt - 5 && !landed && (
            <div style={{ position: "absolute", left: stickX, top: stickY, transform: `rotate(${stickRot}deg)`, transformOrigin: "50% 50%" }}>
              <GridCanvas grid={stick} cell={CELL} />
            </div>
          )}
          {landed && (
            <div style={{ position: "absolute", left: cylLeft + 26 * CELL, top: footY - STICK_W * CELL - (STICK_H * CELL) / 2 + (STICK_W * CELL) / 2, transform: "rotate(90deg)", transformOrigin: "50% 50%" }}>
              <GridCanvas grid={stick} cell={CELL} />
            </div>
          )}
          {paperOpen && (
            <Lang lang="zh-CN">
              <Place x={1150} y={60} zoom={1.45}>
                <div style={{ position: "relative" }}>
                  <div ref={paperRef} style={{ width: 440, height: 655, overflow: "hidden", transform: `scaleY(${unfold})`, transformOrigin: "50% 0" }}>
                    <LotPaper lot={lot} date={fmtDate(DAY, "zh-CN", t)} />
                  </div>
                  {/* 推镜头的目标：典故故事的开头（标题和前几行），位置每帧跟着典故走 */}
                  <div className="promo-tale" style={{ position: "absolute", left: 0, top: 0, width: 440, height: 200, pointerEvents: "none" }} />
                </div>
              </Place>
            </Lang>
          )}
        </Desktop>
        {/* 放在最后：ref 已经挂上，又在镜头量位置之前 */}
        <BeforeCamera run={scrollPaper} />
      </Camera>
      <Caption {...CAPTIONS.lots} />
      <Sfx name="shake" at={shakeFrom} volume={0.4} />
      <Sfx name="shake" at={shakeFrom + 22} volume={0.35} />
      <Sfx name="drop" at={dropAt + 9} volume={0.45} />
      <Sfx name="unroll" at={paperAt} volume={0.35} />
    </AbsoluteFill>
  );
}
