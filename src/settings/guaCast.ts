/**
 * 每日一卦用「今天第一次起卦的时辰」：第一次打开时记下钟点，当天再打开用同一个钟点。
 */
import { ymdKey, type Ymd } from "../core/dayBoundary";
import { getState, setState } from "./store";

export async function castHourFor(today: Ymd, now: Date = new Date()): Promise<number> {
  const key = ymdKey(today);
  const saved = await getState<{ date: string; hour: number }>("guaCast");
  if (saved?.date === key && Number.isInteger(saved.hour)) return saved.hour;
  const hour = now.getHours();
  await setState("guaCast", { date: key, hour });
  return hour;
}
