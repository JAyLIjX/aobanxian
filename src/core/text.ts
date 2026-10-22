/**
 * 按「字」（字素）切分和计数：一个汉字、一个字母、一个 emoji（含肤色、ZWJ 组合、国旗）都算 1 个。
 * 用 Intl.Segmenter；没有时退回按码点切（大多数情况一样，只有组合 emoji 会多算）。
 */
const segmenter: Intl.Segmenter | null =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("zh", { granularity: "grapheme" }) : null;

export function splitChars(s: string): string[] {
  if (!segmenter) return [...s];
  return Array.from(segmenter.segment(s), (x) => x.segment);
}

export function countChars(s: string): number {
  return splitChars(s).length;
}
