/**
 * 收集界面可能显示的全部字符，生成字体子集化用的字表。
 *
 *   glyphs-body.txt     正文（霞鹜文楷）：源码、规则、配置、三种语言文件 + 1901–2099 年每一天的详情
 *   glyphs-display.txt  大字（马善政 / 志莽行书）：日期数字、农历标题、应用名
 *   glyphs-banner-words.txt  幡面循环可能出现的所有字（像素化行书用）
 *   glyphs-banner.txt   上面的字 + GB2312 一级常用字（Fusion Pixel 像素字用；设置里可以自定义幡上文字，
 *                       行书里没有的字会回退到像素字）
 *   glyphs-latin.txt    英文正文（EB Garamond）
 *
 * 由 scripts/fonts/subset-fonts.sh 调用，一般不需要单独运行。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import branding from "../../config/branding.json";
import twTerms from "../../locales/zh-TW.terms.json";
import { getDayDetail } from "../../src/calendar/day";
import { getAlmanac } from "../../src/calendar/special";
import { defaultRules } from "../../src/core/rules";

const ROOT = join(import.meta.dirname, "../..");
const OUT_DIR = import.meta.dirname;

const body = new Set<string>();
const display = new Set<string>();
const banner = new Set<string>();
const latin = new Set<string>();
const addAll = (set: Set<string>, text: string) => {
  for (const ch of text) if (ch !== "\n" && ch !== "\r" && ch !== "\t") set.add(ch);
};
const isCJK = (ch: string) => /[　-〿㐀-鿿豈-﫿＀-￯]/.test(ch);

// 1. ASCII 可打印字符和常用标点
for (let c = 0x20; c <= 0x7e; c++) {
  body.add(String.fromCharCode(c));
  latin.add(String.fromCharCode(c));
}
addAll(body, "，。、；：？！“”‘’（）《》〈〉【】「」—…·／～　‹›×");
addAll(latin, "‘’“”–—…·•×‹›é");

// 2. 源码、规则、配置、语言文件里出现的所有字符
function walk(dir: string, exts: string[], sets: Set<string>[]) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, exts, sets);
    else if (exts.some((e) => name.endsWith(e))) for (const s of sets) addAll(s, readFileSync(path, "utf8"));
  }
}
walk(join(ROOT, "src"), [".ts", ".tsx", ".css"], [body]);
walk(join(ROOT, "src", "data"), [".json"], [body]); // 签诗、周易原文
walk(join(ROOT, "rules"), [".json"], [body]);
walk(join(ROOT, "config"), [".json"], [body]);
walk(join(ROOT, "locales"), [".json"], [body]);
// 英文字体只要拉丁字符
for (const ch of body) if (!isCJK(ch) && ch.codePointAt(0)! < 0x2000 + 0x100) latin.add(ch);

// 3. 历法数据：1901–2099 年每一天
addAll(display, "0123456789/年月日农历農曆星期天闰閏奥半仙奧");
addAll(display, "第签籤一二三四五六七八九十百"); // 签纸上的「第十八签」
const bannerWords = new Set<string>([branding.bannerText, branding.special.tianshe, branding.special.yanggong, branding.banner.noYi, branding.banner.noJi]);
for (let d = new Date(1901, 0, 1); d <= new Date(2099, 11, 31); d.setDate(d.getDate() + 1)) {
  const ymd = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  const detail = getDayDetail(ymd, defaultRules);
  addAll(body, JSON.stringify(detail));
  addAll(body, JSON.stringify(getAlmanac(ymd)));
  const lunarTitle = detail.lunar.text + detail.lunar.monthName + detail.lunar.dayName;
  addAll(display, lunarTitle + detail.weekday);
  addAll(display, (twTerms as Record<string, string>)[detail.lunar.monthName] ?? "");
  for (const w of [...detail.yi, ...detail.ji, ...detail.festivals, detail.jieqi ?? ""]) bannerWords.add(w);
}
for (const w of bannerWords) addAll(banner, w);
addAll(banner, branding.banner.yiPrefix + branding.banner.jiPrefix + "穿配喜");
for (const list of Object.values(defaultRules.palettes)) for (const c of list) addAll(banner, c.name);
addAll(banner, "鼠牛虎兔龙蛇马羊猴鸡狗猪");
const bannerWordsOnly = new Set(banner);

// 4. GB2312 一级常用字（3755 字）：幡上文字可自定义
const gb = new TextDecoder("gb2312");
for (let hi = 0xb0; hi <= 0xd7; hi++) {
  for (let lo = 0xa1; lo <= 0xfe; lo++) {
    const ch = gb.decode(new Uint8Array([hi, lo]));
    // 跳过替换字符（U+FFFD）和私用区（GB2312 解码时会混进几个 U+E8xx）
    const cp = ch.codePointAt(0)!;
    if (ch.length === 1 && cp !== 0xfffd && !(cp >= 0xe000 && cp <= 0xf8ff)) banner.add(ch);
  }
}

// 大字和幡上的字也要能用正文字体显示（字体缺字时回退）
for (const ch of display) body.add(ch);

const sorted = (s: Set<string>) => [...s].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join("");
writeFileSync(join(OUT_DIR, "glyphs-body.txt"), sorted(body) + "\n");
writeFileSync(join(OUT_DIR, "glyphs-display.txt"), sorted(display) + "\n");
writeFileSync(join(OUT_DIR, "glyphs-banner.txt"), sorted(banner) + "\n");
writeFileSync(join(OUT_DIR, "glyphs-banner-words.txt"), sorted(bannerWordsOnly) + "\n");
writeFileSync(join(OUT_DIR, "glyphs-latin.txt"), sorted(latin) + "\n");
console.log(
  `正文 ${body.size} 字，大字 ${display.size} 字，幡 ${banner.size} 字，英文 ${latin.size} 字 → ${relative(ROOT, OUT_DIR)}/glyphs-*.txt`,
);
