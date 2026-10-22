/**
 * 收集界面可能显示的全部字符，生成字体子集化用的字表。
 *
 *   glyphs-body.txt     正文字体（霞鹜文楷）：界面文字 + 1901–2099 年每一天的详情内容
 *   glyphs-display.txt  大字字体（马善政 / 志莽行书）：日期数字、农历标题、黄历签
 *
 * 由 scripts/fonts/subset-fonts.sh 调用，一般不需要单独运行。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { getDayDetail } from "../../src/calendar/day";
import { defaultRules } from "../../src/core/rules";

const ROOT = join(import.meta.dirname, "../..");
const OUT_DIR = import.meta.dirname;

const body = new Set<string>();
const display = new Set<string>();
const addAll = (set: Set<string>, text: string) => {
  for (const ch of text) if (ch !== "\n" && ch !== "\r" && ch !== "\t") set.add(ch);
};

// 1. ASCII 可打印字符和常用中文标点
for (let c = 0x20; c <= 0x7e; c++) body.add(String.fromCharCode(c));
addAll(body, "，。、；：？！“”‘’（）《》〈〉【】「」—…·／～　‹›×");

// 2. 源码、规则、配置里出现的所有字符（界面文案、小贴士、色名等）
function walk(dir: string, exts: string[]) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, exts);
    else if (exts.some((e) => name.endsWith(e))) addAll(body, readFileSync(path, "utf8"));
  }
}
walk(join(ROOT, "src"), [".ts", ".tsx", ".css"]);
walk(join(ROOT, "rules"), [".json"]);
walk(join(ROOT, "config"), [".json"]);

// 3. 历法数据：1901–2099 年每一天的完整详情（农历、干支、节气、节日、宜忌、星宿……）
addAll(display, "0123456789/年月日农历星期天闰");
const start = new Date(1901, 0, 1);
const end = new Date(2099, 11, 31);
for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const ymd = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  const detail = getDayDetail(ymd, defaultRules);
  addAll(body, JSON.stringify(detail));
  addAll(display, detail.lunar.text + detail.lunar.monthName + detail.lunar.dayName + detail.weekday);
}

// 大字字体里出现的字也要能用正文字体显示（字体缺字时回退）
for (const ch of display) body.add(ch);

const sorted = (s: Set<string>) => [...s].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join("");
writeFileSync(join(OUT_DIR, "glyphs-body.txt"), sorted(body) + "\n");
writeFileSync(join(OUT_DIR, "glyphs-display.txt"), sorted(display) + "\n");
console.log(
  `正文字表 ${body.size} 字，大字字表 ${display.size} 字 → ${relative(ROOT, OUT_DIR)}/glyphs-*.txt`,
);
