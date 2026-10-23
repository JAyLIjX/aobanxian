/**
 * 6. 求签：像素签筒摇晃（软件里的签筒和签）、掉出一支签，签纸展开（签号、签等、签诗、白话总解），
 * 再往下滚到典故故事。签号用软件的 lotOfDay（固定种子），内容是这一签的真实数据。
 */
import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { DAY, LOT_N } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { GridCanvas } from "../lib/GridCanvas";
import { Place } from "../lib/Place";
import { i18nFor, Lang } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";
import { LotPaper } from "../../../src/components/LotPaper";
import { getLot } from "../../../src/data/lots";
import { fmtDate } from "../../../src/i18n/format";
import { cylinderGrid, stickGrid } from "../../../src/sprite/lotCylinder";

const t = i18nFor("zh-CN").t;

export function Lots() {
  const frame = useCurrentFrame();
  const shakeFrom = localBeat("lots", 0) + 4;
  const dropAt = localBeat("lots", 3);
  const paperAt = localBeat("lots", 5);
  const taleAt = localBeat("lots", 9);
  const cyl = useMemo(() => cylinderGrid(), []);
  const stick = useMemo(() => stickGrid(), []);
  const cell = 10;
  // 摇：左右各 8°，每 3 帧换一次方向（按步跳，像素感）
  const shaking = frame >= shakeFrom && frame < dropAt;
  const angle = shaking ? (Math.floor((frame - shakeFrom) / 3) % 2 === 0 ? -8 : 8) : 0;
  // 签：从筒口冒出、落到筒前
  const stickY = interpolate(frame, [dropAt - 4, dropAt, dropAt + 8], [-40, -170, 330], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stickRot = interpolate(frame, [dropAt, dropAt + 8], [0, 72], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paperOpen = frame >= paperAt;
  // 签纸展开：纵向按 6 步拉开（同软件 0.36s steps(6)）
  const unfold = paperOpen ? Math.min(1, Math.ceil(((frame - paperAt) / 11) * 6) / 6) : 0;
  const paperRef = useRef<HTMLDivElement>(null);
  const taleOffset = useRef(0);
  useLayoutEffect(() => {
    const box = paperRef.current;
    const tale = box?.querySelectorAll<HTMLElement>(".lot-paper__reading")[2];
    if (tale) taleOffset.current = tale.offsetTop - 20;
    if (box) {
      const p = interpolate(frame, [taleAt - 10, taleAt], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      box.scrollTop = taleOffset.current * p;
    }
  });
  const lot = getLot(LOT_N);
  return (
    <AbsoluteFill>
      <Desktop>
        <div style={{ position: "absolute", left: 760, top: 300, width: 200 * 1, height: 400 }}>
          <div style={{ position: "absolute", left: 0, top: 0, transform: `rotate(${angle}deg)`, transformOrigin: "50% 100%" }}>
            {frame < dropAt + 8 && frame >= dropAt - 4 && (
              <div style={{ position: "absolute", left: 85, top: 0, transform: `translateY(${stickY}px) rotate(${stickRot}deg)` }}>
                <GridCanvas grid={stick} cell={cell} />
              </div>
            )}
            <GridCanvas grid={cyl} cell={cell} />
          </div>
          {frame >= dropAt + 8 && (
            <div style={{ position: "absolute", left: 240, top: 290, transform: "rotate(72deg)" }}>
              <GridCanvas grid={stick} cell={cell} />
            </div>
          )}
        </div>
        {paperOpen && (
          <Lang lang="zh-CN">
            <Place x={1110} y={60} zoom={1.45}>
              <div ref={paperRef} style={{ width: 440, height: 655, overflow: "hidden", transform: `scaleY(${unfold})`, transformOrigin: "50% 0" }}>
                <LotPaper lot={lot} date={fmtDate(DAY, "zh-CN", t)} />
              </div>
            </Place>
          </Lang>
        )}
      </Desktop>
      <Caption {...CAPTIONS.lots} />
      <Sfx name="shake" at={shakeFrom} volume={0.4} />
      <Sfx name="shake" at={shakeFrom + 22} volume={0.35} />
      <Sfx name="drop" at={dropAt} volume={0.45} />
      <Sfx name="unroll" at={paperAt} volume={0.35} />
    </AbsoluteFill>
  );
}
