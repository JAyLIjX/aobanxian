/**
 * 每日一诗：按儒略日轮流取，一轮里每首诗只出现一次，同一天所有电脑上都一样。
 */
export function poemIndexOfDay(julianDay: number, count: number): number {
  return ((julianDay % count) + count) % count;
}
