/**
 * 规则配置的类型与校验。默认规则见 rules/default.json。
 */
import { ELEMENTS, type Element } from "./elements";
import defaultRulesJson from "../../rules/default.json";

/** 当日五行取法：纳音最后一字 / 日干 / 日支 */
export type ElementSource = "nayin" | "stem" | "branch";
/** 哪一档当主色（上衣）：相（日所生）或 旺（与日相同） */
export type TopPriority = "xiang" | "wang";
/** 换日时刻：午夜，或 23:00 子时 */
export type DayBoundary = "midnight" | "zi";

export type TierKey = "best" | "neutral" | "caution" | "avoid";
export const TIER_KEYS: readonly TierKey[] = ["best", "neutral", "caution", "avoid"];

export interface ColorSwatch {
  name: string;
  hex: string;
  /** 对应的中国传统色名，如「银朱」，可省略 */
  traditional?: string;
}

/** 像素道士换色用的一档颜色 */
export interface RampLevel {
  level: string;
  traditional?: string;
  hex: string;
}

/** 暗 / 中 / 亮 三档 */
export type PixelRamp = [RampLevel, RampLevel, RampLevel];

export interface Rules {
  name: string;
  elementSource: ElementSource;
  topPriority: TopPriority;
  dayBoundary: DayBoundary;
  tierLabels: Record<TierKey, string>;
  /** 每个五行的色系；列表第一个颜色是该五行的代表色，小人穿的就是它 */
  palettes: Record<Element, ColorSwatch[]>;
  /** 每个五行的像素色阶（暗、中、亮），道袍、腰带按深浅档替换成这三个颜色 */
  pixelRamps: Record<Element, PixelRamp>;
  /** 解释句模板，按 topPriority 选用 */
  explanation: Record<TopPriority, string>;
  /** 星宿吉凶的显示文字（界面不出现「凶」字） */
  xiuLuckLabels: Record<string, string>;
  /** 按当日五行轮换显示的生活小贴士 */
  tips: Record<Element, string[]>;
}

function fail(msg: string): never {
  throw new Error(`规则配置有误：${msg}`);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(`${field} 应为 ${allowed.join(" / ")}，实际是 ${JSON.stringify(value)}`);
  }
  return value as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 校验并返回规则；字段缺失或取值不合法时抛出带中文说明的错误 */
export function parseRules(input: unknown): Rules {
  if (!isRecord(input)) fail("顶层应为对象");
  const r = input;

  const elementSource = oneOf(r.elementSource, ["nayin", "stem", "branch"] as const, "elementSource");
  const topPriority = oneOf(r.topPriority, ["xiang", "wang"] as const, "topPriority");
  const dayBoundary = oneOf(r.dayBoundary, ["midnight", "zi"] as const, "dayBoundary");

  if (!isRecord(r.tierLabels)) fail("缺少 tierLabels");
  const tierLabels = {} as Record<TierKey, string>;
  for (const k of TIER_KEYS) {
    const v = r.tierLabels[k];
    if (typeof v !== "string" || !v) fail(`tierLabels.${k} 应为非空字符串`);
    tierLabels[k] = v;
  }

  if (!isRecord(r.palettes)) fail("缺少 palettes");
  const palettes = {} as Record<Element, ColorSwatch[]>;
  for (const e of ELEMENTS) {
    const list = r.palettes[e];
    if (!Array.isArray(list) || list.length === 0) fail(`palettes.${e} 至少需要一个颜色`);
    palettes[e] = list.map((c, i) => {
      if (!isRecord(c) || typeof c.name !== "string" || typeof c.hex !== "string") {
        fail(`palettes.${e}[${i}] 应为 { name, hex }`);
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(c.hex)) fail(`palettes.${e}[${i}].hex 应为 #RRGGBB`);
      const swatch: ColorSwatch = { name: c.name, hex: c.hex };
      if (typeof c.traditional === "string") swatch.traditional = c.traditional;
      return swatch;
    });
  }

  if (!isRecord(r.pixelRamps)) fail("缺少 pixelRamps");
  const pixelRamps = {} as Record<Element, PixelRamp>;
  for (const e of ELEMENTS) {
    const list = r.pixelRamps[e];
    if (!Array.isArray(list) || list.length !== 3) fail(`pixelRamps.${e} 应为暗、中、亮三档`);
    pixelRamps[e] = list.map((c, i) => {
      if (!isRecord(c) || typeof c.hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(c.hex)) {
        fail(`pixelRamps.${e}[${i}].hex 应为 #RRGGBB`);
      }
      const level: RampLevel = { level: typeof c.level === "string" ? c.level : String(i), hex: c.hex };
      if (typeof c.traditional === "string") level.traditional = c.traditional;
      return level;
    }) as PixelRamp;
  }

  if (!isRecord(r.explanation)) fail("缺少 explanation");
  const explanation = {} as Record<TopPriority, string>;
  for (const k of ["xiang", "wang"] as const) {
    const v = r.explanation[k];
    if (typeof v !== "string") fail(`explanation.${k} 应为字符串`);
    explanation[k] = v;
  }

  const xiuLuckLabels: Record<string, string> = {};
  if (r.xiuLuckLabels !== undefined) {
    if (!isRecord(r.xiuLuckLabels)) fail("xiuLuckLabels 应为对象");
    for (const [k, v] of Object.entries(r.xiuLuckLabels)) {
      if (typeof v !== "string") fail(`xiuLuckLabels.${k} 应为字符串`);
      xiuLuckLabels[k] = v;
    }
  }

  const tips = {} as Record<Element, string[]>;
  for (const e of ELEMENTS) {
    const list = isRecord(r.tips) ? r.tips[e] : undefined;
    tips[e] = Array.isArray(list) ? list.filter((t): t is string => typeof t === "string") : [];
  }

  return {
    name: typeof r.name === "string" ? r.name : "未命名流派",
    elementSource,
    topPriority,
    dayBoundary,
    tierLabels,
    palettes,
    pixelRamps,
    explanation,
    xiuLuckLabels,
    tips,
  };
}

export const defaultRules: Rules = parseRules(defaultRulesJson);

/** 在默认规则上覆盖部分字段（测试和日后的设置界面用） */
export function withRules(overrides: Partial<Rules>, base: Rules = defaultRules): Rules {
  return parseRules({ ...base, ...overrides });
}
