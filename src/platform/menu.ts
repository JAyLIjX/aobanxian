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

export interface MenuModel {
  labels: {
    divine: string;
    detail: string;
    toggleCalendar: string;
    size: string;
    sizes: Record<FigureSize, string>;
    onTop: string;
    settings: string;
    about: string;
    quit: string;
    tooltip: string;
  };
  size: FigureSize;
  onTop: boolean;
  actions: {
    divine: () => void;
    detail: () => void;
    toggleCalendar: () => void;
    setSize: (s: FigureSize) => void;
    toggleOnTop: () => void;
    settings: () => void;
    about: () => void;
    quit: () => void;
  };
}

async function buildMenu(m: MenuModel): Promise<Menu> {
  const sep = () => PredefinedMenuItem.new({ item: "Separator" });
  const sizes = await Promise.all(
    (["small", "medium", "large"] as const).map((s) =>
      CheckMenuItem.new({ text: m.labels.sizes[s], checked: m.size === s, action: () => m.actions.setSize(s) }),
    ),
  );
  return Menu.new({
    items: [
      await MenuItem.new({ text: m.labels.divine, action: m.actions.divine }),
      await MenuItem.new({ text: m.labels.detail, action: m.actions.detail }),
      await MenuItem.new({ text: m.labels.toggleCalendar, action: m.actions.toggleCalendar }),
      await sep(),
      await Submenu.new({ text: m.labels.size, items: sizes }),
      await CheckMenuItem.new({ text: m.labels.onTop, checked: m.onTop, action: m.actions.toggleOnTop }),
      await MenuItem.new({ text: m.labels.settings, action: m.actions.settings }),
      await sep(),
      await MenuItem.new({ text: m.labels.about, action: m.actions.about }),
      await MenuItem.new({ text: m.labels.quit, action: m.actions.quit }),
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
