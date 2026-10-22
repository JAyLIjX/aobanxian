/**
 * 幡上的字：点一下幡换下一项。纯函数，不依赖界面。
 *
 * 循环：第一项 → 宜事 → 忌事 → 大吉色 → 吉生肖 → 回到第一项
 * 第一项平时是 bannerText（默认「奥半仙」），特殊日子换成特殊文字。
 * 每一项竖排，最多 4 个字。
 */

export const MAX_BANNER_CHARS = 4;
/** 停这么久没操作就回到第一项 */
export const BANNER_RESET_MS = 8000;

export type BannerKind = "brand" | "special" | "yi" | "ji" | "colors" | "zodiac";

export interface BannerItem {
  kind: BannerKind;
  /** 幡上的中文，最多 4 个字 */
  text: string;
  /** 翻译用：宜忌词、颜色单字、生肖等原词 */
  terms: string[];
}

export interface BannerConfig {
  bannerText: string;
  banner: {
    yiPrefix: string;
    jiPrefix: string;
    noYi: string;
    noJi: string;
    luckyColors: string;
    zodiac: string;
    skipWords: string[];
  };
}

export interface BannerInput {
  yi: string[];
  ji: string[];
  /** 两个大吉色的单字，相在前、旺在后（如「红」「绿」） */
  luckyColors: [string, string];
  /** 吉生肖：六合在前，三合在后 */
  luckyAnimals: string[];
  /** 特殊日子的幡面文字（没有则为 null） */
  specialText: string | null;
}

const chars = (s: string) => [...s];
const fits = (s: string) => chars(s).length <= MAX_BANNER_CHARS;

/** 截到最多 4 个字 */
export function clampBannerText(s: string): string {
  return chars(s).slice(0, MAX_BANNER_CHARS).join("");
}

/**
 * 宜 / 忌事：按列表顺序取第一个能放下的具体事项，
 * 跳过「馀事勿取」这类非具体事项和加上前缀后超过 4 个字的；一个都没有就用兜底文字。
 */
export function pickActivity(list: string[], prefix: string, fallback: string, skip: string[]): { text: string; term: string | null } {
  const skipSet = new Set(skip);
  for (const word of list) {
    if (skipSet.has(word)) continue;
    const text = prefix + word;
    if (fits(text)) return { text, term: word };
  }
  return { text: fallback, term: null };
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

export function buildBannerItems(input: BannerInput, config: BannerConfig): BannerItem[] {
  const b = config.banner;
  const first: BannerItem = input.specialText
    ? { kind: "special", text: clampBannerText(input.specialText), terms: [input.specialText] }
    : { kind: "brand", text: clampBannerText(config.bannerText), terms: [] };

  const yi = pickActivity(input.yi, b.yiPrefix, b.noYi, b.skipWords);
  const ji = pickActivity(input.ji, b.jiPrefix, b.noJi, b.skipWords);

  const [c1, c2] = input.luckyColors;
  const colors = clampBannerText(fill(b.luckyColors, { first: c1, second: c2 }));

  const animals = input.luckyAnimals.join("");
  const zodiac = clampBannerText(fill(b.zodiac, { animals }));

  return [
    first,
    { kind: "yi", text: yi.text, terms: yi.term ? [yi.term] : [] },
    { kind: "ji", text: ji.text, terms: ji.term ? [ji.term] : [] },
    { kind: "colors", text: colors, terms: [c1, c2] },
    { kind: "zodiac", text: zodiac, terms: input.luckyAnimals },
  ];
}

/** 点幡后的下一项序号 */
export function nextBannerIndex(index: number, count: number): number {
  return (index + 1) % count;
}

/** 按距上次点击的时间决定当前该显示哪一项：超过 8 秒回到第一项 */
export function bannerIndexAt(index: number, lastClickAt: number, now: number): number {
  return now - lastClickAt >= BANNER_RESET_MS ? 0 : index;
}
