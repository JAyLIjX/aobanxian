/**
 * 右键菜单与托盘菜单：同一份菜单定义，用 Tauri 原生菜单 API。
 * 右键菜单在鼠标位置弹出系统样式菜单；托盘菜单内容一致
 * （Windows 的托盘图标常被折叠，右键道士是主入口）。
 *
 * 注意：Tauri 的 popup 命令在菜单打开期间一直占着这个网页的菜单资源表锁，
 * 菜单开着时再调任何菜单接口（新建菜单项、换托盘菜单……）都会在主线程上死锁，整个程序卡死。
 * 所以这里的菜单操作全部排队、一次只做一件，菜单开着时托盘的更新等它关了再做；
 * 文字、勾选没变就不重建菜单，菜单项的动作总是调用最新的 MenuModel。
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

/** 建好的菜单和它用到的全部资源（换掉时一起释放） */
interface Built {
  menu: Menu;
  resources: { close(): Promise<void> }[];
}

/** 最新的菜单模型；菜单项点击时按它执行，所以动作变了不用重建菜单 */
let latest: MenuModel | null = null;
let popupOpen = false;
let queue: Promise<unknown> = Promise.resolve();
let popupMenu: { key: string; built: Built } | null = null;
let trayKey = "";
let trayMenu: Built | null = null;

/** 菜单长什么样：文字、尺寸勾选、置顶勾选 */
export function menuKey(m: MenuModel): string {
  return JSON.stringify([m.labels, m.size, m.onTop]);
}

/** 菜单操作排队，一次只做一件 */
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

async function release(b: Built | null): Promise<void> {
  if (!b) return;
  for (const r of b.resources) await r.close().catch(() => {});
}

async function buildMenu(m: MenuModel): Promise<Built> {
  const resources: Built["resources"] = [];
  const keep = <T extends { close(): Promise<void> }>(r: T) => (resources.push(r), r);
  const run = (f: (a: MenuModel["actions"]) => void) => () => {
    if (latest) f(latest.actions);
  };
  const sep = async () => keep(await PredefinedMenuItem.new({ item: "Separator" }));
  const sizes: CheckMenuItem[] = [];
  for (const s of ["small", "medium", "large"] as const) {
    sizes.push(keep(await CheckMenuItem.new({ text: m.labels.sizes[s], checked: m.size === s, action: run((a) => a.setSize(s)) })));
  }
  const item = async (a: Action) => keep(await MenuItem.new({ text: m.labels[a], action: run((x) => x[a]()) }));
  // 顺序：掐指一算、求签、每日一卦 ／ 今日详情、展开或收起日历 ／ 择日、纪念日、分享今日 ／
  //       小人尺寸、置顶、设置 ／ 关于、退出
  const items = [
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
    keep(await Submenu.new({ text: m.labels.size, items: sizes })),
    keep(await CheckMenuItem.new({ text: m.labels.onTop, checked: m.onTop, action: run((a) => a.toggleOnTop()) })),
    await item("settings"),
    await sep(),
    await item("about"),
    await item("quit"),
  ];
  const menu = keep(await Menu.new({ items }));
  return { menu, resources };
}

/** 右键菜单是否开着（开着时窗口会失焦，不要因此收起日历） */
export function isContextMenuOpen(): boolean {
  return popupOpen;
}

/** 在鼠标位置弹出右键菜单；菜单关了才返回 */
export function popupContextMenu(m: MenuModel): Promise<void> {
  if (!inTauri || popupOpen) return Promise.resolve();
  latest = m;
  return serial(async () => {
    const key = menuKey(m);
    if (!popupMenu || popupMenu.key !== key) {
      const old = popupMenu;
      popupMenu = { key, built: await buildMenu(m) };
      await release(old?.built ?? null);
    }
    popupOpen = true;
    try {
      await popupMenu.built.menu.popup();
    } finally {
      popupOpen = false;
    }
  });
}

const TRAY_ID = "aobanxian-tray";

/** 创建或更新托盘图标的菜单（语言、设置变化时调用）；样子没变只更新动作 */
export function syncTray(m: MenuModel): Promise<void> {
  if (!inTauri) return Promise.resolve();
  latest = m;
  const key = menuKey(m);
  if (key === trayKey) return Promise.resolve();
  trayKey = key;
  return serial(async () => {
    // 排队期间又有新的样子，交给后面那次
    if (!latest || menuKey(latest) !== key) return;
    try {
      const built = await buildMenu(latest);
      const existing = await TrayIcon.getById(TRAY_ID);
      if (existing) {
        await existing.setMenu(built.menu);
        await existing.setTooltip(latest.labels.tooltip);
      } else {
        await TrayIcon.new({
          id: TRAY_ID,
          icon: (await defaultWindowIcon()) ?? undefined,
          tooltip: latest.labels.tooltip,
          menu: built.menu,
          showMenuOnLeftClick: true,
        });
      }
      const old = trayMenu;
      trayMenu = built;
      await release(old);
    } catch (err) {
      trayKey = "";
      console.error("更新托盘菜单失败", err);
    }
  });
}
