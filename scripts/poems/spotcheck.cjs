// 抽查每日一诗的诗文和维基文库是否一致：node scripts/poems/spotcheck.cjs <输出.json>（需要联网，每次请求间隔 0.4–0.8 秒）
// 抽查：每日一诗的诗文 vs 维基文库（都转成简体、去掉标点后比较）
const fs = require("fs");
const OpenCC = require(process.cwd() + "/node_modules/opencc-js");
const t2s = OpenCC.Converter({ from: "t", to: "cn" });
const poems = JSON.parse(fs.readFileSync("src/data/poems.json")).poems;
const UA = { "User-Agent": "AoBanxian/0.4 (https://github.com/KhalilLiJX/aobanxian)" };
const norm = (s) => t2s(s).replace(/[^一-鿿]/g, "");
const pick = ["qjs:2-17", "qjs:2-6", "tang:56da3304-439a-400b-b283-16de3add74ce", "ci:ci.song.1000.json:459", "ci:ci.song.11000.json:195", "ci:ci.song.3000.json:753"];
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const regular = poems.filter((p) => p.role === "regular");
while (pick.length < 14) {
  const p = regular[Math.floor(rnd() * regular.length)];
  if (!pick.includes(p.id)) pick.push(p.id);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(params) {
  const u = "https://zh.wikisource.org/w/api.php?" + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  return (await fetch(u, { headers: UA })).json();
}
(async () => {
  const rows = [];
  for (const id of pick) {
    const p = poems.find((x) => x.id === id);
    const title = p.title["zh-TW"].split("·")[0];
    const body = norm(p.lines["zh-TW"].join(""));
    const first = norm(p.lines["zh-TW"][0]).slice(0, 7);
    const sr = await api({ action: "query", list: "search", srsearch: `${first} ${p.author["zh-TW"]}`, srlimit: "8" });
    let best = null;
    for (const hit of sr.query?.search ?? []) {
      await sleep(400);
      const page = await api({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: hit.title });
      const w = page.query.pages[0].revisions?.[0]?.slots.main.content ?? "";
      const text = norm(w.replace(/\{\{[^{}]*\}\}/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ""));
      const at = text.indexOf(first);
      if (at < 0) continue;
      const seg = text.slice(at, at + body.length);
      let diff = 0;
      const diffs = [];
      for (let i = 0; i < body.length; i++) if (seg[i] !== body[i]) { diff++; if (diffs.length < 4) diffs.push(`${body[i]}≠${seg[i] ?? "∅"}@${i}`); }
      if (!best || diff < best.diff) best = { page: hit.title, diff, diffs };
      if (diff === 0) break;
    }
    rows.push({ id, title: `${p.author["zh-CN"]}《${p.title["zh-CN"]}》`, ...(best ?? { page: "（没找到）", diff: -1, diffs: [] }) });
    console.log(JSON.stringify(rows.at(-1)));
    await sleep(800);
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
})();
