/**
 * 自动更新：tauri-plugin-updater 从 GitHub Releases 的 latest.json 检查新版
 * （地址和公钥在 src-tauri/tauri.conf.json 的 plugins.updater）。
 * 只访问 GitHub，不上传、不收集任何用户数据。浏览器里（npm run dev）什么都不做。
 */
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { inTauri } from "./window";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  /** Release 说明（GitHub Release 的正文） */
  notes: string;
  date?: string;
}

let pending: Update | null = null;

/** 检查有没有新版：有就返回新版信息，没有返回 null；网络等出错时抛出 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!inTauri) return null;
  const u = await check({ timeout: 15_000 });
  pending = u;
  if (!u) return null;
  return { version: u.version, currentVersion: u.currentVersion, notes: u.body ?? "", date: u.date };
}

/** 下载并安装刚才检查到的新版，装好后重启。onProgress 收到 0–1 的进度（不知道总大小时为 null） */
export async function installUpdate(onProgress: (p: number | null) => void): Promise<void> {
  if (!inTauri) return;
  const u = pending ?? (await check({ timeout: 15_000 }));
  if (!u) return;
  let total = 0;
  let done = 0;
  await u.downloadAndInstall((e) => {
    if (e.event === "Started") total = e.data.contentLength ?? 0;
    if (e.event === "Progress") {
      done += e.data.chunkLength;
      onProgress(total ? Math.min(1, done / total) : null);
    }
    if (e.event === "Finished") onProgress(1);
  });
  await relaunch();
}
