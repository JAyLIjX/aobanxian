/**
 * 详情里时辰、方位、物候、更多黄历的数据：全部取自 lunar-javascript，这里只取值和拼装，不自己推算。
 * 唯一的改动：七十二候的候名按古籍原文校正（config/wuhou.json）。
 */
import { Solar } from "lunar-javascript";
import wuhouConfig from "../../config/wuhou.json";
import type { Ymd } from "../core/dayBoundary";

export interface HourSlot {
  /** 时辰地支，如「子」 */
  branch: string;
  /** 时辰干支，如「甲子」 */
  ganzhi: string;
  /** 如「23:00」「00:59」；子时跨两天，从前一天 23:00 到当天 00:59 */
  start: string;
  end: string;
  /** 黄道为「吉」，黑道为「平」（界面不写「凶」） */
  luck: "吉" | "平";
}

export interface DayExtras {
  /** 建除十二值星，如「危」 */
  zhiXing: string;
  /** 十二时辰，子时在最前，作为一格 */
  hours: HourSlot[];
  /** 喜神、福神、财神方位，如「东北」「正北」 */
  positions: { xi: string; fu: string; cai: string };
  /**
   * 彭祖百忌：天干、地支各一条，只取前半句的禁忌（如「己不破券」「巳不远行」）。
   * 后半句是吓人的后果（「二比并亡」「鬼祟入房」），界面上不显示。
   */
  pengzu: [string, string];
  /** 物候：所在节气、第几候、候名（古籍原文用字），如 寒露 / 三候 / 菊有黄华 */
  wuhou: { jieqi: string; hou: string; name: string };
  /** 月相，如「渐盈凸」；lunarDay 是农历日（1–30），画小月亮用 */
  moon: { name: string; lunarDay: number };
  /** 胎神方位，如「占门床 外正南」 */
  taishen: string;
  /** 九星（日家九星），如「一白水天枢」：数字、颜色、五行、北斗星名 */
  nineStar: { name: string; number: string; color: string; element: string; star: string };
}

const WUHOU_FIXES = wuhouConfig.fixes as Record<string, string>;

/** 七十二候：lunar-javascript 的候名 → 古籍原文（没有校正的原样返回） */
export function wuhouName(lunarName: string): string {
  return WUHOU_FIXES[lunarName] ?? lunarName;
}

export function getDayExtras(ymd: Ymd): DayExtras {
  const lunar = Solar.fromYmd(ymd.year, ymd.month, ymd.day).getLunar();
  const times = lunar.getTimes();
  // times[0] 是 00:00 的早子时（当天的子时，干支按当天日干起），times[12] 是 23:00 的晚子时（属于第二天）
  const hours = times.slice(0, 12).map((t, i) => ({
    branch: t.getZhi(),
    ganzhi: t.getGanZhi(),
    start: i === 0 ? "23:00" : t.getMinHm(),
    end: t.getMaxHm(),
    luck: t.getTianShenType() === "黄道" ? ("吉" as const) : ("平" as const),
  }));
  const [jieqi, hou] = lunar.getHou().split(" ");
  const star = lunar.getDayNineStar();
  const starName = star.toString();
  return {
    zhiXing: lunar.getZhiXing(),
    hours,
    positions: { xi: lunar.getDayPositionXiDesc(), fu: lunar.getDayPositionFuDesc(), cai: lunar.getDayPositionCaiDesc() },
    pengzu: [lunar.getPengZuGan().slice(0, 4), lunar.getPengZuZhi().slice(0, 4)],
    wuhou: { jieqi, hou, name: wuhouName(lunar.getWuHou()) },
    moon: { name: lunar.getYueXiang(), lunarDay: lunar.getDay() },
    taishen: lunar.getDayPositionTai(),
    nineStar: { name: starName, number: star.getNumber(), color: star.getColor(), element: star.getWuXing(), star: starName.slice(3) },
  };
}

/** 现在是第几个时辰（0 = 子 … 11 = 亥）；23 点起算子时 */
export function hourIndex(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}
