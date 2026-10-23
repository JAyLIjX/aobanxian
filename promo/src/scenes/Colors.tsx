/**
 * 2. 每日吉色：道士站在桌面上，日期翻过五天（五行各一天），道袍和腰带随五行换色；
 * 旁边一行「今日巳火 · 宜黄宜红」（软件里卡片的写法 + 幡上吉色那一项）。最后停在 10 月 22 日，显示解释句。
 */
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { bannerItemsOf, COLOR_DAYS, detailOf, outfitOf, RULES } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { PixelSprite } from "../lib/PixelSprite";
import { i18nFor } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";
import { dayLabel, explanation, fmtDate, weekday } from "../../../src/i18n/format";

const t = i18nFor("zh-CN").t;

export function Colors() {
  const frame = useCurrentFrame();
  const flips = COLOR_DAYS.map((_, i) => localBeat("colors", i * 2));
  let idx = 0;
  flips.forEach((f, i) => {
    if (frame >= f) idx = i;
  });
  const day = COLOR_DAYS[idx];
  const d = detailOf(day);
  const colors = bannerItemsOf(d, null).find((x) => x.kind === "colors")!.text;
  const explainAt = localBeat("colors", 10);
  const explainOpacity = interpolate(frame, [explainAt, explainAt + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 翻页：新日期从上方落下
  const since = frame - flips[idx];
  const drop = interpolate(since, [0, 5], [-26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cell = 6;
  return (
    <AbsoluteFill>
      <Desktop clock={`${day.month}月${day.day}日 ${weekday(day, "zh-CN").replace("星期", "周")} 09:00`}>
        <div style={{ position: "absolute", left: 1210, top: 300 }}>
          <PixelSprite id="daoshi" outfit={outfitOf(d)} cell={cell} text={colors} jumps={flips.slice(1)} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 640,
            top: 330,
            width: 540,
            padding: "26px 30px",
            background: "rgba(244,238,223,0.92)",
            border: "2px solid #2a2420",
            boxShadow: "6px 6px 0 rgba(42,36,32,0.18)",
            transform: `translateY(${drop}px)`,
          }}
          className="paper"
        >
          <div style={{ font: "30px 'WX WenKai'", color: "rgba(42,36,32,0.7)" }}>
            {fmtDate(day, "zh-CN", t)} {weekday(day, "zh-CN")}
          </div>
          <div style={{ font: "46px 'WX MaShanZheng', 'WX WenKai'", color: "#2a2420", marginTop: 10 }}>
            {t("card.todayElement", { label: dayLabel(d.outfit, "zh-CN") })} · <span style={{ color: "#b83a2c" }}>{colors}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            {d.outfit.tiers[0].entries.flatMap((e) => e.colors.slice(0, 3)).map((c) => (
              <span key={c.name} style={{ width: 44, height: 44, background: c.hex, border: "2px solid rgba(42,36,32,0.35)" }} />
            ))}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 640,
            top: 650,
            width: 540,
            opacity: explainOpacity,
            padding: "18px 26px",
            background: "rgba(232, 214, 200, 0.92)",
            borderLeft: "6px solid #b83a2c",
            font: "34px 'WX WenKai'",
            color: "#2a2420",
            lineHeight: 1.5,
          }}
        >
          {explanation(d.outfit, RULES, "zh-CN", t)}
        </div>
      </Desktop>
      <Caption {...CAPTIONS.colors} />
      {flips.slice(1).map((f) => (
        <Sfx key={f} name="flip" at={f} volume={0.28} />
      ))}
    </AbsoluteFill>
  );
}
