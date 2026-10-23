/**
 * 宣传片里所有画面的数据：全部用软件自己的函数、按固定日期算出来（主日期 2026-10-22，农历九月十三），
 * 每次渲染结果都一样，也和软件里看到的一致。
 */
import branding from "../../../config/branding.json";
import { getDayDetail, type DayDetail } from "../../../src/calendar/day";
import { getAlmanac } from "../../../src/calendar/special";
import { buildBannerItems, type BannerItem } from "../../../src/core/banner";
import type { Ymd } from "../../../src/core/dayBoundary";
import type { Element } from "../../../src/core/elements";
import { lotOfDay } from "../../../src/core/lots";
import { specialBannerText } from "../../../src/core/opening";
import { defaultRules } from "../../../src/core/rules";
import { personalRelation, zodiacRelations } from "../../../src/core/zodiac";
import type { Outfit, Ramp } from "../../../src/sprite/sprite";

export const DAY: Ymd = { year: 2026, month: 10, day: 22 };
/** 「现在」：未时（14:05），每日一卦按这个钟点起卦，详情里高亮未时 */
export const NOW = new Date(2026, 9, 22, 14, 5);
export const RULES = defaultRules;
/** 演示用的「我的生肖」：猴（申）。巳日与申六合，幡上会出现「合你」 */
export const MY_ZODIAC = "申";
/** 求签的本机种子（软件里每台电脑随机一个；宣传片固定一个） */
export const LOT_SALT = "aobanxian-promo";

export const detailOf = (ymd: Ymd): DayDetail => getDayDetail(ymd, RULES);
export const DETAIL = detailOf(DAY);

/** 软件里画小人用的配色：道袍、腰带各用哪个五行的像素色阶 */
export function outfitOf(d: DayDetail): Outfit {
  const ramp = (e: Element) => RULES.pixelRamps[e].map((l) => l.hex) as Ramp;
  return { robe: ramp(d.outfit.primary.element), sash: ramp(d.outfit.accent.element) };
}

/** 幡面循环（和 MainApp 一样的参数） */
export function bannerItemsOf(d: DayDetail, myZodiac: string | null): BannerItem[] {
  const rel = zodiacRelations(d.pillar.branch);
  return buildBannerItems(
    {
      yi: d.yi,
      ji: d.ji,
      luckyColors: [RULES.colorFamilies[d.outfit.phases.xiang].char, RULES.colorFamilies[d.outfit.phases.wang].char],
      luckyAnimals: [rel.sixHarmony.animal, ...rel.threeHarmony.map((r) => r.animal)],
      specialText: specialBannerText(getAlmanac(d.ymd).special, branding.special),
      personal: myZodiac ? personalRelation(d.pillar.branch, myZodiac) : null,
    },
    branding,
  );
}

/** 每日吉色那一段翻过的五天：五行各一天，最后停在 10 月 22 日（巳火）。
 * 连续五天凑不齐五行（地支按 子水 丑土 寅木 卯木 辰土 巳火 午火 未土 申金 酉金 戌土 亥水 排），所以挑了五个日子 */
export const COLOR_DAYS: Ymd[] = [
  { year: 2026, month: 10, day: 13 }, // 申金
  { year: 2026, month: 10, day: 17 }, // 子水
  { year: 2026, month: 10, day: 18 }, // 丑土
  { year: 2026, month: 10, day: 19 }, // 寅木
  DAY, // 巳火
];

export const LOT_N = lotOfDay(DAY, LOT_SALT);
export const REPOSITORY = branding.repository;
