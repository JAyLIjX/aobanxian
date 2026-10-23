/**
 * 9. 四个角色：道士、书生、青天大老爷、小和尚依次登场站成一排，各自冒出右键菜单第一项（口头禅）：
 * 掐指一算、翻翻黄历、升堂；小和尚敲一下木鱼，头顶飘「功德 +1」。
 */
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { DETAIL, outfitOf } from "../lib/data";
import { Desktop } from "../lib/Desktop";
import { GridCanvas } from "../lib/GridCanvas";
import { PixelSprite } from "../lib/PixelSprite";
import { i18nFor } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";
import { BigBubble } from "../lib/BigBubble";
import { getCharacter } from "../../../src/sprite/characters";
import { malletGrid, MUYU_PALETTE, muyuGrid } from "../../../src/sprite/muyu";

const t = i18nFor("zh-CN").t;
const IDS = ["daoshi", "shusheng", "guanyuan", "heshang"];

export function Characters() {
  const frame = useCurrentFrame();
  const cell = 4;
  const enter = IDS.map((_, i) => localBeat("characters", i * 2));
  const talk = IDS.map((_, i) => localBeat("characters", 7 + i));
  const knock = talk[3];
  const slots = [210, 640, 1070, 1500];
  return (
    <AbsoluteFill>
      <Desktop>
        {IDS.map((id, i) => {
          const c = getCharacter(id);
          if (frame < enter[i]) return null;
          const rise = Math.round(interpolate(frame, [enter[i], enter[i] + 6], [12, 0], { extrapolateRight: "clamp" })) * cell;
          const x = slots[i] + 100 - (c.data.width * cell) / 2;
          const y = 980 - c.data.height * cell;
          const text = id === "heshang" ? t("muyu.merit") : c.voice["zh-CN"].divine;
          return (
            <div key={id}>
              <div style={{ position: "absolute", left: x, top: y + rise }}>
                <PixelSprite id={id} outfit={outfitOf(DETAIL)} cell={cell} text="奥半仙" jumps={[enter[i], talk[i]]} />
              </div>
              <div style={{ position: "absolute", left: slots[i] - 20, top: 990, width: 240, textAlign: "center", font: "30px 'Promo Brush'", color: "#2a2420" }}>{c.name["zh-CN"]}</div>
              {id !== "heshang" && frame >= talk[i] && <BigBubble text={text} x={x + c.data.width * cell * 0.62} y={y + c.data.headTop * cell - 6} />}
            </div>
          );
        })}
        {frame >= knock - 10 && (
          <div style={{ position: "absolute", left: slots[3] + 180, top: 820 }}>
            <GridCanvas grid={muyuGrid()} cell={cell} palette={MUYU_PALETTE} style={{ position: "absolute", left: 0, top: 9 * cell }} />
            <GridCanvas
              grid={malletGrid()}
              cell={cell}
              palette={MUYU_PALETTE}
              style={{ position: "absolute", left: 14 * cell, top: 0, transform: `rotate(${frame >= knock && frame < knock + 5 ? -28 : 0}deg)`, transformOrigin: "100% 100%" }}
            />
          </div>
        )}
        {frame >= knock && (
          <div
            style={{
              position: "absolute",
              left: slots[3] + 40,
              top: 560 - interpolate(frame, [knock, knock + 30], [0, 70], { extrapolateRight: "clamp" }),
              opacity: interpolate(frame, [knock, knock + 6, knock + 40, knock + 55], [0, 1, 1, 0], { extrapolateRight: "clamp" }),
              font: "40px 'Promo Brush'",
              color: "#b83a2c",
            }}
          >
            {t("muyu.merit")}
          </div>
        )}
      </Desktop>
      <Caption {...CAPTIONS.characters} top={110} />
      {enter.slice(1).map((f) => (
        <Sfx key={f} name="click" at={f} volume={0.2} />
      ))}
      <Sfx name="muyu" at={knock} volume={0.5} />
    </AbsoluteFill>
  );
}
