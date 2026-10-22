/**
 * 系统通知（tauri-plugin-notification，macOS 通知中心 / Windows 操作中心）。浏览器里是空操作。
 */
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { inTauri } from "./window";

export async function notify(title: string, body: string): Promise<boolean> {
  if (!inTauri) return false;
  try {
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (!granted) return false;
    sendNotification({ title, body });
    return true;
  } catch (err) {
    console.error("发送通知失败", err);
    return false;
  }
}
