/**
 * 详情里「更多黄历」的数据：值星、吉时、吉神方位、彭祖百忌、物候、月相。
 * 全部取自 lunar-javascript，这里只取值和拼装，不自己推算。
 */
import { Solar } from "lunar-javascript";
import type { Ymd } from "../core/dayBoundary";

export interface LuckyHour {
  /** 时辰地支，如「丑」 */
  branch: string;
  /** 如「01:00」「02:59」 */
  start: string;
  end: string;
}

export interface DayExtras {
  /** 建除十二值星，如「危」 */
  zhiXing: string;
  /** 黄道时辰（吉时），按时间先后；00:00 的早子时和 23:00 的晚子时分开算 */
  luckyHours: LuckyHour[];
  /** 喜神、福神、财神方位，如「东北」「正北」 */
  positions: { xi: string; fu: string; cai: string };
  /**
   * 彭祖百忌：天干、地支各一条，只取前半句的禁忌（如「己不破券」「巳不远行」）。
   * 后半句是吓人的后果（「二比并亡」「鬼祟入房」），界面上不显示。
   */
  pengzu: [string, string];
  /** 物候：所在节气、第几候、候名，如 寒露 / 三候 / 菊有黄花 */
  wuhou: { jieqi: string; hou: string; name: string };
  /** 月相，如「渐盈凸」 */
  yueXiang: string;
}

export function getDayExtras(ymd: Ymd): DayExtras {
  const lunar = Solar.fromYmd(ymd.year, ymd.month, ymd.day).getLunar();
  const luckyHours = lunar
    .getTimes()
    .filter((t) => t.getTianShenType() === "黄道")
    .map((t) => ({ branch: t.getZhi(), start: t.getMinHm(), end: t.getMaxHm() }));
  const [jieqi, hou] = lunar.getHou().split(" ");
  return {
    zhiXing: lunar.getZhiXing(),
    luckyHours,
    positions: { xi: lunar.getDayPositionXiDesc(), fu: lunar.getDayPositionFuDesc(), cai: lunar.getDayPositionCaiDesc() },
    pengzu: [lunar.getPengZuGan().slice(0, 4), lunar.getPengZuZhi().slice(0, 4)],
    wuhou: { jieqi, hou, name: lunar.getWuHou() },
    yueXiang: lunar.getYueXiang(),
  };
}
