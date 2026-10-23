import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import branding from "../config/branding.json";

/** 旧的 GitHub 用户名（拆开写，免得这个测试文件自己就含有它） */
const OLD = ["JAy", "LI", "jX"].join("");

/** 不检查的目录：git 历史、依赖、构建产物、本地工具 */
const SKIP = new Set([".git", "node_modules", "target", "dist", ".venv-tools", "fonts-src", "gen"]);

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else out.push(p);
  }
  return out;
}

describe("改 GitHub 用户名", () => {
  const all = files(".");

  it("项目文件里不再出现旧用户名（不区分大小写，git 历史除外）", () => {
    const re = new RegExp(OLD, "i");
    const hits: string[] = [];
    for (const f of all) {
      if (re.test(f)) hits.push(`${f}（文件名）`);
      const buf = readFileSync(f);
      // 只看文本文件：前 8KB 里有 0 字节的当作二进制
      if (buf.subarray(0, 8192).includes(0)) continue;
      if (re.test(buf.toString("utf8"))) hits.push(f);
    }
    expect(hits).toEqual([]);
  });

  it("作者和仓库地址只写在 config/branding.json，仓库在作者名下", () => {
    expect(branding.author).toMatch(/^[A-Za-z0-9-]+$/);
    expect(branding.repository).toBe(`https://github.com/${branding.author}/aobanxian`);
    // 其他地方不再单独写作者名（README 指向 branding.json，Cargo.toml 不写 authors）
    expect(readFileSync("src-tauri/Cargo.toml", "utf8")).not.toMatch(/^authors\s*=/m);
    expect(readFileSync("README.md", "utf8")).not.toContain(`github.com/${branding.author}`);
    for (const f of ["src/windows/AboutApp.tsx", "src/windows/ShareApp.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toContain("config/branding.json");
      expect(src, f).not.toContain(branding.author);
    }
  });

  it("自动更新的地址跟着仓库走：tauri.conf.json 的 endpoints = repository/releases/latest/download/latest.json", () => {
    const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
    expect(conf.plugins.updater.endpoints).toEqual([`${branding.repository}/releases/latest/download/latest.json`]);
    expect(conf.plugins.updater.pubkey.length).toBeGreaterThan(40);
    expect(conf.bundle.createUpdaterArtifacts).toBe(true);
    // macOS 至少 ad-hoc 签名（Apple 芯片上完全不签名的 app 打不开）
    expect(conf.bundle.macOS.signingIdentity).toBe("-");
  });
});
