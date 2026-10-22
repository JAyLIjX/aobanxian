import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHARACTERS, getCharacter, VOICE_KEYS, voiceLine } from "../src/sprite/characters";

const LANGS = ["zh-CN", "zh-TW", "en"] as const;
const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe("角色口吻", () => {
  it("四个角色、三种语言的口吻键完全一致，占位符一致", () => {
    expect(CHARACTERS).toHaveLength(4);
    for (const c of CHARACTERS) {
      for (const lang of LANGS) {
        expect(Object.keys(c.voice[lang]).sort(), `${c.id} ${lang}`).toEqual([...VOICE_KEYS].sort());
        for (const k of VOICE_KEYS) {
          expect(c.voice[lang][k].trim().length, `${c.id} ${lang} ${k}`).toBeGreaterThan(0);
          expect(placeholders(c.voice[lang][k]), `${c.id} ${lang} ${k}`).toEqual(placeholders(c.voice["zh-CN"][k]));
        }
      }
    }
  });

  it("右键菜单第一项按角色变", () => {
    const names = Object.fromEntries(CHARACTERS.map((c) => [c.id, voiceLine(c, "zh-CN", "divine")]));
    expect(names).toEqual({ daoshi: "掐指一算", shusheng: "翻翻黄历", guanyuan: "升堂", heshang: "敲木鱼" });
  });

  it("按要求的句子", () => {
    const line = (id: string, k: (typeof VOICE_KEYS)[number], vars = {}) => voiceLine(getCharacter(id), "zh-CN", k, vars);
    expect(line("daoshi", "huangdao")).toBe("掐指一算，今日黄道吉日");
    expect(line("daoshi", "personalClash", { animal: "猪" })).toBe("属猪的善信，今日冲你，凡事低调些");
    expect(line("daoshi", "personalHarmony", { animal: "猴" })).toBe("属猴的善信，今日与你相合");
    expect(line("daoshi", "anniversary", { name: "妈妈的农历生日" })).toBe("今日是妈妈的农历生日");
    expect(line("shusheng", "huangdao")).toBe("翻了翻黄历，今日黄道吉日");
    expect(line("shusheng", "tianshe")).toBe("今日天赦，正好放下书本");
    expect(line("shusheng", "anniversary", { name: "妈妈的农历生日" })).toBe("今日是妈妈的农历生日，莫忘了");
    expect(line("guanyuan", "heidao")).toBe("本官提醒：今日宜稳不宜急");
    expect(line("guanyuan", "personalClash", { animal: "猪" })).toBe("属猪者听令：今日冲你，凡事低调");
    expect(line("guanyuan", "tianshe")).toBe("今日天赦，本官大赦天下");
    expect(line("heshang", "huangdao")).toBe("阿弥陀佛，今日黄道吉日");
    expect(line("heshang", "personalHarmony", { animal: "猴" })).toBe("属猴的施主，今日与你有缘");
    expect(line("heshang", "anniversary", { name: "妈妈的农历生日" })).toBe("施主，今日是妈妈的农历生日，莫忘了");
  });

  it("英文：道士用中性说法、书生称 my friend、小和尚用 Amituofo 开头", () => {
    const en = (id: string) => Object.values(getCharacter(id).voice.en).join("\n");
    expect(en("daoshi")).not.toMatch(/amituofo|buddha|monk|alms|donor|patron/i);
    expect(getCharacter("daoshi").voice.en.personalClash).toMatch(/^Friend born in the Year of the \{\{animal\}\}/);
    expect(en("shusheng")).toMatch(/my friend/i);
    for (const [k, v] of Object.entries(getCharacter("heshang").voice.en)) if (k !== "divine") expect(v, k).toMatch(/^Amituofo/);
  });
});

/** 项目里所有可能显示给人看的文字文件（古籍原文 src/data 除外，报告是历史记录也除外） */
function textFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) textFiles(p, out);
    else if (/\.(json|ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("「施主」只有小和尚用", () => {
  it("道士、书生、青天大老爷的口吻（三种语言）里没有「施主」", () => {
    for (const id of ["daoshi", "shusheng", "guanyuan"]) {
      const all = JSON.stringify(getCharacter(id).voice);
      expect(all, id).not.toMatch(/施主/);
    }
    expect(JSON.stringify(getCharacter("heshang").voice["zh-CN"])).toMatch(/施主/);
  });

  it("界面文字、配置、代码里也没有「施主」（小和尚的 character.json 和这个测试除外）", () => {
    const files = ["locales", "config", "rules", "src", "assets/character"].flatMap((d) => textFiles(d));
    const hits = files
      .filter((f) => !f.includes("assets/character/heshang/") && !f.startsWith("src/data/"))
      .filter((f) => readFileSync(f, "utf8").includes("施主"));
    expect(hits).toEqual([]);
  });

  it("道士称呼人用「善信」", () => {
    expect(getCharacter("daoshi").voice["zh-CN"].personalClash).toContain("善信");
    expect(getCharacter("daoshi").voice["zh-TW"].personalClash).toContain("善信");
  });
});
