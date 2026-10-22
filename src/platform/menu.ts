/**
 * 右键菜单与托盘菜单：同一份菜单定义，用 Tauri 原生菜单 API。
 * 右键菜单在鼠标位置弹出系统样式菜单；托盘菜单内容一致
 * （Windows 的托盘图标常被折叠，右键道士是主入口）。
 */
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import type { FigureSize } from "../settings/settings";
import { inTauri } from "./window";

type Action = "divine" | "lots" | "gua" | "detail" | "toggleCalendar" | "zeri" | "anniversaries" | "share" | "settings" | "about" | "quit";

export interface MenuModel {
  labels: Record<Action | "size" | "onTop" | "tooltip", string> & { sizes: Record<FigureSize, string> };
  size: FigureSize;
  onTop: boolean;
  actions: Record<Action, () => void> & {
    setSize: (s: FigureSize) => void;
    toggleOnTop: () => void;
  };
}

async function buildMenu(m: MenuModel): Promise<Menu> {
  const sep = () => PredefinedMenuItem.new({ item: "Separator" });
  const sizes = await Promise.all(
    (["small", "medium", "large"] as const).map((s) =>
      CheckMenuItem.new({ text: m.labels.sizes[s], checked: m.size === s, action: () => m.actions.setSize(s) }),
    ),
  );
  const item = (a: Action) => MenuItem.new({ text: m.labels[a], action: m.actions[a] });
  // 顺序：掐指一算、求签、每日一卦 ／ 今日详情、展开或收起日历 ／ 择日、纪念日、分享今日 ／
  //       小人尺寸、置顶、设置 ／ 关于、退出
  return Menu.new({
    items: [
      await item("divine"),
      await item("lots"),
      await item("gua"),
      await sep(),
      await item("detail"),
      await item("toggleCalendar"),
      await sep(),
      await item("zeri"),
      await item("anniversaries"),
      await item("share"),
      await sep(),
      await Submenu.new({ text: m.labels.size, items: sizes }),
      await CheckMenuItem.new({ text: m.labels.onTop, checked: m.onTop, action: m.actions.toggleOnTop }),
      await item("settings"),
      await sep(),
      await item("about"),
      await item("quit"),
    ],
  });
}

/** 在鼠标位置弹出右键菜单 */
export async function popupContextMenu(m: MenuModel): Promise<void> {
  if (!inTauri) return;
  const menu = await buildMenu(m);
  await menu.popup();
}

const TRAY_ID = "aobanxian-tray";

/** 创建或更新托盘图标的菜单（语言、设置变化时调用） */
export async function syncTray(m: MenuModel): Promise<void> {
  if (!inTauri) return;
  const menu = await buildMenu(m);
  const existing = await TrayIcon.getById(TRAY_ID);
  if (existing) {
    await existing.setMenu(menu);
    await existing.setTooltip(m.labels.tooltip);
    return;
  }
  await TrayIcon.new({
    id: TRAY_ID,
    icon: (await defaultWindowIcon()) ?? undefined,
    tooltip: m.labels.tooltip,
    menu,
    showMenuOnLeftClick: true,
  });
}
