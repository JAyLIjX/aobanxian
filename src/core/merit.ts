/**
 * 功德：小和尚每敲一下木鱼加一。累计数存在本机（store 的 merit 键）。
 */
export function sanitizeMerit(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

export function addMerit(prev: number, n = 1): number {
  return sanitizeMerit(prev) + Math.max(0, Math.floor(n));
}
