/**
 * 奥半仙宣传片：1920×1080、30fps，约 75 秒，只有字幕和背景音乐（audio/bgm.m4a），没有配音。
 * 各段长度按音乐的拍点排（src/lib/timing.ts、src/beats.json），音乐剪到片长，最后 2 秒淡出。
 * 另有：Cover（B 站封面 1920×1200）、Test（调试用）。
 */
import { AbsoluteFill, Audio, Composition, interpolate, Sequence, staticFile } from "remotion";
import { Cover } from "./scenes/Cover";
import { Banner } from "./scenes/Banner";
import { Characters } from "./scenes/Characters";
import { Colors } from "./scenes/Colors";
import { Detail } from "./scenes/Detail";
import { Ending } from "./scenes/Ending";
import { Gua } from "./scenes/Gua";
import { Languages } from "./scenes/Languages";
import { Lots } from "./scenes/Lots";
import { Opening } from "./scenes/Opening";
import { ScrollCal } from "./scenes/ScrollCal";
import { Share } from "./scenes/Share";
import { ZeriAnniv } from "./scenes/ZeriAnniv";
import { FontGate } from "./lib/setup";
import { FPS, SCENES, TOTAL_FRAMES, type SceneId } from "./lib/timing";

const COMPONENTS: Record<SceneId, () => React.JSX.Element> = {
  opening: Opening,
  colors: Colors,
  banner: Banner,
  scroll: ScrollCal,
  detail: Detail,
  lots: Lots,
  gua: Gua,
  zeri: ZeriAnniv,
  characters: Characters,
  share: Share,
  languages: Languages,
  ending: Ending,
};

const FADE = 2 * FPS;

function Promo() {
  return (
    <FontGate>
      <AbsoluteFill style={{ background: "#efe6d6" }}>
        {SCENES.map((s) => {
          const C = COMPONENTS[s.id];
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={s.duration} name={s.id}>
              <C />
            </Sequence>
          );
        })}
        <Audio
          src={staticFile("bgm.m4a")}
          volume={(f) => 0.9 * interpolate(f, [TOTAL_FRAMES - FADE, TOTAL_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      </AbsoluteFill>
    </FontGate>
  );
}

export const Root = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition
      id="Cover"
      component={() => (
        <FontGate>
          <Cover />
        </FontGate>
      )}
      durationInFrames={1}
      fps={FPS}
      width={1920}
      height={1200}
    />
  </>
);
