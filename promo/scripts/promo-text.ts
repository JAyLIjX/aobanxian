/**
 * 列出宣传片里每种字幕字体要显示的全部文字（含按日期算出来的），给 scripts/fonts.sh 做子集、scripts/check-glyphs.py 检查用。
 *   npx tsx scripts/promo-text.ts > out/promo-text.json
 */
import i18n from "../../src/i18n";
import { getCharacter } from "../src/shims/characters";
import { dayLabel, explanation, fmtDate, weekday } from "../../src/i18n/format";
import { CAPTIONS, COVER, ENDING, OPENING } from "../src/captions";
import { bannerItemsOf, COLOR_DAYS, DAY, detailOf, REPOSITORY, RULES } from "../src/lib/data";
import { clockText, COLORS_SEP, MENU_TITLE, WINDOW_TITLES } from "../src/lib/text";
import { ANNIV_CLOCK_DAY } from "../src/lib/anniv";

const t = i18n.getFixedT("zh-CN");
const brush: string[] = [OPENING.title, ENDING.title, COVER.title, ...Object.values(CAPTIONS).map((c) => c.title)];
const kai: string[] = [OPENING.subtitle, ENDING.line, ENDING.scan, ENDING.foot, COVER.subtitle, ...Object.values(CAPTIONS).map((c) => c.desc), MENU_TITLE, ...Object.values(WINDOW_TITLES)];
const garamond: string[] = [OPENING.en, ENDING.en, REPOSITORY.replace("https://", ""), ...Object.values(CAPTIONS).map((c) => c.en), "English"];
for (const day of COLOR_DAYS) {
  const d = detailOf(day);
  const colors = bannerItemsOf(d, null).find((x) => x.kind === "colors")!.text;
  brush.push(t("card.todayElement", { label: dayLabel(d.outfit, "zh-CN") }), colors);
  kai.push(COLORS_SEP);
  kai.push(`${fmtDate(day, "zh-CN", t)} ${weekday(day, "zh-CN")}`, clockText(day, "09:00"), explanation(d.outfit, RULES, "zh-CN", t));
}
kai.push(clockText(DAY), clockText(ANNIV_CLOCK_DAY), "简体中文", "繁體中文");
for (const id of ["daoshi", "shusheng", "guanyuan", "heshang"]) brush.push(getCharacter(id).name["zh-CN"]);
brush.push(t("muyu.merit"));
console.log(JSON.stringify({ brush, kai, garamond }, null, 1));
