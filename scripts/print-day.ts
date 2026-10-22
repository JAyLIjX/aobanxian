/**
 * 在终端打印某一天的完整结果，方便拿老黄历核对。
 *   npm run day            # 今天（按规则里的 dayBoundary）
 *   npm run day 2026-10-21 # 指定日期
 */
import { Solar } from "lunar-javascript";
import { getDayDetail } from "../src/calendar/day";
import { effectiveDate } from "../src/core/dayBoundary";
import { defaultRules } from "../src/core/rules";
import { PHASE_NAMES } from "../src/core/wuxing";

const arg = process.argv[2];
const ymd = arg
  ? (() => {
      const [year, month, day] = arg.split("-").map(Number);
      return { year, month, day };
    })()
  : effectiveDate(new Date(), defaultRules.dayBoundary);

const d = getDayDetail(ymd, defaultRules);
const o = d.outfit;
const line = (label: string, value: string) => console.log(`${label.padEnd(6, "　")}${value}`);

console.log(`\n══ ${d.ymd.year}年${d.ymd.month}月${d.ymd.day}日 ${d.weekday} ══\n`);
line("农历", d.lunar.text + (d.lunar.isLeapMonth ? "（闰月）" : ""));
line("干支", `${d.ganzhi.year}年 ${d.ganzhi.month}月 ${d.ganzhi.day}日`);
line("节气", d.jieqi ?? "—");
line("节日", d.festivals.join("、") || "—");
line("纳音", d.pillar.nayin);
line("当日五行", `${o.day.element}（取法：${defaultRules.elementSource}，${o.day.label}）`);

console.log("\n── 穿衣 ──");
for (const tier of o.tiers) {
  const parts = tier.entries.map(
    (e) => `${e.element}${PHASE_NAMES[e.phase]}：${e.colors.map((c) => c.name).join(" ")}`,
  );
  line(tier.label, parts.join("　|　"));
}
const fam = (e: keyof typeof defaultRules.colorFamilies) => defaultRules.colorFamilies[e].name;
line("大吉色", `${fam(o.phases.xiang)}、${fam(o.phases.wang)}（相、旺，平等）`);
line("解释", o.explanation);

console.log("\n── 宜忌 ──");
line("宜", d.yi.join(" "));
line("忌", d.ji.join(" "));

console.log("\n── 生肖与星宿 ──");
const z = d.zodiac;
line("六合", `${z.sixHarmony.animal}（${z.sixHarmony.branch}）`);
line("三合", z.threeHarmony.map((r) => `${r.animal}（${r.branch}）`).join("、"));
line("冲煞", `冲${z.clash.animal}（${z.clash.ganzhi}） 煞${z.sha}`);
line("星宿", `${d.xiu.fullName}　${d.xiu.luckLabel}`);
line("小贴士", d.tip ?? "—");

console.log("\n── lunar-javascript 原始输出（对照用） ──");
console.log(Solar.fromYmd(ymd.year, ymd.month, ymd.day).getLunar().toFullString());
console.log();
