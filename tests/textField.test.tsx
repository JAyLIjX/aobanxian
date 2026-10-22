// @vitest-environment jsdom
/**
 * 有字数限制的输入框：输入法组字期间不截断、不计数；组字结束后按字（字素）计数；
 * 超了标红、不保存；失去焦点时恢复上一次保存的值。
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import i18n from "../src/i18n";
import { checkText, TextField } from "../src/components/TextField";
import { countChars, splitChars } from "../src/core/text";
import { clampBannerText } from "../src/core/banner";

afterEach(cleanup);

/** 父组件：保存的值存在 state 里，和设置窗口一样 */
function Host({ initial = "奥半仙", max = 4, onCommit }: { initial?: string; max?: number; onCommit?: (v: string) => void }) {
  const [saved, setSaved] = useState(initial);
  return (
    <>
      <TextField
        value={saved}
        max={max}
        required
        ariaLabel="banner"
        onCommit={(v) => {
          onCommit?.(v);
          setSaved(v);
        }}
      />
      <output data-testid="saved">{saved}</output>
    </>
  );
}

const input = () => screen.getByLabelText("banner") as HTMLInputElement;
const counter = () => document.querySelector(".text-field__count")!.textContent;
const saved = () => screen.getByTestId("saved").textContent;

/** 模拟拼音输入法：compositionstart → 一串组字中的 input（拼音字母）→ 上屏 → compositionend */
function typePinyin(el: HTMLInputElement, before: string, steps: string[], result: string) {
  fireEvent.focus(el);
  fireEvent.compositionStart(el);
  for (const s of steps) fireEvent.change(el, { target: { value: before + s } });
  fireEvent.change(el, { target: { value: before + result } });
  fireEvent.compositionEnd(el, { data: result });
}

describe("按字计数", () => {
  it("中文、英文、emoji 混合", () => {
    expect(countChars("奥半仙")).toBe(3);
    expect(countChars("宜红宜黄")).toBe(4);
    expect(countChars("abc")).toBe(3);
    expect(countChars("奥a仙")).toBe(3);
    expect(countChars("👍")).toBe(1);
    expect(countChars("👍🏽")).toBe(1); // 肤色
    expect(countChars("👨‍👩‍👧‍👦")).toBe(1); // 一家人（零宽连接）
    expect(countChars("🇨🇳")).toBe(1); // 国旗
    expect(countChars("福👨‍👩‍👧‍👦a🇨🇳")).toBe(4);
    expect(splitChars("福👍🏽a")).toEqual(["福", "👍🏽", "a"]);
    // 生僻字（UTF-16 代理对）也算 1 个
    expect(countChars("𠀀")).toBe(1);
  });

  it("幡上文字截断也按字算，emoji 不会被劈成两半", () => {
    expect(clampBannerText("👨‍👩‍👧‍👦福禄寿喜")).toBe("👨‍👩‍👧‍👦福禄寿");
  });

  it("checkText", () => {
    expect(checkText("奥半仙", 4)).toMatchObject({ count: 3, over: false, valid: true });
    expect(checkText("奥半仙人a", 4)).toMatchObject({ count: 5, over: true, valid: false });
    expect(checkText("  ", 4, true)).toMatchObject({ empty: true, valid: false });
    expect(checkText("  ", 4, false)).toMatchObject({ valid: true });
  });
});

