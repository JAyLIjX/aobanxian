/** 详情里可折叠的几栏展开了哪些：记在本机（localStorage），读写失败就当全部折叠 */
const KEY = "aobanxian.detail.open";

export function loadOpenSections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function saveOpenSections(open: Record<string, boolean>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(open));
  } catch {
    // 存不了就算了，下次打开还是折叠
  }
}
