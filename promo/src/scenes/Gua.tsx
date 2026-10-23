/**
 * 7. 每日一卦：真实的每日一卦窗口（固定 2026-10-22 未时起卦：巽为风，初爻动），
 * 先看卦象，滚到六爻（动爻初爻高亮展开），再依次到体用、互卦、变卦。
 */
import { useRef } from "react";
import { AbsoluteFill } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { DAY, NOW } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { Place } from "../lib/Place";
import { Lang } from "../lib/setup";
import { localBeat } from "../lib/timing";
import { useScrollStops } from "../lib/useScrollStops";
import { WindowFrame } from "../lib/WindowFrame";
import { GuaApp } from "../../../src/windows/GuaApp";

const TARGETS = [":top", ".gua__block:nth-of-type(3)", ".gua__block:nth-of-type(4)", ".gua__block:nth-of-type(5)", ".gua__block:nth-of-type(6)"];

export function Gua() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollStops(
    ref,
    ".tool__body",
    TARGETS,
    [
      { frame: 0, target: 0 },
      { frame: localBeat("gua", 2), target: 1 },
      { frame: localBeat("gua", 5), target: 2 },
      { frame: localBeat("gua", 7), target: 3 },
      { frame: localBeat("gua", 9), target: 4 },
    ],
    10,
  );
  return (
    <AbsoluteFill>
      <Desktop>
        <Place x={700} y={60} zoom={1.4}>
          <div ref={ref}>
            <WindowFrame title="每日一卦" width={560} height={690} style={{ position: "relative" }}>
              <Lang lang="zh-CN">
                <GuaApp demo={{ today: DAY, hour: NOW.getHours() }} />
              </Lang>
            </WindowFrame>
          </div>
        </Place>
      </Desktop>
      <Caption {...CAPTIONS.gua} />
    </AbsoluteFill>
  );
}
