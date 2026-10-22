import { describe, expect, it } from "vitest";
import * as OpenCC from "opencc-js";
import en from "../locales/en.json";
import glossary from "../locales/glossary.json";
import zhCN from "../locales/zh-CN.json";
import zhTW from "../locales/zh-TW.json";
import { getDayDetail } from "../src/calendar/day";
import { getAlmanac } from "../src/calendar/special";
import { defaultRules } from "../src/core/rules";
import { resolveSystemLang } from "../src/i18n";
import { ganzhi, term, toTW } from "../src/i18n/terms";

function keys(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

/** 简体界面里四档文字、解释句等直接用 rules/default.json，所以 zh-CN.json 没有 rulesText */
const withoutRulesText = (k: string[]) => k.filter((x) => !x.startsWith("rulesText."));

describe("三种语言的文字键", () => {
  it("繁体与英文的键完全一致", () => {
    expect(keys(zhTW).sort()).toEqual(keys(en).sort());
  });

  it("简体与其他语言的键一致（除 rulesText 外）", () => {
    expect(keys(zhCN).sort()).toEqual(withoutRulesText(keys(en)).sort());
  });

  it("rulesText 覆盖规则里的所有显示文字", () => {
    for (const loc of [en, zhTW]) {
      expect(Object.keys(loc.rulesText.tiers).sort()).toEqual(Object.keys(defaultRules.tierLabels).sort());
      expect(typeof loc.rulesText.explanation).toBe("string");
      expect(Object.keys(loc.rulesText.xiuLuck).sort()).toEqual(Object.keys(defaultRules.xiuLuckLabels).sort());
      expect(Object.keys(loc.rulesText.tips).sort()).toEqual(Object.keys(defaultRules.tips).sort());
    }
  });

  it("没有空字符串（简体的幡面翻译除外：中文界面不显示翻译气泡）", () => {
    for (const [name, loc] of [
      ["zh-TW", zhTW],
      ["en", en],
    ] as const) {
      const flat = keys(loc).map((k) => [k, k.split(".").reduce((o: any, p) => o[p], loc)] as const);
      for (const [k, v] of flat) {
        if (k.startsWith("bannerTranslation") && name === "zh-TW") continue;
        expect(v, `${name} ${k}`).not.toBe("");
      }
    }
  });

  it("繁体文字里没有简体字", () => {
    const s2t = OpenCC.Converter({ from: "cn", to: "tw" });
    const flat = (o: unknown): string[] =>
      typeof o === "string" ? [o] : Array.isArray(o) ? o.flatMap(flat) : o && typeof o === "object" ? Object.values(o).flatMap(flat) : [];
    const { languageOptions, ...rest } = zhTW.settings;
    void languageOptions;
    for (const s of flat({ ...zhTW, settings: rest })) {
      // 已经是繁体的话，再转一次不变
      expect(s2t(s), s).toBe(s.replaceAll("衝", "沖"));
    }
  });

  it("台湾用词：农民历、设定、预设", () => {
    expect(zhTW.app.tagline).toContain("農民曆");
    expect(zhTW.menu.settings).toBe("設定…");
    expect(zhTW.settings.restoreDefaults).toBe("恢復預設");
    expect(zhTW.detail.clash).toBe("沖{{animal}}");
  });
});

describe("两个大吉色平等", () => {
  const texts = (o: unknown): string[] =>
    typeof o === "string" ? [o] : Array.isArray(o) ? o.flatMap(texts) : o && typeof o === "object" ? Object.values(o).flatMap(texts) : [];

  it("界面文字里没有「道袍」「腰带」「穿 X 配 Y」，英文里没有 robe / sash", () => {
    for (const [name, loc] of [
      ["zh-CN", zhCN],
      ["zh-TW", zhTW],
      ["en", en],
    ] as const) {
      for (const s of texts(loc)) {
        expect(s, name).not.toMatch(/道袍|腰帶|腰带|穿.{1,4}配/);
        expect(s, name).not.toMatch(/\brobe|\bsash/i);
      }
    }
    for (const s of texts(defaultRules)) expect(s).not.toMatch(/道袍|腰带|穿.{1,4}配/);
  });

  it("界面上不出现取法（按日支、按纳音……），取法只在设置里出现", () => {
    for (const loc of [zhCN, zhTW, en]) {
      const { settings, ...rest } = loc as Record<string, unknown> & { settings: unknown };
      void settings;
      for (const s of texts(rest)) expect(s).not.toMatch(/按(日支|日干|纳音|納音)|by (day )?(branch|stem)|by nayin/i);
    }
  });

  it("英文：大吉写成 Lucky colors，色系写成 … family", () => {
    expect(en.card.lucky).toBe("Lucky colors:");
    expect(term("colorFamily", "红色系", "en")).toBe("红色系 · red family");
  });
});

describe("系统语言", () => {
  it("繁体地区用 zh-TW，其他中文用 zh-CN，其余英文", () => {
    expect(resolveSystemLang(["zh-TW"])).toBe("zh-TW");
    expect(resolveSystemLang(["zh-Hant-HK"])).toBe("zh-TW");
    expect(resolveSystemLang(["zh-HK"])).toBe("zh-TW");
    expect(resolveSystemLang(["zh-CN"])).toBe("zh-CN");
    expect(resolveSystemLang(["zh-Hans-SG"])).toBe("zh-CN");
    expect(resolveSystemLang(["en-GB"])).toBe("en");
    expect(resolveSystemLang(["fr-FR", "zh-CN"])).toBe("zh-CN");
    expect(resolveSystemLang(["ja-JP"])).toBe("en");
  });
});

describe("术语表", () => {
  it("覆盖所有会出现的宜忌、纳音、节气、节日、星宿、值神", () => {
    const g = glossary as Record<string, Record<string, unknown>>;
    const missing = new Set<string>();
    for (let d = new Date(2020, 0, 1); d <= new Date(2030, 11, 31); d.setDate(d.getDate() + 1)) {
      const ymd = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
      const detail = getDayDetail(ymd, defaultRules);
      const a = getAlmanac(ymd);
      for (const w of [...detail.yi, ...detail.ji]) if (!g.yiji[w]) missing.add(`宜忌 ${w}`);
      if (!g.nayin[detail.pillar.nayin]) missing.add(`纳音 ${detail.pillar.nayin}`);
      if (detail.jieqi && !g.jieqi[detail.jieqi]) missing.add(`节气 ${detail.jieqi}`);
      for (const f of detail.festivals) if (!g.festival[f]) missing.add(`节日 ${f}`);
      if (!g.xiu[detail.xiu.name]) missing.add(`星宿 ${detail.xiu.name}`);
      if (!g.tianshen[a.tianShen]) missing.add(`值神 ${a.tianShen}`);
    }
    expect([...missing]).toEqual([]);
  });

  it("每个词都有英文和繁体", () => {
    for (const [cat, entries] of Object.entries(glossary)) {
      if (cat.startsWith("$")) continue;
      for (const [zh, tr] of Object.entries(entries as Record<string, Record<string, string>>)) {
        expect(tr.en, `${cat} ${zh}`).toBeTruthy();
        expect(tr["zh-TW"], `${cat} ${zh}`).toBeTruthy();
      }
    }
  });

  it("英文格式：中文原词 + 英文解释", () => {
    expect(term("yiji", "纳采", "en")).toBe("纳采 · Betrothal gifts");
    expect(term("nayin", "大林木", "en")).toBe("大林木 · Great Forest Wood");
    expect(ganzhi("戊辰", "en")).toBe("戊辰 Wu-Chen");
    expect(term("traditionalColor", "银朱", "en")).toBe("Vermilion 银朱");
  });

  it("繁体：历法和宜忌用词保持传统写法", () => {
    expect(term("yiji", "理发", "zh-TW")).toBe("理髮");
    expect(term("jieqi", "谷雨", "zh-TW")).toBe("穀雨");
    expect(term("nayin", "白蜡金", "zh-TW")).toBe("白蠟金");
    expect(toTW("腊月")).toBe("臘月");
    expect(term("yiji", "纳采", "zh-CN")).toBe("纳采");
  });
});
