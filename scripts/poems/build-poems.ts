/**
 * 生成每日一诗的数据：
 *
 *   git clone --depth 1 https://github.com/chinese-poetry/chinese-poetry.git /tmp/chinese-poetry
 *   npx tsx scripts/poems/build-poems.ts /tmp/chinese-poetry
 *
 * 输入：scripts/poems/curated.json（精选的诗：chinese-poetry 里的 id、季节、标签、名句、英文题名、赏析，自撰）
 *       chinese-poetry 的 全唐诗/poet.tang.*、全唐诗/poet.song.*（宋诗）、宋词/ci.song.*、蒙学/qianjiashi.json
 * 输出：src/data/poems.json（诗文 + 简繁两种字形）、config/poem-days.json（节日、节气专属诗对照表）
 *
 * 诗文一律取自数据，不手写。唐诗、宋诗、千家诗是繁体，宋词是简体；另一种字形用 OpenCC 转。
 * 和维基文库对照后确认是数据错字的，写进 TEXT_FIXES（只改明确的错字，注明依据）。
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as OpenCC from "opencc-js";

const ROOT = join(import.meta.dirname, "../..");
const SRC = process.argv[2];
if (!SRC) throw new Error("用法：npx tsx scripts/poems/build-poems.ts <chinese-poetry 目录>");

const t2s = OpenCC.Converter({ from: "t", to: "cn" });
const t2tw = OpenCC.Converter({ from: "t", to: "tw" });
const s2tw = OpenCC.Converter({ from: "cn", to: "tw" });

/** 数据里的错字：id → [错, 对, 依据] */
const TEXT_FIXES: Record<string, [string, string, string][]> = {
  // 千家诗本作「慾斷魂」，「慾」是欲望的欲，此处应为「欲」（将要）；维基文库《清明 (杜牧)》作「欲斷魂」
  "qjs:2-17": [["慾斷魂", "欲斷魂", "維基文庫《清明 (杜牧)》"]],
};

interface Raw {
  author: string;
  title: string;
  paragraphs: string[];
  script: "trad" | "simp";
  dynasty: "唐" | "宋";
  file: string;
}

function loadSource(): Map<string, Raw> {
  const m = new Map<string, Raw>();
  const read = (p: string) => JSON.parse(readFileSync(join(SRC, p), "utf8"));
  for (const f of readdirSync(join(SRC, "全唐诗"))) {
    const kind = f.startsWith("poet.tang") ? "tang" : f.startsWith("poet.song") ? "song" : null;
    if (!kind) continue;
    for (const p of read(`全唐诗/${f}`)) m.set(`${kind}:${p.id}`, { author: p.author, title: p.title, paragraphs: p.paragraphs, script: "trad", dynasty: kind === "tang" ? "唐" : "宋", file: `全唐诗/${f}` });
  }
  for (const f of readdirSync(join(SRC, "宋词")).filter((f) => f.startsWith("ci.song"))) {
    (read(`宋词/${f}`) as { author: string; rhythmic: string; paragraphs: string[] }[]).forEach((p, i) =>
      m.set(`ci:${f}:${i}`, { author: p.author, title: p.rhythmic, paragraphs: p.paragraphs, script: "simp", dynasty: "宋", file: `宋词/${f}` }),
    );
  }
  const qjs = read("蒙学/qianjiashi.json") as { content: { content: { chapter: string; author: string; paragraphs: string[] }[] }[] };
  qjs.content.forEach((g, i) =>
    g.content.forEach((p, j) => {
      const mm = /^（(.)）(.+)$/.exec(p.author.trim());
      m.set(`qjs:${i}-${j}`, { author: mm ? mm[2] : p.author, title: p.chapter, paragraphs: p.paragraphs, script: "trad", dynasty: mm?.[1] === "宋" ? "宋" : "唐", file: "蒙学/qianjiashi.json" });
    }),
  );
  return m;
}

