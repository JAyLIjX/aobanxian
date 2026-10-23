/**
 * 生成繁体中文（台湾）文字：先用 OpenCC 从简体转换，再套用下面的人工修正。
 *
 *   npx tsx scripts/i18n/build-zh-tw.ts
 *
 * 输出：
 *   locales/zh-TW.json        界面文字（OpenCC cn→twp，台湾用词，如「設定」「預設」）
 *                             + rulesText（四档文字、解释句、小贴士等，来自 rules/default.json）
 *   locales/zh-TW.terms.json  历法与宜忌词条的繁体对照（OpenCC cn→tw，只换字形、保持传统写法）
 *   locales/glossary.json     给缺少 zh-TW 的词补上（已有的不覆盖）
 *   assets/character/<id>/character.json   各角色口吻的 voice["zh-TW"]
 *   src/data/lots.json        签的白话总解、典故故事、分事项的 zh-TW（签诗原文不动）
 *   src/data/poems.json       每日一诗赏析的 zh-TW（诗文不动）
 *   src/data/zhouyi.json      每日一卦自撰白话的 zh-TW（卦辞、爻辞、彖传、象传原文不动）
 *
 * 人工检查后要改的词写进 UI_FIXES / TERM_FIXES，重新运行即可。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as OpenCC from "opencc-js";
import { getDayDetail } from "../../src/calendar/day";
import { getAlmanac } from "../../src/calendar/special";
import { defaultRules } from "../../src/core/rules";

const ROOT = join(import.meta.dirname, "../..");
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const write = (p: string, data: unknown) => writeFileSync(join(ROOT, p), JSON.stringify(data, null, 2) + "\n");

const toTwp = OpenCC.Converter({ from: "cn", to: "twp" });
const toTw = OpenCC.Converter({ from: "cn", to: "tw" });

/** 界面文字的人工修正（转换后再替换） */
const UI_FIXES: [string, string][] = [
  ["黃曆", "農民曆"], // 台湾通称农民历
  ["畫素", "像素"], // 像素画在台湾也叫像素
  ["衝", "沖"], // 黄历「冲煞」传统写作「沖」
  ["老農民曆", "農民曆"],
  ["演算法", "算法"], // 这里说的是传统历算，不是计算机算法
  ["型別", "類型"], // 「类型」被转成程序用语「型別」
];

/** 按键整句替换（台湾的惯用说法） */
const KEY_FIXES: Record<string, string> = {
  "menu.quit": "結束",
  "about.repo": "GitHub 儲存庫",
  "about.license": "以 MIT 授權開源",
};

/** 历法词条的人工修正 */
const TERM_FIXES: [string, string][] = [
  ["衝", "沖"],
  ["醜", "丑"], // 地支「丑」（丑时、丑土、乙丑）不是美醜的「醜」
];

/** 签文白话（叙事散文）的人工修正。不套 UI_FIXES：「衝→沖」只适用于黄历的沖煞，散文里「衝突」「衝動」要保留 */
const PROSE_FIXES: [string, string][] = [];

const fix = (s: string, fixes: [string, string][]) => fixes.reduce((acc, [a, b]) => acc.split(a).join(b), s);
const ui = (s: string) => fix(toTwp(s), UI_FIXES);
const term = (s: string) => fix(toTw(s), TERM_FIXES);
const prose = (s: string) => fix(toTwp(s), PROSE_FIXES);

function mapStrings(value: unknown, f: (s: string) => string): unknown {
  if (typeof value === "string") return f(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, f));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, f)]));
  }
  return value;
}

// 1. 界面文字
const zhCN = read("locales/zh-CN.json");
const zhTW = mapStrings(zhCN, ui) as Record<string, unknown>;
for (const [path, value] of Object.entries(KEY_FIXES)) {
  const keys = path.split(".");
  let obj = zhTW as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) obj = obj[k] as Record<string, unknown>;
  obj[keys[keys.length - 1]] = value;
}
// 语言选项名称本身不转换
(zhTW.settings as { languageOptions: unknown }).languageOptions = (zhCN.settings as { languageOptions: unknown }).languageOptions;
const rules = read("rules/default.json");
zhTW.rulesText = {
  tiers: mapStrings(rules.tierLabels, ui),
  explanation: ui(rules.explanation).replace(/\{(\w+)\}/g, "{{$1}}"),
  xiuLuck: mapStrings(rules.xiuLuckLabels, ui),
  tips: mapStrings(rules.tips, ui),
};
write("locales/zh-TW.json", zhTW);

