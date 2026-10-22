/**
 * 生肖关系对照表：六合、三合、六冲。以地支为键。
 */

export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export type Branch = (typeof BRANCHES)[number];

export const ZODIAC: Record<Branch, string> = {
  子: "鼠",
  丑: "牛",
  寅: "虎",
  卯: "兔",
  辰: "龙",
  巳: "蛇",
  午: "马",
  未: "羊",
  申: "猴",
  酉: "鸡",
  戌: "狗",
  亥: "猪",
};

/** 六合：子丑、寅亥、卯戌、辰酉、巳申、午未 */
const SIX_HARMONY_PAIRS: [Branch, Branch][] = [
  ["子", "丑"],
  ["寅", "亥"],
  ["卯", "戌"],
  ["辰", "酉"],
  ["巳", "申"],
  ["午", "未"],
];

/** 三合：申子辰、亥卯未、寅午戌、巳酉丑 */
const THREE_HARMONY_GROUPS: [Branch, Branch, Branch][] = [
  ["申", "子", "辰"],
  ["亥", "卯", "未"],
  ["寅", "午", "戌"],
  ["巳", "酉", "丑"],
];

/** 六冲：子午、丑未、寅申、卯酉、辰戌、巳亥 */
const SIX_CLASH_PAIRS: [Branch, Branch][] = [
  ["子", "午"],
  ["丑", "未"],
  ["寅", "申"],
  ["卯", "酉"],
  ["辰", "戌"],
  ["巳", "亥"],
];

function asBranch(b: string): Branch {
  if (!(BRANCHES as readonly string[]).includes(b)) throw new Error(`未知地支「${b}」`);
  return b as Branch;
}

function partner(pairs: [Branch, Branch][], b: Branch): Branch {
  const pair = pairs.find(([x, y]) => x === b || y === b)!;
  return pair[0] === b ? pair[1] : pair[0];
}

export function sixHarmony(branch: string): Branch {
  return partner(SIX_HARMONY_PAIRS, asBranch(branch));
}

/** 与该地支三合的另外两支 */
export function threeHarmony(branch: string): [Branch, Branch] {
  const b = asBranch(branch);
  const group = THREE_HARMONY_GROUPS.find((g) => g.includes(b))!;
  return group.filter((x) => x !== b) as [Branch, Branch];
}

export function sixClash(branch: string): Branch {
  return partner(SIX_CLASH_PAIRS, asBranch(branch));
}

export interface ZodiacRelation {
  branch: Branch;
  animal: string;
}

const rel = (b: Branch): ZodiacRelation => ({ branch: b, animal: ZODIAC[b] });

/** 当日吉生肖（与日支六合、三合）与相冲生肖 */
export function zodiacRelations(dayBranch: string) {
  const b = asBranch(dayBranch);
  return {
    sixHarmony: rel(sixHarmony(b)),
    threeHarmony: threeHarmony(b).map(rel) as [ZodiacRelation, ZodiacRelation],
    clash: rel(sixClash(b)),
  };
}
