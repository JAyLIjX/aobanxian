/**
 * 界面外观配置，来自 config/appearance.json。
 * 开发时可用地址参数临时覆盖，如 http://localhost:1420/?font=B
 */
import appearanceJson from "../../config/appearance.json";

/** 大字字体：A = 马善政毛笔楷书，B = 志莽行书 */
export type DisplayFont = "A" | "B";

function parseDisplayFont(value: unknown): DisplayFont | null {
  return value === "A" || value === "B" ? value : null;
}

function fromQuery(): DisplayFont | null {
  if (typeof location === "undefined") return null;
  return parseDisplayFont(new URLSearchParams(location.search).get("font"));
}

export const displayFont: DisplayFont = fromQuery() ?? parseDisplayFont(appearanceJson.displayFont) ?? "A";
