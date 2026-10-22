/**
 * 每日一诗的选诗规则（纯函数）。按优先级：
 *   1. 传统节日当天用专属诗（对照表 festival → 诗）
 *   2. 节气当天用专属诗（对照表 jieqi → 诗）
 *   3. 满月前后两天（农历十三到十七），从当季写月亮的诗里选
 *   4. 其他日子：只从当季标签的诗里选
 * 3、4 在一年里按日期顺序分配：每个诗池按「年份 + 诗 id」的哈希排成固定顺序，依次取没用过的，
 * 用完一轮才重复。所以同一天永远是同一首，同一年内尽量不重复。
 */

export type Season = "春" | "夏" | "秋" | "冬";

export interface PoemMeta {
  id: string;
  role: "regular" | "moon" | "festival" | "jieqi";
  seasons: Season[];
  tags: string[];
}

export interface PoemDay {
  /** 当天所属季节（按节气：立春至谷雨为春……） */
  season: Season;
  /** 当天的传统节日（对照表里的名字，如「中秋」），没有为 null */
  festival: string | null;
  /** 当天交节气的节气名，没有为 null */
  jieqi: string | null;
  /** 农历日 1–30 */
  lunarDay: number;
}

export interface PoemTables {
  festival: Record<string, string>;
  jieqi: Record<string, string>;
}

export type PickReason = "festival" | "jieqi" | "moon" | "season";

/** 满月前后两天：农历十五前后各两天 */
export function nearFullMoon(lunarDay: number): boolean {
  return lunarDay >= 13 && lunarDay <= 17;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 一年里每一天的诗：days 按日期顺序排（通常是 1 月 1 日到 12 月 31 日） */
export function pickPoemsForYear(year: number, days: PoemDay[], poems: PoemMeta[], tables: PoemTables): { id: string; reason: PickReason }[] {
  // 节日、节气的专属诗只在当天出现，别的日子不选
  const reserved = new Set([...Object.values(tables.festival), ...Object.values(tables.jieqi)]);
  // 这一年已经用过的（所有诗池共用，写月亮的诗和当季的诗可能重叠）
  const used = new Set<string>();
  const pools = new Map<string, { order: string[]; next: number }>();
  const pool = (key: string, filter: (p: PoemMeta) => boolean) => {
    let p = pools.get(key);
    if (!p) {
      const order = poems
        .filter((x) => filter(x) && !reserved.has(x.id))
        .map((x) => x.id)
        .sort((a, b) => hash(`${year}:${a}`) - hash(`${year}:${b}`) || (a < b ? -1 : 1));
      p = { order, next: 0 };
      pools.set(key, p);
    }
    return p;
  };
  /** 按固定顺序取下一首没用过的；全都用过时 reuse 为 true 才重复（从固定顺序里接着轮） */
  const take = (p: { order: string[]; next: number }, reuse: boolean): string | null => {
    const n = p.order.length;
    for (let i = 0; i < n; i++) {
      const id = p.order[(p.next + i) % n];
      if (!used.has(id)) {
        used.add(id);
        p.next = (p.next + i + 1) % n;
        return id;
      }
    }
    if (!reuse || n === 0) return null;
    const id = p.order[p.next];
    p.next = (p.next + 1) % n;
    return id;
  };
  const inSeason = (s: Season) => (p: PoemMeta) => (p.role === "regular" || p.role === "moon") && p.seasons.includes(s);
  return days.map((d) => {
    const fest = d.festival ? tables.festival[d.festival] : undefined;
    if (fest) return { id: fest, reason: "festival" };
    const jq = d.jieqi ? tables.jieqi[d.jieqi] : undefined;
    if (jq) return { id: jq, reason: "jieqi" };
    const season = pool(`season:${d.season}`, (p) => inSeason(d.season)(p) && p.role === "regular");
    if (nearFullMoon(d.lunarDay)) {
      const moon = take(pool(`moon:${d.season}`, (p) => inSeason(d.season)(p) && (p.role === "moon" || p.tags.includes("月"))), false);
      if (moon) return { id: moon, reason: "moon" };
    }
    const id = take(season, true);
    if (id) return { id, reason: "season" };
    // 没有当季的诗（数据不全时）：退回任意 regular
    return { id: take(pool("any", (p) => p.role === "regular"), true)!, reason: "season" };
  });
}
