/**
 * 把某一天、某个钟点换成起卦用的农历数据，再起卦。
 */
import { Solar } from "lunar-javascript";
import type { Ymd } from "../core/dayBoundary";
import { cast, hourBranch, huGua, tiYong, type Cast, type CastInput, type TiYong } from "../core/gua";
import { hexagramOf, type Hexagram } from "../data/zhouyi";

export interface DailyGua {
  input: CastInput;
  cast: Cast;
  main: Hexagram;
  /** 互卦：本卦二至四爻、三至五爻 */
  hu: Hexagram;
  huLines: number[];
  changed: Hexagram;
  tiYong: TiYong;
}

/** 年支按农历年（正月初一换年），闰月按本月数 */
export function castInputFor(day: Ymd, hour: number): CastInput {
  const lunar = Solar.fromYmd(day.year, day.month, day.day).getLunar();
  return {
    yearBranch: lunar.getYearZhi(),
    lunarMonth: Math.abs(lunar.getMonth()),
    lunarDay: lunar.getDay(),
    hourBranch: hourBranch(hour),
  };
}

export function dailyGua(day: Ymd, hour: number): DailyGua {
  const input = castInputFor(day, hour);
  const c = cast(input);
  const hu = huGua(c.lines);
  return {
    input,
    cast: c,
    main: hexagramOf(c.upper, c.lower),
    hu: hexagramOf(hu.upper, hu.lower),
    huLines: hu.lines,
    changed: hexagramOf(c.changedUpper, c.changedLower),
    tiYong: tiYong(c),
  };
}
