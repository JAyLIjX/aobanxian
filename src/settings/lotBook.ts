/**
 * 签册与本机的求签种子，存在 store 里（只在本机）。
 */
import { addToBook, lotOfDay, newSalt, type LotRecord } from "../core/lots";
import { ymdKey, type Ymd } from "../core/dayBoundary";
import { getState, setState } from "./store";

export async function loadBook(): Promise<LotRecord[]> {
  const raw = await getState<unknown>("lotBook");
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is LotRecord => !!r && typeof r.date === "string" && Number.isInteger(r.n) && r.n >= 1 && r.n <= 100);
}

async function salt(): Promise<string> {
  let s = await getState<string>("lotSalt");
  if (!s) {
    s = newSalt();
    await setState("lotSalt", s);
  }
  return s;
}

/** 今天已经求过的签；没求过为 null */
export async function todaysLot(today: Ymd): Promise<LotRecord | null> {
  const key = ymdKey(today);
  return (await loadBook()).find((r) => r.date === key) ?? null;
}

/** 求今天的签并记进签册（今天已求过就返回原来那签） */
export async function drawToday(today: Ymd): Promise<{ record: LotRecord; book: LotRecord[] }> {
  const book = await loadBook();
  const key = ymdKey(today);
  const existing = book.find((r) => r.date === key);
  if (existing) return { record: existing, book };
  const record = { date: key, n: lotOfDay(today, await salt()) };
  const next = addToBook(book, record);
  await setState("lotBook", next);
  return { record, book: next };
}