describe("输入法组字", () => {
  it("组字中出现超过 4 个字母也不截断、不计数、不保存", () => {
    const commit = vi.fn();
    render(<Host initial="福" onCommit={commit} />);
    const el = input();
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "" } });
    commit.mockClear();
    fireEvent.compositionStart(el);
    for (const s of ["a", "ao", "aob", "aoba", "aoban", "aobanx", "aobanxi", "aobanxian"]) {
      fireEvent.change(el, { target: { value: s } });
      expect(el.value).toBe(s); // 一个字母都没被截掉
    }
    expect(el.value).toBe("aobanxian");
    expect(el.getAttribute("aria-invalid")).toBe("false"); // 组字中不标红
    expect(commit).not.toHaveBeenCalled();
    // 上屏
    fireEvent.change(el, { target: { value: "奥半仙" } });
    fireEvent.compositionEnd(el, { data: "奥半仙" });
    expect(el.value).toBe("奥半仙");
    expect(counter()).toBe("3/4");
    expect(commit).toHaveBeenLastCalledWith("奥半仙");
    expect(saved()).toBe("奥半仙");
  });

  it("「奥半」之后接着打「xian」不会卡住", () => {
    render(<Host initial="奥半" />);
    typePinyin(input(), "奥半", ["x", "xi", "xia", "xian"], "仙");
    expect(input().value).toBe("奥半仙");
    expect(saved()).toBe("奥半仙");
  });

  it("组字中的 input 事件带 isComposing 时也不处理", () => {
    const commit = vi.fn();
    render(<Host initial="宜红" onCommit={commit} />);
    const el = input();
    fireEvent.focus(el);
    // 不发 compositionstart，只靠事件自身的 isComposing
    fireEvent.input(el, { target: { value: "宜红yihuang" }, isComposing: true });
    expect(el.value).toBe("宜红yihuang");
    expect(commit).not.toHaveBeenCalled();
    expect(counter()).toBe("2/4");
  });

  it("能打出「宜红宜黄」", () => {
    render(<Host initial="" />);
    const el = input();
    typePinyin(el, "", ["y", "yi"], "宜");
    typePinyin(el, "宜", ["h", "ho", "hon", "hong"], "红");
    typePinyin(el, "宜红", ["y", "yi"], "宜");
    typePinyin(el, "宜红宜", ["h", "hu", "hua", "huan", "huang"], "黄");
    expect(el.value).toBe("宜红宜黄");
    expect(counter()).toBe("4/4");
    expect(saved()).toBe("宜红宜黄");
  });
});

describe("超过字数", () => {
  it("不截断，标红、提示、显示 5/4，不保存", () => {
    const commit = vi.fn();
    render(<Host initial="宜红宜黄" onCommit={commit} />);
    typePinyin(input(), "宜红宜黄", ["l", "lv"], "绿");
    expect(input().value).toBe("宜红宜黄绿");
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(input().className).toContain("is-invalid");
    expect(counter()).toBe("5/4");
    expect(screen.getByText(i18n.t("textField.tooLong", { max: 4 }))).toBeTruthy();
    expect(commit).not.toHaveBeenCalled();
    expect(saved()).toBe("宜红宜黄");
  });

  it("中文界面提示「最多 4 个字」", async () => {
    await act(() => i18n.changeLanguage("zh-CN"));
    render(<Host initial="宜红宜黄" />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: "宜红宜黄a" } });
    expect(screen.getByText("最多 4 个字")).toBeTruthy();
  });

  it("失去焦点时恢复为上一次保存的值", () => {
    render(<Host initial="奥半仙" />);
    const el = input();
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "奥半仙人" } }); // 合法，保存
    fireEvent.change(el, { target: { value: "奥半仙人👍" } }); // 超了，不保存
    expect(counter()).toBe("5/4");
    fireEvent.blur(el);
    expect(el.value).toBe("奥半仙人");
    expect(counter()).toBe("4/4");
    expect(el.getAttribute("aria-invalid")).toBe("false");
  });

  it("删回 4 个字以内马上恢复正常并保存", () => {
    render(<Host initial="奥半仙" />);
    const el = input();
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "奥半仙人a" } });
    expect(saved()).toBe("奥半仙");
    fireEvent.change(el, { target: { value: "奥半仙a" } });
    expect(counter()).toBe("4/4");
    expect(saved()).toBe("奥半仙a");
  });

  it("emoji 算 1 个字：4 个 emoji 合法", () => {
    render(<Host initial="福" />);
    const el = input();
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "👨‍👩‍👧‍👦🇨🇳👍🏽福" } });
    expect(counter()).toBe("4/4");
    expect(saved()).toBe("👨‍👩‍👧‍👦🇨🇳👍🏽福");
  });

  it("清空不保存，失去焦点恢复", () => {
    render(<Host initial="奥半仙" />);
    const el = input();
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "" } });
    expect(saved()).toBe("奥半仙");
    fireEvent.blur(el);
    expect(el.value).toBe("奥半仙");
  });
});

describe("不再有 maxLength 和输入时截断", () => {
  it("输入框没有 maxLength", () => {
    render(<Host />);
    expect(input().hasAttribute("maxlength")).toBe(false);
  });

  it("所有窗口里的文字输入框都用 TextField", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(d, e.name));
        else if (e.name.endsWith(".tsx")) files.push(join(d, e.name));
      }
    };
    walk(join(process.cwd(), "src"));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (f.endsWith("TextField.tsx")) continue;
      expect(src, f).not.toMatch(/maxLength/);
      // 不是 type=number / checkbox 等的 <input 都应该换成 TextField
      for (const m of src.matchAll(/<input\b[^>]*>/gs)) expect(m[0], f).toMatch(/type=/);
    }
  });
});
