/**
 * 5. 今日详情：真实的详情面板（四个折叠栏都展开，「现在」固定在未时），平滑往下滚，
 * 依次停在穿衣、宜忌、生肖、时辰（未时高亮）、方位与幸运数字、物候与月相、每日一诗。
 */
import { useRef } from "react";
import { AbsoluteFill } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { DAY, MY_ZODIAC, NOW, RULES } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { Place } from "../lib/Place";
import { Lang } from "../lib/setup";
import { localBeat } from "../lib/timing";
import { useScrollStops } from "../lib/useScrollStops";
import { DetailPanel } from "../../../src/components/DetailPanel";

const TARGETS = [":top", ".detail__section:nth-of-type(2)", ".detail__section:nth-of-type(3)", ".detail__fold:nth-of-type(4)", ".detail__fold:nth-of-type(5)", ".detail__fold:nth-of-type(6)", ".poem"];

export function Detail() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollStops(
    ref,
    ".detail",
    TARGETS,
    TARGETS.map((_, i) => ({ frame: localBeat("detail", i * 2), target: i })),
    12,
  );
  return (
    <AbsoluteFill>
      <Desktop>
        <Lang lang="zh-CN">
          <Place x={720} y={60} zoom={1.45}>
            <div ref={ref} className="promo-detail" style={{ width: 400, height: 655 }}>
              <DetailPanel ymd={DAY} rules={RULES} myZodiac={MY_ZODIAC as never} anniversaries={[]} onChange={() => {}} onClose={() => {}} now={NOW} openAll />
            </div>
          </Place>
        </Lang>
      </Desktop>
      <Caption {...CAPTIONS.detail} />
    </AbsoluteFill>
  );
}
