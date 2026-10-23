/**
 * 5. 今日详情：真实的详情面板（四个折叠栏都展开，「现在」固定在未时），平滑往下滚，
 * 依次停在穿衣、宜忌、生肖、时辰、方位与幸运数字、物候与月相、每日一诗；
 * 在时辰时间轴（未时高亮）、罗盘与幸运数字、每日一诗三处推近，停 1 秒左右再拉回。
 */
import { useRef } from "react";
import { AbsoluteFill } from "remotion";
import { CAPTIONS } from "../captions";
import { Camera } from "../lib/Camera";
import { Caption } from "../lib/Caption";
import { DAY, MY_ZODIAC, NOW, RULES } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { Place } from "../lib/Place";
import { Lang } from "../lib/setup";
import { localBeatF } from "../lib/timing";
import { ScrollStops } from "../lib/useScrollStops";
import { DetailPanel } from "../../../src/components/DetailPanel";

const TARGETS = [":top", ".detail__section:nth-of-type(2)", ".detail__section:nth-of-type(3)", ".detail__fold:nth-of-type(4)", ".detail__fold:nth-of-type(5)", ".poem"];
const b = (k: number) => localBeatF("detail", k);
// 滚动：穿衣 → 宜忌 → 生肖 → 时辰 → 方位 → 诗（推镜头期间不滚）
const STOPS = [
      { frame: 0, target: 0 },
      { frame: b(1.5), target: 1 },
      { frame: b(3), target: 2 },
      { frame: b(4.5), target: 3 },
      { frame: b(9), target: 4 },
      { frame: b(13.5), target: 5 },
    ];

export function Detail() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <AbsoluteFill>
      <Camera
        keys={[
          { frame: 0 },
          { frame: b(5.6), target: ".hours" },
          { frame: b(8), target: null },
          { frame: b(10.1), target: ".detail__fold:nth-of-type(5) .positions, .detail__fold:nth-of-type(5) .facts" },
          { frame: b(12.5), target: null },
          { frame: b(14.5), target: ".poem" },
          { frame: b(16.8), target: null },
        ]}
      >
        <Desktop>
          <Lang lang="zh-CN">
            <Place x={720} y={60} zoom={1.45}>
              <div ref={ref} className="promo-detail" style={{ width: 400, height: 655 }}>
                <DetailPanel ymd={DAY} rules={RULES} myZodiac={MY_ZODIAC as never} anniversaries={[]} onChange={() => {}} onClose={() => {}} now={NOW} openAll />
              </div>
            </Place>
          </Lang>
        </Desktop>
        <ScrollStops
          target={ref}
          container=".detail"
          targets={TARGETS}
          stops={STOPS}
          moveFrames={12}
        />
      </Camera>
      <Caption {...CAPTIONS.detail} />
    </AbsoluteFill>
  );
}
