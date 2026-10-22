/**
 * 历法数据层：从 lunar-javascript 取出某一天的全部数据，组合成界面要用的结构。
 * 所有历法计算都交给 lunar-javascript，这里只做取值和拼装。
 */
import { Solar, type Lunar } from "lunar-javascript";
import type { Ymd } from "../core/dayBoundary";
import type { Rules } from "../core/rules";
import { buildOutfit, pickTip, type DayPillar, type Outfit } from "../core/wuxing";
import { zodiacRelations, type ZodiacRelation } from "../core/zodiac";

export interface DayInfo {
  ymd: Ymd;
  /** 如「星期三」 */
  weekday: string;
  /** 0 = 周日 … 6 = 周六 */
  weekIndex: number;
  lunar: {
    /** 如「九月」「闰六月」「正月」 */
    monthName: string;
    /** 如「十二」「初一」 */
    dayName: string;
    isLeapMonth: boolean;
    /** 如「农历九月十二」 */
    text: string;
  };
  /** 年干支按立春换年，月干支按节换月 */
  ganzhi: { year: string; month: string; day: string };
  pillar: DayPillar;
  jieqi: string | null;
  festivals: string[];
  /** 月历格子里的小字：节气 > 节日 > 初一显示月份名 > 农历日 */
  cell: { text: string; kind: "jieqi" | "festival" | "month" | "day" };
  julianDay: number;
}

export interface DayDetail extends DayInfo {
  outfit: Outfit;
  yi: string[];
  ji: string[];
  zodiac: {
    sixHarmony: ZodiacRelation;
    threeHarmony: [ZodiacRelation, ZodiacRelation];
    clash: { animal: string; branch: string; ganzhi: string };
    /** 煞方，如「南」 */
    sha: string;
  };
  xiu: {
    /** 如「箕水豹」 */
    fullName: string;
    name: string;
    luckLabel: string;
  };
  tip: string | null;
}

/** lunar-javascript 公历节日表里较冷门或名字过长的，不在界面上显示 */
const HIDDEN_FESTIVALS = new Set([
  "消费者权益日",
  "愚人节",
  "万圣节前夜",
  "万圣节",
  "感恩节",
  "全国中小学生安全教育日",
  "全国助残日",
  "全民国防教育日",
  "世界住房日",
]);

function lunarOf(ymd: Ymd): Lunar {
  return Solar.fromYmd(ymd.year, ymd.month, ymd.day).getLunar();
}

export function getDayInfo(ymd: Ymd): DayInfo {
  const lunar = lunarOf(ymd);
  const solar = lunar.getSolar();

  const isLeapMonth = lunar.getMonth() < 0;
  const monthName = `${lunar.getMonthInChinese()}月`;
  const dayName = lunar.getDayInChinese();
  const jieqi = lunar.getJieQi() || null;
  const festivals = [...lunar.getFestivals(), ...solar.getFestivals()].filter((f) => !HIDDEN_FESTIVALS.has(f));

  let cell: DayInfo["cell"];
  if (jieqi) cell = { text: jieqi, kind: "jieqi" };
  else if (festivals.length > 0) cell = { text: festivals[0], kind: "festival" };
  else if (lunar.getDay() === 1) cell = { text: monthName, kind: "month" };
  else cell = { text: dayName, kind: "day" };

  return {
    ymd,
    weekday: `星期${solar.getWeekInChinese()}`,
    weekIndex: solar.getWeek(),
    lunar: { monthName, dayName, isLeapMonth, text: `农历${monthName}${dayName}` },
    ganzhi: {
      year: lunar.getYearInGanZhiByLiChun(),
      month: lunar.getMonthInGanZhi(),
      day: lunar.getDayInGanZhi(),
    },
    pillar: { nayin: lunar.getDayNaYin(), stem: lunar.getDayGan(), branch: lunar.getDayZhi() },
    jieqi,
    festivals,
    cell,
    julianDay: Math.floor(solar.getJulianDay()),
  };
}

export function getDayDetail(ymd: Ymd, rules: Rules): DayDetail {
  const info = getDayInfo(ymd);
  const lunar = lunarOf(ymd);
  const outfit = buildOutfit(info.pillar, rules);
  const rel = zodiacRelations(info.pillar.branch);
  const luck = lunar.getXiuLuck();

  return {
    ...info,
    outfit,
    yi: lunar.getDayYi(),
    ji: lunar.getDayJi(),
    zodiac: {
      sixHarmony: rel.sixHarmony,
      threeHarmony: rel.threeHarmony,
      // 冲煞直接用 lunar-javascript 的接口
      clash: {
        animal: lunar.getDayChongShengXiao(),
        branch: lunar.getDayChong(),
        ganzhi: lunar.getDayChongGan() + lunar.getDayChong(),
      },
      sha: lunar.getDaySha(),
    },
    xiu: {
      fullName: lunar.getXiu() + lunar.getZheng() + lunar.getAnimal(),
      name: lunar.getXiu(),
      luckLabel: rules.xiuLuckLabels[luck] ?? luck,
    },
    tip: pickTip(outfit.day.element, info.julianDay, rules),
  };
}

/** 某月的月历格子：从包含 1 号的那一周的周日开始，铺满 6 行 */
export function getMonthGrid(year: number, month: number): { info: DayInfo; inMonth: boolean }[] {
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());
  const cells: { info: DayInfo; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const ymd = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    cells.push({ info: getDayInfo(ymd), inMonth: ymd.month === month });
  }
  return cells;
}
