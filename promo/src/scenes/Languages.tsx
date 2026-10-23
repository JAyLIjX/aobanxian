/** 11. 三种语言：同一张今日卡片在简体、繁體、English 之间切换（软件自己的语言文件） */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { Desktop } from "../lib/Desktop";
import { Place } from "../lib/Place";
import { Lang } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";
import { TodayCard } from "../../../src/components/TodayCard";
import { cardProps } from "./ScrollCal";

const LANGS = [
  { lang: "zh-CN", label: "简体中文" },
  { lang: "zh-TW", label: "繁體中文" },
  { lang: "en", label: "English" },
] as const;

export function Languages() {
  const frame = useCurrentFrame();
  const switches = LANGS.map((_, i) => localBeat("languages", i * 2));
  let i = 0;
  switches.forEach((f, k) => {
    if (frame >= f) i = k;
  });
  const cur = LANGS[i];
  return (
    <AbsoluteFill>
      <Desktop>
        <div style={{ position: "absolute", left: 760, top: 110, display: "flex", gap: 18 }}>
          {LANGS.map((l, k) => (
            <span
              key={l.lang}
              style={{
                font: "30px 'WX WenKai', 'WX Garamond'",
                padding: "6px 20px",
                borderRadius: 999,
                border: "2px solid #2a2420",
                background: k === i ? "#b83a2c" : "rgba(244,238,223,0.9)",
                color: k === i ? "#f4eedf" : "#2a2420",
              }}
            >
              {l.label}
            </span>
          ))}
        </div>
        <Lang lang={cur.lang}>
          <Place x={760} y={200} zoom={1.6}>
            <div className="scroll__paper paper" style={{ width: 400, border: "2px solid #2a2420" }}>
              <TodayCard {...cardProps(cur.lang)} monthOpen={false} onOpenDetail={() => {}} onToggleMonth={() => {}} />
            </div>
          </Place>
        </Lang>
      </Desktop>
      <Caption {...CAPTIONS.languages} />
      {switches.slice(1).map((f) => (
        <Sfx key={f} name="click" at={f} volume={0.22} />
      ))}
    </AbsoluteFill>
  );
}
