/**
 * 7. 每日一卦：真实的每日一卦窗口（固定 2026-10-22 未时起卦：巽为风，初爻动），
 * 先看卦象，滚到六爻，推近动爻那一条（高亮展开）；再滚到体用，推近体用的结论；最后到互卦、变卦。
 */
import { useRef } from "react";
import { AbsoluteFill } from "remotion";
import { CAPTIONS } from "../captions";
import { Camera } from "../lib/Camera";
import { Caption } from "../lib/Caption";
import { DAY, NOW } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { Place } from "../lib/Place";
import { Lang } from "../lib/setup";
import { WINDOW_TITLES } from "../lib/text";
import { localBeatF } from "../lib/timing";
import { ScrollStops } from "../lib/useScrollStops";
import { WindowFrame } from "../lib/WindowFrame";
import { GuaApp } from "../../../src/windows/GuaApp";

const TARGETS = [":top", ".gua__block:nth-of-type(3)", ".gua__block:nth-of-type(4)", ".gua__block:nth-of-type(5)", ".gua__block:nth-of-type(6)"];
const b = (k: number) => localBeatF("gua", k);
const STOPS = [
      { frame: 0, target: 0 },
      { frame: b(1.5), target: 1 },
      { frame: b(5.8), target: 2 },
      { frame: b(10), target: 3 },
      { frame: b(11.2), target: 4 },
    ];

export function Gua() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <AbsoluteFill>
      <Camera
        keys={[
          { frame: 0 },
          { frame: b(2.6), target: ".gua__yao-item.is-moving" },
          { frame: b(5), target: null },
          { frame: b(6.9), target: ".gua__block:nth-of-type(4)" },
          { frame: b(9.3), target: null },
        ]}
      >
        <Desktop>
          <Place x={700} y={60} zoom={1.4}>
            <div ref={ref}>
              <WindowFrame title={WINDOW_TITLES.gua} width={560} height={690} style={{ position: "relative" }}>
                <Lang lang="zh-CN">
                  <GuaApp demo={{ today: DAY, hour: NOW.getHours() }} />
                </Lang>
              </WindowFrame>
            </div>
          </Place>
        </Desktop>
        <ScrollStops target={ref} container=".tool__body" targets={TARGETS} stops={STOPS} moveFrames={10} />
      </Camera>
      <Caption {...CAPTIONS.gua} />
    </AbsoluteFill>
  );
}
