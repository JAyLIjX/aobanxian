/**
 * 幸运数字：按河图数配五行（天一生水，地六成之；地二生火，天七成之；天三生木，地八成之；
 * 地四生金，天九成之；天五生土，地十成之）。
 */
import type { Element } from "./elements";

export const HETU: Record<Element, [number, number]> = {
  水: [1, 6],
  火: [2, 7],
  木: [3, 8],
  金: [4, 9],
  土: [5, 10],
};

/** 今天两个大吉色的五行（相在前、旺在后）→ 幸运数字，如 土、火 → 5、10、2、7 */
export function luckyNumbers(elements: readonly Element[]): number[] {
  return elements.flatMap((e) => HETU[e]);
}
