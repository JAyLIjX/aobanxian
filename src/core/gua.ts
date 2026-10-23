/**
 * 梅花易数时间起卦（纯函数）：
 *   先天八卦数 乾1 兌2 離3 震4 巽5 坎6 艮7 坤8；年支、时支 子1 … 亥12
 *   上卦 = (年支数 + 农历月 + 农历日) mod 8（0 作 8）
 *   下卦 = (年支数 + 农历月 + 农历日 + 时支数) mod 8（0 作 8）
 *   动爻 = (年支数 + 农历月 + 农历日 + 时支数) mod 6（0 作 6）
 * 本卦动爻阴阳互换得变卦；二至四爻、三至五爻组成互卦；动爻所在的经卦为用、另一个为体。
 */
import { controlledBy, generatedBy, type Element } from "./elements";

export type Trigram = "乾" | "兌" | "離" | "震" | "巽" | "坎" | "艮" | "坤";

/** 先天八卦数 1–8 对应的卦 */
export const TRIGRAM_BY_NUMBER: Trigram[] = ["坤", "乾", "兌", "離", "震", "巽", "坎", "艮", "坤"];

/** 每个卦的三爻，从下往上，1 为阳 */
export const TRIGRAM_LINES: Record<Trigram, [number, number, number]> = {
  乾: [1, 1, 1],
  兌: [1, 1, 0],
  離: [1, 0, 1],
  震: [1, 0, 0],
  巽: [0, 1, 1],
  坎: [0, 1, 0],
  艮: [0, 0, 1],
  坤: [0, 0, 0],
};

export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/** 地支序数：子 1 … 亥 12 */
export function branchNumber(branch: string): number {
  const i = BRANCHES.indexOf(branch);
  if (i < 0) throw new Error(`不是地支：${branch}`);
  return i + 1;
}

/** 时辰：23–1 点子时 … 21–23 点亥时 */
export function hourBranch(hour: number): string {
  return BRANCHES[Math.floor(((hour + 1) % 24) / 2)];
}

export interface CastInput {
  /** 农历年的地支 */
  yearBranch: string;
  /** 农历月（闰月按本月数） */
  lunarMonth: number;
  lunarDay: number;
  /** 时辰的地支 */
  hourBranch: string;
}

export interface Cast {
  upper: Trigram;
  lower: Trigram;
  /** 动爻 1–6，从下往上 */
  moving: number;
  /** 本卦六爻，从下往上 */
  lines: number[];
  changedUpper: Trigram;
  changedLower: Trigram;
  changedLines: number[];
}

const mod = (n: number, m: number) => n % m || m;

export function trigramOf(lines: number[]): Trigram {
  const key = lines.join("");
  return (Object.keys(TRIGRAM_LINES) as Trigram[]).find((t) => TRIGRAM_LINES[t].join("") === key)!;
}

export function cast(input: CastInput): Cast {
  const base = branchNumber(input.yearBranch) + input.lunarMonth + input.lunarDay;
  const withHour = base + branchNumber(input.hourBranch);
  const upper = TRIGRAM_BY_NUMBER[mod(base, 8)];
  const lower = TRIGRAM_BY_NUMBER[mod(withHour, 8)];
  const moving = mod(withHour, 6);
  const lines = [...TRIGRAM_LINES[lower], ...TRIGRAM_LINES[upper]];
  const changedLines = lines.map((l, i) => (i === moving - 1 ? 1 - l : l));
  return {
    upper,
    lower,
    moving,
    lines,
    changedUpper: trigramOf(changedLines.slice(3)),
    changedLower: trigramOf(changedLines.slice(0, 3)),
    changedLines,
  };
}

/** 爻位的传统称呼：初爻、二爻 …… 五爻、上爻 */
export const LINE_POSITIONS = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] as const;

/** 经卦的五行：乾兌金、離火、震巽木、坎水、艮坤土 */
export const TRIGRAM_ELEMENT: Record<Trigram, Element> = {
  乾: "金",
  兌: "金",
  離: "火",
  震: "木",
  巽: "木",
  坎: "水",
  艮: "土",
  坤: "土",
};

/** 互卦：本卦二至四爻为下卦、三至五爻为上卦 */
export function huGua(lines: number[]): { upper: Trigram; lower: Trigram; lines: number[] } {
  const lower = trigramOf(lines.slice(1, 4));
  const upper = trigramOf(lines.slice(2, 5));
  return { upper, lower, lines: [...lines.slice(1, 4), ...lines.slice(2, 5)] };
}

/**
 * 体用的五行关系：
 *   用生体、体克用、比和 → 顺；体生用、用克体 → 有阻力
 * （界面只用「顺」「有阻力」这类说法，不写「凶」）
 */
export type TiYongRelation = "yongShengTi" | "tiKeYong" | "biHe" | "tiShengYong" | "yongKeTi";

export interface TiYong {
  /** 体卦：没有动爻的那个经卦 */
  ti: Trigram;
  /** 用卦：动爻所在的经卦 */
  yong: Trigram;
  /** 用卦是下卦（动爻在一至三爻）还是上卦 */
  yongIs: "lower" | "upper";
  tiElement: Element;
  yongElement: Element;
  relation: TiYongRelation;
  tone: "smooth" | "resistance";
}

export function tiYongRelation(ti: Element, yong: Element): TiYongRelation {
  if (ti === yong) return "biHe";
  if (generatedBy(yong) === ti) return "yongShengTi";
  if (controlledBy(ti) === yong) return "tiKeYong";
  if (generatedBy(ti) === yong) return "tiShengYong";
  return "yongKeTi";
}

/** 梅花易数的体用：动爻所在的经卦为用，另一个为体 */
export function tiYong(c: Pick<Cast, "upper" | "lower" | "moving">): TiYong {
  const yongIs = c.moving <= 3 ? "lower" : "upper";
  const yong = yongIs === "lower" ? c.lower : c.upper;
  const ti = yongIs === "lower" ? c.upper : c.lower;
  const relation = tiYongRelation(TRIGRAM_ELEMENT[ti], TRIGRAM_ELEMENT[yong]);
  const tone = relation === "tiShengYong" || relation === "yongKeTi" ? "resistance" : "smooth";
  return { ti, yong, yongIs, tiElement: TRIGRAM_ELEMENT[ti], yongElement: TRIGRAM_ELEMENT[yong], relation, tone };
}
