import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { dailyGua } from "../calendar/guaDay";
import { effectiveDate } from "../core/dayBoundary";
import { BRANCHES } from "../core/gua";
import { fullName, ZHOUYI_SOURCE, type Hexagram } from "../data/zhouyi";
import type { Lang } from "../i18n";
import { fmtDate } from "../i18n/format";
import { castHourFor } from "../settings/guaCast";
import { useWindowSetup } from "./useWindowSetup";

/** 六爻，从下往上画；动爻标红 */
function Lines({ lines, moving }: { lines: number[]; moving?: number }) {
  return (
    <div className="gua-lines" aria-hidden>
      {[...lines].reverse().map((l, i) => {
        const idx = 6 - i;
        return (
          <div key={idx} className={`gua-line ${l ? "is-yang" : "is-yin"} ${moving === idx ? "is-moving" : ""}`}>
            <i />
            {!l && <i />}
          </div>
        );
      })}
    </div>
  );
}

function Title({ h, lang }: { h: Hexagram; lang: Lang }) {
  return (
    <div className="gua__title">
      <span className="gua__symbol">{h.symbol}</span>
      <span>
        <b lang="zh-Hant">
          {h.name}
        </b>
        <span className="gua__full" lang="zh-Hant">
          {fullName(h)}
        </span>
        {lang === "en" && <span className="gua__en">{h.en}</span>}
      </span>
    </div>
  );
}

/** 每日一卦：梅花易数时间起卦，本卦、动爻、变卦 */
export function GuaApp() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { settings, loaded } = useWindowSetup("gua.title");
  const today = effectiveDate(new Date(), settings.dayBoundary);
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    if (loaded) void castHourFor(today).then(setHour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  const g = useMemo(() => (hour === null ? null : dailyGua(today, hour)), [hour, today.year, today.month, today.day]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return <main className="tool paper" />;

  const { main, changed, cast: c, input } = g;
  const i = c.moving - 1;
  const hourIdx = BRANCHES.indexOf(input.hourBranch);
  const hourRange = t("gua.hourRange", { from: (hourIdx * 2 + 23) % 24, to: (hourIdx * 2 + 1) % 24 });

  return (
    <main className="tool paper gua">
      <section className="tool__controls">
        <div className="gua__date">
          <b>{fmtDate(today, lang, t)}</b>
          <span className="muted">
            {t("gua.castAt", { hour: lang === "en" ? `${input.hourBranch} (${hourRange})` : `${input.hourBranch}时（${hourRange}）` })}
          </span>
        </div>
        <p className="tool__summary">{t("gua.note")}</p>
      </section>

      <div className="tool__body">
        <section className="gua__block">
          <h3 className="gua__label">{t("gua.main")}</h3>
          <div className="gua__head">
            <Lines lines={c.lines} moving={c.moving} />
            <Title h={main} lang={lang} />
          </div>
          <p className="gua__classic" lang="zh-Hant">
            {main.name}：{main.judgment}
          </p>
          <p className="gua__plain">{main.reading[lang]}</p>
        </section>

        <section className="gua__block">
          <h3 className="gua__label">{t("gua.movingLine", { n: c.moving })}</h3>
          <p className="gua__classic" lang="zh-Hant">
            {main.lineTags[i]}：{main.lines[i]}
          </p>
          <p className="gua__plain">{main.lineReadings[lang][i]}</p>
          {main.extra && (
            <p className="gua__classic gua__extra" lang="zh-Hant">
              {main.extra.tag}：{main.extra.text}
              <span className="muted">　{t("gua.extraNote", { tag: main.extra.tag })}</span>
            </p>
          )}
        </section>

        <section className="gua__block">
          <h3 className="gua__label">{t("gua.changed")}</h3>
          <div className="gua__head">
            <Lines lines={c.changedLines} />
            <Title h={changed} lang={lang} />
          </div>
          <p className="gua__classic" lang="zh-Hant">
            {changed.name}：{changed.judgment}
          </p>
          <p className="gua__plain">{changed.reading[lang]}</p>
        </section>

        <footer className="lot-paper__source muted">{t("gua.source", { title: ZHOUYI_SOURCE.title })}</footer>
      </div>
    </main>
  );
}
