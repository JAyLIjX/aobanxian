import { describe, expect, it } from "vitest";
import branding from "../config/branding.json";
import { getAlmanac } from "../src/calendar/special";
import {
  BANNER_RESET_MS,
  bannerIndexAt,
  buildBannerItems,
  nextBannerIndex,
  pickActivity,
  type BannerInput,
} from "../src/core/banner";

const base: BannerInput = {
  yi: ["祭祀", "出行"],
  ji: ["动土", "安葬"],
  luckyColors: ["红", "绿"],
  luckyAnimals: ["鸡", "鼠", "猴"],
  specialText: null,
};

describe("幡面换字循环", () => {
  it("顺序：奥半仙 → 宜事 → 忌事 → 大吉色 → 吉生肖", () => {
    const items = buildBannerItems(base, branding);
    expect(items.map((i) => i.text)).toEqual(["奥半仙", "宜祭祀", "忌动土", "宜红宜绿", "喜鸡鼠猴"]);
    expect(items.map((i) => i.kind)).toEqual(["brand", "yi", "ji", "colors", "zodiac"]);
  });

  it("两个大吉色平等，相的颜色在前（和卡片、详情、解释句同一顺序）；不出现「穿」「配」", () => {
    const items = buildBannerItems({ ...base, luckyColors: ["白", "黄"] }, branding);
    expect(items[3].text).toBe("宜白宜黄");
    for (const item of items) expect(item.text).not.toMatch(/穿|配/);
  });

  it("点到最后一项再点回到第一项", () => {
    let i = 0;
    const seen = [];
    for (let n = 0; n < 6; n++) {
      seen.push(i);
      i = nextBannerIndex(i, 5);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 0]);
  });

  it("特殊日子时第一项换成特殊文字", () => {
    const items = buildBannerItems({ ...base, specialText: "天赦日" }, branding);
    expect(items[0]).toMatchObject({ kind: "special", text: "天赦日" });
    expect(items).toHaveLength(5);
  });

  it("每一项最多 4 个字", () => {
    const items = buildBannerItems(
      { ...base, specialText: "全国中小学生安全教育日" },
      { ...branding, bannerText: "这是一个很长的名字" },
    );
    for (const item of items) expect([...item.text].length).toBeLessThanOrEqual(4);
  });

  it("8 秒没操作回到第一项", () => {
    expect(bannerIndexAt(3, 1000, 1000 + BANNER_RESET_MS - 1)).toBe(3);
    expect(bannerIndexAt(3, 1000, 1000 + BANNER_RESET_MS)).toBe(0);
  });
});

describe("宜忌取值", () => {
  const skip = branding.banner.skipWords;

  it("正常取第一个", () => {
    expect(pickActivity(["出行", "祭祀"], "宜", "诸事不宜", skip)).toEqual({ text: "宜出行", term: "出行" });
  });
  it("跳过加前缀后超过 4 个字的", () => {
    expect(pickActivity(["平治道涂", "修饰垣墙", "会亲友"], "宜", "诸事不宜", skip)).toEqual({
      text: "宜会亲友",
      term: "会亲友",
    });
  });
  it("跳过「馀事勿取」这类非具体事项", () => {
    expect(pickActivity(["馀事勿取", "沐浴"], "宜", "诸事不宜", skip).text).toBe("宜沐浴");
    expect(pickActivity(["无", "动土"], "忌", "百无禁忌", skip).text).toBe("忌动土");
  });
  it("没有宜事显示「诸事不宜」，没有忌事显示「百无禁忌」", () => {
    expect(pickActivity(["诸事不宜"], "宜", "诸事不宜", skip)).toEqual({ text: "诸事不宜", term: null });
    expect(pickActivity(["馀事勿取"], "宜", "诸事不宜", skip).text).toBe("诸事不宜");
    expect(pickActivity([], "忌", "百无禁忌", skip).text).toBe("百无禁忌");
    expect(pickActivity(["无"], "忌", "百无禁忌", skip).text).toBe("百无禁忌");
  });
});

describe("特殊日子（真实日期）", () => {
  const ymd = (s: string) => {
    const [year, month, day] = s.split("-").map(Number);
    return { year, month, day };
  };

  it("天赦日：2026 年共 6 天（3/5、5/4、5/20、7/19、10/1、12/16）", () => {
    const found: string[] = [];
    for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
      if (getAlmanac({ year: 2026, month: d.getMonth() + 1, day: d.getDate() }).isTianshe) {
        found.push(`${d.getMonth() + 1}/${d.getDate()}`);
      }
    }
    expect(found).toEqual(["3/5", "5/4", "5/20", "7/19", "10/1", "12/16"]);
  });

  it("天赦日看季节：5/4 仍在立夏前（春，戊寅），5/20 已入夏（甲午）", () => {
    expect(getAlmanac(ymd("2026-5-4")).isTianshe).toBe(true);
    expect(getAlmanac(ymd("2026-5-20")).isTianshe).toBe(true);
  });

  it("传统节日：2026-9-25 中秋节", () => {
    expect(getAlmanac(ymd("2026-9-25")).special).toEqual({ kind: "festival", name: "中秋节" });
  });

  it("除夕：2026-2-16", () => {
    expect(getAlmanac(ymd("2026-2-16")).special).toEqual({ kind: "festival", name: "除夕" });
  });

  it("节气：2026-10-23 霜降", () => {
    expect(getAlmanac(ymd("2026-10-23")).special).toEqual({ kind: "jieqi", name: "霜降" });
  });

  it("杨公忌日：2026-10-7（农历八月廿七）", () => {
    const a = getAlmanac(ymd("2026-10-7"));
    expect(a.isYanggong).toBe(true);
    expect(a.special).toEqual({ kind: "yanggong" });
  });

  it("多重重合按优先级：天赦 > 节日 > 节气 > 杨公忌", () => {
    // 2026-3-5：天赦日 + 惊蛰
    const a = getAlmanac(ymd("2026-3-5"));
    expect(a.jieqi).toBe("惊蛰");
    expect(a.special).toEqual({ kind: "tianshe" });
    // 2026-6-19：端午 + 杨公忌（农历五月初五）
    const b = getAlmanac(ymd("2026-6-19"));
    expect(b.isYanggong).toBe(true);
    expect(b.special).toEqual({ kind: "festival", name: "端午节" });
    // 2026-3-20：龙头节 + 春分
    expect(getAlmanac(ymd("2026-3-20")).special).toEqual({ kind: "festival", name: "龙头节" });
  });

  it("闪光特效只在天赦日和春节", () => {
    expect(getAlmanac(ymd("2026-10-1")).sparkle).toBe(true);
    expect(getAlmanac(ymd("2026-2-17")).sparkle).toBe(true);
    expect(getAlmanac(ymd("2026-9-25")).sparkle).toBe(false);
    expect(getAlmanac(ymd("2026-10-22")).sparkle).toBe(false);
  });

  it("黄道 / 黑道", () => {
    expect(getAlmanac(ymd("2026-10-22"))).toMatchObject({ tianShen: "明堂", tianShenType: "黄道" });
  });
});
