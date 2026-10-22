import { pictureDir, join } from "@tauri-apps/api/path";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import branding from "../../config/branding.json";
import { getDayDetail } from "../calendar/day";
import { chineseNumber } from "../components/LotPaper";
import { effectiveDate, ymdKey } from "../core/dayBoundary";
import type { Element } from "../core/elements";
import type { LotRecord } from "../core/lots";
import { getLot } from "../data/lots";
import type { Lang } from "../i18n";
import { dayLabel, familyName, ganzhiLine, lunarText, monthName, weekday } from "../i18n/format";
import { term } from "../i18n/terms";
import { inTauri } from "../platform/window";
import { requestSay } from "../platform/windows";
import { rulesWith } from "../settings/settings";
import { todaysLot } from "../settings/lotBook";
import { ensureBannerFonts, renderBannerText } from "../sprite/bannerText";
import { writingArea } from "../sprite/writingArea";
import { getCharacter } from "../sprite/characters";
import { renderSprite, type Ramp } from "../sprite/sprite";
import { renderShareImage, SHARE_H, SHARE_W, SPRITE_CELL, type ShareContent } from "../share/shareImage";
import { useWindowSetup } from "./useWindowSetup";

/** 存图的文件夹：「图片/奥半仙」（不跟着幡上文字或界面语言变） */
const SHARE_DIR = "奥半仙";

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "serif";

/** 分享今日：生成 1080×1440 的图，复制到剪贴板并存到「图片/奥半仙」 */
export function ShareApp() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { settings, loaded } = useWindowSetup("share.title");
  const rules = useMemo(() => rulesWith(settings), [settings]);
  const today = effectiveDate(new Date(), rules.dayBoundary);
  const detail = useMemo(() => getDayDetail(today, rules), [rules, today.year, today.month, today.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const [lot, setLot] = useState<LotRecord | null>(null);
  const [withLot, setWithLot] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (loaded) void todaysLot(today).then(setLot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // 每次内容变了重新画
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    void (async () => {
      const ramp = (e: Element) => rules.pixelRamps[e].map((l) => l.hex) as Ramp;
      const outfit = { robe: ramp(detail.outfit.primary.element), sash: ramp(detail.outfit.accent.element) };
      const display = cssVar("--font-display");
      const body = cssVar("--font-body");
      await ensureBannerFonts(settings.bannerText, settings.bannerFont);
      await Promise.all([document.fonts.load(`40px ${display}`, "奥半仙0"), document.fonts.load(`40px ${body}`, "宜忌")]).catch(() => {});
      const sprite = getCharacter(settings.character).data;
      const area = writingArea(sprite);
      const face = area.box;
      const sep = lang === "en" ? " · " : " · ";
      const l = lot ? getLot(lot.n) : null;
      const content: ShareContent = {
        dateBig: t("share.dateBig", { month: today.month, day: today.day, monthName: monthName(today.month, lang) }),
        dateLine: `${t("date.year", { year: today.year })}${sep}${weekday(today, lang)}`,
        lunar: lunarText(detail, lang, t),
        ganzhi: ganzhiLine(detail, lang, t),
        element: t("card.todayElement", { label: dayLabel(detail.outfit, lang) }),
        luckyLabel: t("share.lucky"),
        families: detail.outfit.tiers[0].entries.map((e) => ({
          name: familyName(e.element, rules, lang, true),
          colors: e.colors.slice(0, 3).map((c) => c.hex),
        })),
        yiLabel: t("detail.yi"),
        jiLabel: t("detail.ji"),
        yi: detail.yi.length ? detail.yi.slice(0, 4).map((w) => term("yiji", w, lang)) : [lang === "en" ? t("share.noYi") : branding.banner.noYi],
        ji: detail.ji.length ? detail.ji.slice(0, 4).map((w) => term("yiji", w, lang)) : [lang === "en" ? t("share.noJi") : branding.banner.noJi],
        brand: t("app.name"),
        url: branding.repository,
        scanHint: t("share.scan"),
        lot:
          withLot && l
            ? {
                title: t("share.lotTitle", { number: t("lots.number", { n: lang === "en" ? l.n : chineseNumber(l.n) }), grade: l.grade }),
                poem: l.poem,
              }
            : undefined,
        sprite: { pixels: renderSprite(sprite, outfit), w: sprite.width, h: sprite.height },
        banner: { x: face.x, y: face.y, w: face.w, h: face.h, mask: renderBannerText(settings.bannerText, settings.bannerFont, area, SPRITE_CELL, SPRITE_CELL).mask },
        fonts: { display, body },
      };
      if (!cancelled && canvasRef.current) renderShareImage(canvasRef.current, content);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, lang, detail, withLot, lot, settings.bannerText, settings.bannerFont, settings.displayFont, settings.character]);

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("toBlob 失败");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const name = `${SHARE_DIR}-${ymdKey(today)}${withLot && lot ? "-签" : ""}.png`;
      if (inTauri) {
        await writeImage(bytes);
        const dir = await join(await pictureDir(), SHARE_DIR);
        await mkdir(dir, { recursive: true });
        const path = await join(dir, name);
        await writeFile(path, bytes);
        setStatus(t("share.savedTo", { path }));
        void requestSay("share.saved");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setStatus(t("share.saved"));
      }
    } catch (err) {
      console.error("分享图保存失败", err);
      setStatus(t("share.failed"));
    } finally {
      setBusy(false);
    }
  };

  // 开发版：?view=share&raw=1 只显示 1080×1440 原尺寸的图（无头 Chrome 截图出预览图用）
  if (import.meta.env.DEV && new URLSearchParams(location.search).get("raw")) {
    return <canvas ref={canvasRef} width={SHARE_W} height={SHARE_H} style={{ display: "block", width: SHARE_W, height: SHARE_H }} />;
  }

  return (
    <main className="tool paper share">
      <section className="tool__controls">
        <label className={`tool__row anniv__check ${lot ? "" : "is-disabled"}`}>
          <input type="checkbox" disabled={!lot} checked={withLot && !!lot} onChange={(e) => setWithLot(e.target.checked)} />
          <span>
            {t("share.withLot")}
            {!lot && <span className="set-row__hint">{t("share.noLot")}</span>}
          </span>
        </label>
        <div className="tool__row share__actions">
          <span className="tool__summary">{status ?? t("share.hint")}</span>
          <button type="button" className="btn" disabled={busy} onClick={() => void save()}>
            {t("share.save")}
          </button>
        </div>
      </section>
      <div className="tool__body share__preview">
        <canvas ref={canvasRef} width={SHARE_W} height={SHARE_H} />
      </div>
    </main>
  );
}
