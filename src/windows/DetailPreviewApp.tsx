/**
 * 开发用：单独显示某一天的详情面板（?view=detail&date=2026-10-22&lang=en），方便截图和检查排版。
 */
import { useEffect, useState } from "react";
import { DetailPanel } from "../components/DetailPanel";
import type { Ymd } from "../core/dayBoundary";
import { setLanguage } from "../i18n";
import { useSettings } from "../settings/useSettings";
import { rulesWith } from "../settings/settings";

export function DetailPreviewApp() {
  const params = new URLSearchParams(location.search);
  const [y, m, d] = (params.get("date") ?? "").split("-").map(Number);
  const now = new Date();
  const [ymd, setYmd] = useState<Ymd>(y ? { year: y, month: m, day: d } : { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
  const { settings } = useSettings();
  const lang = params.get("lang");
  useEffect(() => {
    if (lang === "zh-CN" || lang === "zh-TW" || lang === "en") setLanguage(lang);
  }, [lang]);
  return (
    <div style={{ width: 380, padding: 12 }}>
      <DetailPanel ymd={ymd} rules={rulesWith(settings)} myZodiac={settings.myZodiac} anniversaries={[]} onChange={setYmd} onClose={() => {}} />
    </div>
  );
}
