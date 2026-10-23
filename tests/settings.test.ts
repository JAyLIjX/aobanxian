import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_PAGES,
  diffFromDefaults,
  mergeSettings,
  resetPage,
  rulesWith,
  sanitize,
  type Settings,
} from "../src/settings/settings";

describe("设置", () => {
  it("默认值：中号、跟随系统语言、日支 / 相 / 午夜、幡上「奥半仙」", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      size: "medium",
      language: "system",
      elementSource: "branch",
      topPriority: "xiang",
      dayBoundary: "midnight",
      bannerText: "奥半仙",
      bubbleSeconds: 5,
      collapseOnBlur: true,
    });
  });

  it("只存改过的项，读回来与改过的设置一致（重启后保持）", () => {
    const changed: Settings = { ...DEFAULT_SETTINGS, size: "large", language: "en", bannerText: "大吉", bubbleSeconds: 8 };
    const stored = diffFromDefaults(changed);
    expect(stored).toEqual({ size: "large", language: "en", bannerText: "大吉", bubbleSeconds: 8 });
    // 模拟存盘再读取
    expect(mergeSettings(JSON.parse(JSON.stringify(stored)))).toEqual(changed);
  });

  it("每一项都能改并读回", () => {
    const alt: Partial<Settings> = {
      autostart: true,
      onTop: true,
      size: "small",
      language: "zh-TW",
      expandOnLaunch: true,
      collapseOnBlur: false,
      autoUpdate: false,
      myZodiac: "申",
      character: "daoshi",
      displayFont: "B",
      bannerFont: "brush",
      bannerText: "宜静",
      elementSource: "stem",
      topPriority: "wang",
      dayBoundary: "zi",
      openingEnabled: false,
      effectsEnabled: false,
      bubbleSeconds: 3,
      annivNotify: false,
      annivNotifyDays: 7,
      muyuSound: false,
    };
    expect(Object.keys(alt).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
    const merged = mergeSettings(alt);
    expect(merged).toEqual({ ...DEFAULT_SETTINGS, ...alt });
  });

  it("没手动改过取法的用户跟着用新默认值（日支）", () => {
    // 只存改过的项，所以没改过取法的用户存盘里没有 elementSource
    expect(mergeSettings({ size: "large" }).elementSource).toBe("branch");
    expect(mergeSettings({ elementSource: "nayin" }).elementSource).toBe("nayin");
  });

  it("我的生肖默认未设置，只接受十二地支", () => {
    expect(DEFAULT_SETTINGS.myZodiac).toBe("none");
    expect(mergeSettings({ myZodiac: "猴" }).myZodiac).toBe("none");
    expect(mergeSettings({ myZodiac: "申" }).myZodiac).toBe("申");
  });

  it("非法值用默认值", () => {
    expect(mergeSettings({ size: "huge", language: "fr", bubbleSeconds: 4, onTop: "yes" })).toEqual(DEFAULT_SETTINGS);
  });

  it("幡上文字最多 4 个字，空白不算", () => {
    expect(sanitize("bannerText", "一二三四五")).toBe("一二三四");
    expect(sanitize("bannerText", "   ")).toBeUndefined();
  });

  it("「恢复默认」只恢复当前页", () => {
    const changed: Settings = { ...DEFAULT_SETTINGS, size: "large", displayFont: "B", elementSource: "stem", bubbleSeconds: 8 };
    const r = resetPage(changed, "appearance");
    expect(r.displayFont).toBe("A");
    expect(r.size).toBe("large");
    expect(r.elementSource).toBe("stem");
    for (const page of Object.keys(SETTINGS_PAGES) as (keyof typeof SETTINGS_PAGES)[]) {
      const reset = resetPage(changed, page);
      for (const key of SETTINGS_PAGES[page]) expect(reset[key]).toBe(DEFAULT_SETTINGS[key]);
    }
  });

  it("每个设置项都属于某一页", () => {
    const all = Object.values(SETTINGS_PAGES).flat().sort();
    expect(all).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });

  it("规则项叠到规则上", () => {
    const r = rulesWith({ ...DEFAULT_SETTINGS, elementSource: "stem", topPriority: "wang", dayBoundary: "zi" });
    expect(r).toMatchObject({ elementSource: "stem", topPriority: "wang", dayBoundary: "zi" });
  });
});
