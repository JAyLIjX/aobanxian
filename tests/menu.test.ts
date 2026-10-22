import { describe, expect, it } from "vitest";
import { menuKey, type MenuModel } from "../src/platform/menu";

const model = (over: Partial<MenuModel> = {}): MenuModel => ({
  labels: {
    divine: "掐指一算", lots: "求签", gua: "每日一卦", detail: "今日详情", toggleCalendar: "展开日历",
    zeri: "择日…", anniversaries: "纪念日…", share: "分享今日", settings: "设置…", about: "关于", quit: "退出",
    size: "小人尺寸", onTop: "置顶", tooltip: "奥半仙", sizes: { small: "小", medium: "中", large: "大" },
  },
  size: "medium",
  onTop: false,
  actions: {} as MenuModel["actions"],
  ...over,
});

describe("菜单只在样子变了时重建", () => {
  it("动作变了不算变（菜单项总是调用最新的动作）", () => {
    const a = model({ actions: { divine: () => 1 } as unknown as MenuModel["actions"] });
    const b = model({ actions: { divine: () => 2 } as unknown as MenuModel["actions"] });
    expect(menuKey(a)).toBe(menuKey(b));
  });

  it("文字、尺寸、置顶变了要重建", () => {
    const base = menuKey(model());
    expect(menuKey(model({ onTop: true }))).not.toBe(base);
    expect(menuKey(model({ size: "large" }))).not.toBe(base);
    expect(menuKey(model({ labels: { ...model().labels, toggleCalendar: "收起日历" } }))).not.toBe(base);
  });
});
