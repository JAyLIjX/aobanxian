/**
 * 10. 分享今日：用软件的 buildShareContent + renderShareImage 生成今天的分享图（1080×1440），
 * 道士冒气泡「已存好，拿去晒吧」（软件里存好图后道士说的话）。
 */
import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { DAY, DETAIL, outfitOf, RULES } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { PixelSprite } from "../lib/PixelSprite";
import { i18nFor } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";
import { BigBubble } from "../lib/BigBubble";
import { renderShareImage, SHARE_H, SHARE_W } from "../../../src/share/shareImage";
import { buildShareContent } from "../../../src/windows/ShareApp";

const t = i18nFor("zh-CN").t;

export function Share() {
  const frame = useCurrentFrame();
  const genAt = localBeat("share", 1);
  const savedAt = localBeat("share", 3);
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const content = buildShareContent({
      t,
      lang: "zh-CN",
      today: DAY,
      detail: DETAIL,
      rules: RULES,
      settings: { character: "daoshi", bannerText: "奥半仙", bannerFont: "pixel" },
      lot: null,
      fonts: { display: '"WX MaShanZheng", "WX WenKai", serif', body: '"WX WenKai", serif' },
    });
    renderShareImage(ref.current, content);
  }, []);
  const show = frame >= genAt;
  const y = interpolate(frame, [genAt, genAt + 8], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const o = interpolate(frame, [genAt, genAt + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Desktop>
        <canvas
          ref={ref}
          width={SHARE_W}
          height={SHARE_H}
          style={{ position: "absolute", left: 760, top: 60, width: SHARE_W * 0.65, height: SHARE_H * 0.65, opacity: show ? o : 0, transform: `translateY(${y}px)`, boxShadow: "0 16px 40px rgba(42,36,32,0.3)" }}
        />
        <div style={{ position: "absolute", left: 1560, top: 600 }}>
          <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={3} text="奥半仙" jumps={[savedAt]} />
          {frame >= savedAt && <BigBubble text={t("share.saved")} x={150} y={30} />}
        </div>
      </Desktop>
      <Caption {...CAPTIONS.share} />
      <Sfx name="click" at={genAt - 2} />
      <Sfx name="stamp" at={genAt + 2} volume={0.25} />
    </AbsoluteFill>
  );
}
