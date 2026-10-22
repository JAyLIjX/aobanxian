/**
 * 开发用预览页：并排画出几种幡面文字，用于生成 preview/banner-*.png。
 *   http://localhost:1420/?view=preview&font=pixel   像素字体（A 版）
 *   http://localhost:1420/?view=preview&font=brush   像素化行书（B 版）
 * 由 scripts/render-previews.sh 用无头 Chrome 截图。
 */
import { defaultRules } from "../core/rules";
import { Daoshi } from "../sprite/Daoshi";
import type { BannerFont } from "../sprite/bannerText";
import type { Ramp } from "../sprite/sprite";

const TEXTS = ["奥半仙", "宜出行", "忌动土", "穿红配绿", "喜鸡鼠猴", "天赦日", "中秋节", "宜静"];

export function PreviewApp() {
  const params = new URLSearchParams(location.search);
  const font = (params.get("font") === "brush" ? "brush" : "pixel") as BannerFont;
  const ramp = (e: "木" | "火") => defaultRules.pixelRamps[e].map((l) => l.hex) as Ramp;
  const outfit = { robe: ramp("火"), sash: ramp("木") };
  return (
    <main className="preview">
      <h1>{font === "pixel" ? "A 版：Fusion Pixel 像素字体" : "B 版：志莽行书像素化"}</h1>
      <div className="preview__grid">
        {TEXTS.map((text) => (
          <figure key={text}>
            <Daoshi
              outfit={outfit}
              scale={2}
              bannerText={text}
              bannerFont={font}
              hideBanner={false}
              breathing={false}
              jumpSignal={0}
              swaySignal={0}
              onClickPart={() => {}}
              onContextMenu={() => {}}
            />
            <figcaption>{text}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
