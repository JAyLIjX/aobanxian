import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { pickDays, ZERI_EVENTS, ZERI_RANGES } from "../calendar/zeri";
import { effectiveDate, type Ymd } from "../core/dayBoundary";
import type { Lang } from "../i18n";
import { dayLabel, fmtDate, ganzhiLine, lunarText, weekday } from "../i18n/format";
import { term } from "../i18n/terms";
import { requestOpenDetail } from "../platform/windows";
import { rulesWith } from "../settings/settings";
import { useWindowSetup } from "./useWindowSetup";

/** 择日：选一件事和范围，列出宜做且不忌的日子 */
/** demo：宣传片等离线展示用，固定「今天」、我的生肖和选中的事 */
export function ZeriApp({ demo }: { demo?: { today: Ymd; myBranch: string | null; eventId: string } } = {}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { settings } = useWindowSetup("zeri.title");
  const rules = useMemo(() => rulesWith(settings), [settings]);
  const [eventId, setEventId] = useState(demo?.eventId ?? ZERI_EVENTS[0].id);
  const [range, setRange] = useState(ZERI_RANGES[0]);
  const event = ZERI_EVENTS.find((e) => e.id === eventId)!;
  const today = demo?.today ?? effectiveDate(new Date(), rules.dayBoundary);
  const myBranch = demo ? demo.myBranch : settings.myZodiac === "none" ? null : settings.myZodiac;
  const days = useMemo(
    () => pickDays(event, today, range, rules, myBranch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event, range, rules, myBranch, today.year, today.month, today.day],
  );

  return (
    <main className="tool paper">
      <section className="tool__controls">
        <div className="tool__row">
          <span className="tool__label">{t("zeri.event")}</span>
          <div className="chips-select">
            {ZERI_EVENTS.map((e) => (
              <button key={e.id} type="button" className={e.id === eventId ? "is-on" : ""} onClick={() => setEventId(e.id)}>
                {t(`zeri.events.${e.id}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="tool__row">
          <span className="tool__label">{t("zeri.range")}</span>
          <div className="segmented">
            {ZERI_RANGES.map((n) => (
              <button key={n} type="button" className={n === range ? "is-on" : ""} onClick={() => setRange(n)}>
                {t("zeri.rangeDays", { n })}
              </button>
            ))}
          </div>
        </div>
        <p className="tool__summary">
          {days.length > 0 ? `${t("zeri.count", { n: days.length })} · ${t("zeri.hint")}` : t("zeri.none")}
        </p>
      </section>

      <ol className="zeri__list">
        {days.map(({ detail, almanac, matched, clashMe, harmMe }) => (
          <li key={detail.julianDay}>
            <button type="button" className={`zeri__day ${clashMe ? "is-clash" : ""}`} onClick={() => void requestOpenDetail(detail.ymd)}>
              <span className="zeri__date">
                <b>{fmtDate(detail.ymd, lang, t)}</b> {weekday(detail.ymd, lang)}
              </span>
              <span className="zeri__meta">
                {lunarText(detail, lang, t)}　{ganzhiLine(detail, lang, t)}　{dayLabel(detail.outfit, lang)}
              </span>
              <span className="zeri__tags">
                {almanac.tianShenType === "黄道" && <span className="tag tag--red">{t("zeri.huangdao")}</span>}
                {almanac.isTianshe && <span className="tag tag--red">{t("zeri.tianshe")}</span>}
                {clashMe && <span className="tag tag--ink">{t("zeri.clashYou")}</span>}
                {harmMe && <span className="tag tag--soft">{t("zeri.harmYou")}</span>}
                <span className="muted">{t("zeri.matched", { words: matched.map((w) => term("yiji", w, lang)).join(lang === "en" ? ", " : "、") })}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}