// 2. 历法词条：1901–2099 年每一天详情里出现过的所有词
const terms = new Set<string>();
const add = (s: unknown) => {
  if (typeof s === "string" && /[一-鿿]/.test(s)) terms.add(s);
  else if (Array.isArray(s)) s.forEach(add);
  else if (s && typeof s === "object") Object.values(s).forEach(add);
};
for (let d = new Date(1901, 0, 1); d <= new Date(2099, 11, 31); d.setDate(d.getDate() + 1)) {
  const ymd = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  add(getDayDetail(ymd, defaultRules));
  add(getAlmanac(ymd));
}
add(rules.palettes);
add(rules.pixelRamps);
const glossary = read("locales/glossary.json");
for (const [cat, entries] of Object.entries(glossary)) {
  if (cat.startsWith("$")) continue;
  for (const k of Object.keys(entries as object)) terms.add(k);
}
const termMap: Record<string, string> = {};
for (const s of [...terms].sort()) {
  const t = term(s);
  if (t !== s) termMap[s] = t;
}
write("locales/zh-TW.terms.json", { $comment: "由 scripts/i18n/build-zh-tw.ts 生成：简体词条 → 繁体（台湾）。不要手改，修正写进脚本的 TERM_FIXES。", ...termMap });

// 3. 术语表补 zh-TW（词条逐条转换；宜忌的白话解释按界面文字转换）
for (const [cat, entries] of Object.entries(glossary)) {
  if (cat.startsWith("$")) continue;
  for (const [zh, tr] of Object.entries(entries as Record<string, Record<string, unknown>>)) {
    tr["zh-TW"] ??= term(zh);
    const desc = tr.desc as Record<string, string> | undefined;
    if (desc?.["zh-CN"]) desc["zh-TW"] ??= ui(desc["zh-CN"]);
  }
}
write("locales/glossary.json", glossary);

// 4. 各角色的口吻（assets/character/<id>/character.json 的 voice）：按界面文字转换
for (const id of readdirSync(join(ROOT, "assets/character"))) {
  const file = `assets/character/${id}/character.json`;
  if (!existsSync(join(ROOT, file))) continue;
  const meta = read(file);
  if (!meta.voice?.["zh-CN"]) continue;
  meta.voice["zh-TW"] = mapStrings(meta.voice["zh-CN"], ui);
  write(file, meta);
}

// 5. 签文：白话总解、典故故事、分事项（自撰的简体 → 繁体）。签诗、典故标题是古籍原文，本来就是繁体，不动
type Tri = Record<string, string>;
const lotsFile = read("src/data/lots.json");
for (const lot of lotsFile.lots as { reading: Tri; tale?: Tri; aspects?: Record<string, Tri> }[]) {
  const tw = (x?: Tri) => {
    if (x?.["zh-CN"]) x["zh-TW"] = prose(x["zh-CN"]);
  };
  tw(lot.reading);
  tw(lot.tale);
  for (const a of Object.values(lot.aspects ?? {})) tw(a);
}
write("src/data/lots.json", lotsFile);

// 7. 每日一卦的自撰白话（卦象画面、彖传和大象传白话、一句话、主题短语）
const zhouyiFile = read("src/data/zhouyi.json");
for (const h of zhouyiFile.hexagrams as Record<string, unknown>[]) {
  for (const k of ["image", "tuanPlain", "daxiangPlain", "brief", "theme"]) {
    const x = h[k] as Tri | undefined;
    if (x?.["zh-CN"]) x["zh-TW"] = prose(x["zh-CN"]);
  }
}
write("src/data/zhouyi.json", zhouyiFile);

// 6. 每日一诗的赏析（诗文本身的简繁由 scripts/poems/build-poems.ts 生成）
const poemsFile = read("src/data/poems.json");
for (const poem of poemsFile.poems as { appreciation: Tri }[]) {
  if (poem.appreciation["zh-CN"]) poem.appreciation["zh-TW"] = prose(poem.appreciation["zh-CN"]);
}
write("src/data/poems.json", poemsFile);

console.log(`zh-TW.json 已生成；历法词条 ${terms.size} 个，其中 ${Object.keys(termMap).length} 个字形不同`);
