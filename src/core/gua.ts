/**
 * 梅花易数时间起卦（纯函数）：
 *   先天八卦数 乾1 兌2 離3 震4 巽5 坎6 艮7 坤8；年支、时支 子1 … 亥12
 *   上卦 = (年支数 + 农历月 + 农历日) mod 8（0 作 8）
 *   下卦 = (年支数 + 农历月 + 农历日 + 时支数) mod 8（0 作 8）
 *   动爻 = (年支数 + 农历月 + 农历日 + 时支数) mod 6（0 作 6）
 * 本卦动爻阴阳互换得变卦。
 */
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