interface Curated {
  id: string;
  role: "regular" | "moon" | "festival" | "jieqi";
  seasons: string[];
  tags: string[];
  famous: string;
  titleEn: string;
  authorEn: string;
  appreciation: { "zh-CN": string; en: string };
  festival?: string;
  jieqi?: string;
}

const both = (s: string, script: Raw["script"]) => (script === "trad" ? { "zh-CN": t2s(s), "zh-TW": t2tw(s) } : { "zh-CN": s, "zh-TW": s2tw(s) });

const source = loadSource();
const curated = JSON.parse(readFileSync(join(ROOT, "scripts/poems/curated.json"), "utf8")) as Curated[];
const festival: Record<string, string> = {};
const jieqi: Record<string, string> = {};
const poems = curated.map((c) => {
  const raw = source.get(c.id);
  if (!raw) throw new Error(`chinese-poetry 里找不到 ${c.id}`);
  const fix = (s: string) => (TEXT_FIXES[c.id] ?? []).reduce((acc, [a, b]) => acc.split(a).join(b), s);
  const paragraphs = raw.paragraphs.map(fix);
  const famous = fix(c.famous);
  if (!paragraphs.join("").includes(famous)) throw new Error(`${c.id} 的名句不在正文里：${c.famous}`);
  const lines = { "zh-CN": [] as string[], "zh-TW": [] as string[] };
  for (const p of paragraphs) {
    const b = both(p, raw.script);
    lines["zh-CN"].push(b["zh-CN"]);
    lines["zh-TW"].push(b["zh-TW"]);
  }
  // 诗题或诗句里明写「中秋」的只在中秋当天用（满月规则、当季规则都不选它们）
  const onlyMidAutumn = `${raw.title}${paragraphs.join("")}`.includes("中秋");
  if (c.festival) festival[c.festival] = c.id;
  if (c.jieqi) jieqi[c.jieqi] = c.id;
  // 宋词的题目只有词牌：按习惯加首句作小题（「水调歌头·明月几时有」），词牌有别名（「摊破浣溪沙・山花子」）时只取第一个
  const title = c.id.startsWith("ci:") ? `${raw.title.split("・")[0]}·${paragraphs[0].split(/[，。、？！；]/)[0]}` : raw.title;
  return {
    id: c.id,
    kind: c.id.startsWith("ci:") ? "ci" : "shi",
    dynasty: raw.dynasty,
    role: c.role,
    seasons: c.seasons,
    tags: c.tags,
    ...(onlyMidAutumn ? { onlyMidAutumn } : {}),
    ...(c.festival ? { festival: c.festival } : {}),
    ...(c.jieqi ? { jieqi: c.jieqi } : {}),
    title: both(title, raw.script),
    author: both(raw.author, raw.script),
    lines,
    famous: both(famous, raw.script),
    titleEn: c.titleEn,
    authorEn: c.authorEn,
    appreciation: { "zh-CN": c.appreciation["zh-CN"], "zh-TW": "", en: c.appreciation.en },
    source: raw.file,
  };
});

writeFileSync(
  join(ROOT, "src/data/poems.json"),
  JSON.stringify(
    {
      $comment:
        "由 scripts/poems/build-poems.ts 生成，不要手改。诗文取自 chinese-poetry（MIT 协议），只用 OpenCC 转换简繁、按 TEXT_FIXES 改了核对过的错字；季节、标签、名句、英文题名、赏析是奥半仙自撰（scripts/poems/curated.json）。appreciation 的 zh-TW 由 scripts/i18n/build-zh-tw.ts 生成。",
      source: { title: "chinese-poetry", url: "https://github.com/chinese-poetry/chinese-poetry", license: "MIT" },
      poems,
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  join(ROOT, "config/poem-days.json"),
  JSON.stringify({ $comment: "每日一诗的专属诗对照表：传统节日、节气当天用哪一首（值是 src/data/poems.json 里的诗 id）。由 scripts/poems/build-poems.ts 从 scripts/poems/curated.json 生成。", festival, jieqi }, null, 2) + "\n",
);
console.log(`${poems.length} 首；节日 ${Object.keys(festival).length}，节气 ${Object.keys(jieqi).length}`);
