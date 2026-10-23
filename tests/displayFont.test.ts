/** 大字字体缺字时整行改用正文字体（不在一行里夹楷体字） */
import { describe, expect, it } from "vitest";
import { displayClass, displayCovers } from "../src/i18n/displayFont";

describe("大字字体缺字", () => {
  it("「農曆」「籤」「奧」整行用正文字体，其他照常用大字", () => {
    expect(displayClass("农历九月十三")).toBe("display");
    expect(displayClass("農曆九月十三")).toBe("display display--plain");
    expect(displayClass("第六十八籤")).toBe("display display--plain");
    expect(displayCovers("奧半仙")).toBe(false);
    expect(displayCovers("奥半仙")).toBe(true);
    expect(displayCovers("閏六月初一")).toBe(false);
  });
});
