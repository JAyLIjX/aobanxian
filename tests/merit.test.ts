import { beforeEach, describe, expect, it, vi } from "vitest";
import { addMerit, sanitizeMerit } from "../src/core/merit";
import { muyuGrid, malletGrid, MUYU_H, MUYU_PALETTE, MUYU_W, MALLET_H, MALLET_W } from "../src/sprite/muyu";

/** 普通浏览器里 store 退回 localStorage；测试里用一个内存版的 localStorage 模拟「本机存储」 */
function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}

describe("功德", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    vi.stubGlobal("window", { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} });
    vi.resetModules();
  });

  it("加一、非法值当 0", () => {
    expect(addMerit(0)).toBe(1);
    expect(addMerit(122)).toBe(123);
    expect(addMerit(5, 3)).toBe(8);
    expect(sanitizeMerit("12")).toBe(0);
    expect(sanitizeMerit(-3)).toBe(0);
    expect(sanitizeMerit(7.8)).toBe(7);
  });

  it("每敲一下累计一次，重启（重新载入模块）后保持", async () => {
    const m1 = await import("../src/settings/merit");
    expect(await m1.loadMerit()).toBe(0);
    for (let i = 0; i < 5; i++) await m1.knockMerit();
    expect(await m1.loadMerit()).toBe(5);
    // 模拟重启：模块重新载入，存储还在
    vi.resetModules();
    const m2 = await import("../src/settings/merit");
    expect(await m2.loadMerit()).toBe(5);
    expect(await m2.knockMerit()).toBe(6);
  });
});

describe("像素木鱼", () => {
  it("尺寸正确，只用调色板里的颜色，有鱼嘴的缝", () => {
    const fish = muyuGrid();
    expect(fish).toHaveLength(MUYU_H);
    for (const row of fish) expect(row).toHaveLength(MUYU_W);
    const mallet = malletGrid();
    expect(mallet).toHaveLength(MALLET_H);
    for (const row of mallet) expect(row).toHaveLength(MALLET_W);
    for (const ch of [...fish.join(""), ...mallet.join("")]) expect(ch === "." || ch in MUYU_PALETTE, ch).toBe(true);
    expect(fish.join("")).toContain("k");
  });
});
