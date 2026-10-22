/**
 * 五行基础：生克关系，以及天干、地支、纳音到五行的对照。
 * 纯函数模块，不依赖界面或历法库。
 */

export const ELEMENTS = ["木", "火", "土", "金", "水"] as const;
export type Element = (typeof ELEMENTS)[number];

/** 相生：木生火，火生土，土生金，金生水，水生木 */
const GENERATES: Record<Element, Element> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

/** 相克：木克土，土克水，水克火，火克金，金克木 */
const CONTROLS: Record<Element, Element> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

export function isElement(value: string): value is Element {
  return (ELEMENTS as readonly string[]).includes(value);
}

/** e 所生的五行 */
export function generatedBy(e: Element): Element {
  return GENERATES[e];
}

/** 生 e 的五行 */
export function generatorOf(e: Element): Element {
  return ELEMENTS.find((x) => GENERATES[x] === e)!;
}

/** e 所克的五行 */
export function controlledBy(e: Element): Element {
  return CONTROLS[e];
}

/** 克 e 的五行 */
export function controllerOf(e: Element): Element {
  return ELEMENTS.find((x) => CONTROLS[x] === e)!;
}

export const STEM_ELEMENT: Record<string, Element> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

export const BRANCH_ELEMENT: Record<string, Element> = {
  寅: "木",
  卯: "木",
  巳: "火",
  午: "火",
  辰: "土",
  戌: "土",
  丑: "土",
  未: "土",
  申: "金",
  酉: "金",
  亥: "水",
  子: "水",
};

/** 纳音的五行即纳音名的最后一个字，如「松柏木」→ 木 */
export function nayinElement(nayin: string): Element {
  const last = nayin.trim().slice(-1);
  if (!isElement(last)) {
    throw new Error(`无法从纳音「${nayin}」取得五行`);
  }
  return last;
}

export function stemElement(stem: string): Element {
  const e = STEM_ELEMENT[stem];
  if (!e) throw new Error(`未知天干「${stem}」`);
  return e;
}

export function branchElement(branch: string): Element {
  const e = BRANCH_ELEMENT[branch];
  if (!e) throw new Error(`未知地支「${branch}」`);
  return e;
}
