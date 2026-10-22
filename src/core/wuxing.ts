/**
 * 五行穿衣规则：按「旺相休囚死」给五行分档，并决定小人的主色与点缀色。
 *
 *   旺：与当日五行 D 相同 → 大吉
 *   相：D 所生          → 大吉
 *   休：生 D 者         → 平
 *   囚：克 D 者         → 慎穿
 *   死：D 所克          → 不宜
 */
import {
  branchElement,
  controlledBy,
  controllerOf,
  generatedBy,
  generatorOf,
  nayinElement,
  stemElement,
  type Element,
} from "./elements";
import type { ColorSwatch, ElementSource, Rules, TierKey } from "./rules";

export type Phase = "wang" | "xiang" | "xiu" | "qiu" | "si";

export const PHASE_NAMES: Record<Phase, string> = {
  wang: "旺",
  xiang: "相",
  xiu: "休",
  qiu: "囚",
  si: "死",
};

const PHASE_TIER: Record<Phase, TierKey> = {
  wang: "best",
  xiang: "best",
  xiu: "neutral",
  qiu: "caution",
  si: "avoid",
};

/** 当日五行 D 下，每个旺相休囚死对应哪个五行 */
export function phasesOf(d: Element): Record<Phase, Element> {
  return {
    wang: d,
    xiang: generatedBy(d),
    xiu: generatorOf(d),
    qiu: controllerOf(d),
    si: controlledBy(d),
  };
}

/** 计算当日五行所需的干支信息 */
export interface DayPillar {
  /** 日柱纳音，如「松柏木」 */
  nayin: string;
  /** 日干，如「庚」 */
  stem: string;
  /** 日支，如「子」 */
  branch: string;
}

export interface DayElement {
  element: Element;
  source: ElementSource;
  /** 用于解释句的说法：纳音取法是「松柏木」，日干取法是「庚金」，日支取法是「子水」 */
  label: string;
}

export function dayElement(pillar: DayPillar, source: ElementSource): DayElement {
  switch (source) {
    case "nayin": {
      const element = nayinElement(pillar.nayin);
      return { element, source, label: pillar.nayin };
    }
    case "stem": {
      const element = stemElement(pillar.stem);
      return { element, source, label: `${pillar.stem}${element}` };
    }
    case "branch": {
      const element = branchElement(pillar.branch);
      return { element, source, label: `${pillar.branch}${element}` };
    }
  }
}

export interface TierEntry {
  phase: Phase;
  element: Element;
  colors: ColorSwatch[];
}

export interface Tier {
  key: TierKey;
  label: string;
  entries: TierEntry[];
}

export interface Outfit {
  day: DayElement;
  phases: Record<Phase, Element>;
  /**
   * 四档，顺序固定为 大吉 / 平 / 慎穿 / 不宜。
   * 大吉的两个（相、旺）地位平等，界面上总是相在前、旺在后。
   */
  tiers: Tier[];
  /** 小人身上大面积的颜色（道袍）。只用于画小人，界面文字不区分主次 */
  primary: ColorSwatch & { element: Element; phase: Phase };
  /** 小人身上小面积的颜色（腰带） */
  accent: ColorSwatch & { element: Element; phase: Phase };
  explanation: string;
}

/** 把 {key} 占位符替换为对应值；未知占位符原样保留 */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? vars[key] : m));
}

export function buildOutfit(pillar: DayPillar, rules: Rules): Outfit {
  const day = dayElement(pillar, rules.elementSource);
  const phases = phasesOf(day.element);

  // 大吉的相、旺平等，界面上总是相在前
  const order: Phase[] = ["xiang", "wang", "xiu", "qiu", "si"];
  // topPriority 只决定哪个颜色画在小人身上的大面积（道袍）
  const bodyOrder: Phase[] = rules.topPriority === "xiang" ? ["xiang", "wang"] : ["wang", "xiang"];

  const tiers: Tier[] = (["best", "neutral", "caution", "avoid"] as const).map((key) => ({
    key,
    label: rules.tierLabels[key],
    entries: order
      .filter((p) => PHASE_TIER[p] === key)
      .map((phase) => ({ phase, element: phases[phase], colors: rules.palettes[phases[phase]] })),
  }));

  const [primaryPhase, accentPhase] = bodyOrder;
  const swatch = (phase: Phase) => ({
    ...rules.palettes[phases[phase]][0],
    element: phases[phase],
    phase,
  });
  const primary = swatch(primaryPhase);
  const accent = swatch(accentPhase);

  const fam = rules.colorFamilies;
  const explanation = fillTemplate(rules.explanation, {
    label: day.label,
    D: day.element,
    wang: phases.wang,
    xiang: phases.xiang,
    xiu: phases.xiu,
    qiu: phases.qiu,
    si: phases.si,
    wangChar: fam[phases.wang].char,
    xiangChar: fam[phases.xiang].char,
    wangFamily: fam[phases.wang].name,
    xiangFamily: fam[phases.xiang].name,
  });

  return { day, phases, tiers, primary, accent, explanation };
}

/** 按日期轮换取一条当日五行的小贴士；dayIndex 可用儒略日等任意连续整数 */
export function pickTip(element: Element, dayIndex: number, rules: Rules): string | null {
  const list = rules.tips[element];
  if (!list || list.length === 0) return null;
  const i = ((dayIndex % list.length) + list.length) % list.length;
  return list[i];
}
