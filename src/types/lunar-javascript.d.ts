// lunar-javascript 不带类型声明，这里只声明本项目用到的部分。
// 完整接口见 https://6tail.cn/calendar/api.html
declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getWeek(): number;
    getWeekInChinese(): string;
    getJulianDay(): number;
    getFestivals(): string[];
    getOtherFestivals(): string[];
    getLunar(): Lunar;
    toYmd(): string;
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    getYear(): number;
    /** 闰月为负数 */
    getMonth(): number;
    getDay(): number;
    getSolar(): Solar;
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInGanZhi(): string;
    getYearInGanZhiByLiChun(): string;
    getMonthInGanZhi(): string;
    getDayInGanZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getDayNaYin(): string;
    getDayShengXiao(): string;
    getJieQi(): string;
    getFestivals(): string[];
    getOtherFestivals(): string[];
    getDayYi(sect?: number): string[];
    getDayJi(sect?: number): string[];
    getDayChong(): string;
    getDayChongGan(): string;
    getDayChongShengXiao(): string;
    getDayChongDesc(): string;
    getDaySha(): string;
    getXiu(): string;
    getXiuLuck(): string;
    getZheng(): string;
    getAnimal(): string;
    getGong(): string;
    getDayTianShen(): string;
    getDayTianShenType(): string;
    getDayTianShenLuck(): string;
    toFullString(): string;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
    /** 闰几月，没有闰月为 0 */
    getLeapMonth(): number;
  }

  export class LunarMonth {
    /** month 为负数表示闰月 */
    static fromYm(year: number, month: number): LunarMonth | null;
    getDayCount(): number;
  }

  export const LunarUtil: {
    WU_XING_GAN: Record<string, string>;
    WU_XING_ZHI: Record<string, string>;
    JIA_ZI: string[];
    NAYIN: Record<string, string>;
    /** 下标 1–12：正 二 … 冬 腊 */
    MONTH: string[];
    /** 下标 1–30：初一 … 三十 */
    DAY: string[];
  };
}
