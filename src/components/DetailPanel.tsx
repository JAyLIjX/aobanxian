import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getDayDetail } from "../calendar/day";
import { getAlmanac } from "../calendar/special";
import type { Ymd } from "../core/dayBoundary";
import type { Rules } from "../core/rules";
import type { Lang } from "../i18n";
import {
  dayLabel,
  explanation,
  familyWithElement,
  fmtDate,
  ganzhiLine,
  lunarText,
  phaseLabel,
  tierLabel,
  weekday,
  xiuLuck,
  xiuName,
} from "../i18n/format";
import { ganzhi, term } from "../i18n/terms";
import { ColorChip } from "./ColorChip";

interface Props {
  ymd: Ymd;
  rules: Rules;
  onChange: (ymd: Ymd) => void;
  onClose: () => void;
}

function addDays(ymd: Ymd, delta: number): Ymd {
  const d = new Date(ymd.year, ymd.month - 1, ymd.day + delta);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function DetailPanel({ ymd, rules, onChange, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const d = useMemo(() => getDayDetail(ymd, rules), [ymd, rules]);
  const almanac = useMemo(() => getAlmanac(ymd), [ymd]);
  const { outfit, zodiac } = d;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onChange(addDays(ymd, -1));
      if (e.key === "ArrowRight") onChange(addDays(ymd, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ymd, onChange]);

  const tianShenTag = t("detail.tianShen", {
    type: term("tianshen", almanac.tianShenType, lang),
    shen: term("tianshen", almanac.tianShen, lang),
  });
  const special = almanac.special;
  const specialTag = special
    ? t(`specialTag.${special.kind}`, { name: special.name ? term(special.kind === "festival" ? "festival" : "jieqi", special.name, lang) : "" })
    : null;
  const marks = [
    ...(d.jieqi ? [term("jieqi", d.jieqi, lang)] : []),
    ...d.festivals.map((f) => term("festival", f, lang)),
  ];
  const animal = (a: string) => term("zodiac", a, lang);

  return (
    <article className="detail paper" role="dialog" aria-label={t("detail.label")}>
      <header className="detail__head">
        <button type="button" className="icon-btn" onClick={() => onChange(addDays(ymd, -1))} aria-label={t("detail.prevDay")}>
          ‹
        </button>
        <div className="detail__title">
          <div className="detail__tags">
            <span className={`tag ${almanac.tianShenType === "黄道" ? "tag--red" : "tag--ink"}`}>{tianShenTag}</span>
            {specialTag && <span className="tag tag--red">{specialTag}</span>}
          </div>
          <h2 className="display">{fmtDate(d.ymd, lang, t)}</h2>
          <p>
            {weekday(d.ymd, lang)}　{lunarText(d, lang, t)}
            {marks.map((m) => (
              <span key={m} className="mark">
                {m}
              </span>
            ))}
          </p>
          <p>{ganzhiLine(d, lang, t)}</p>
          {/* 只写结果，不写取法；纳音作为黄历信息另起一行，不参与配色 */}
          <p className="detail__element">
            {t("detail.element")}：<b>{dayLabel(outfit, lang)}</b>
          </p>
          <p>{t("detail.nayin", { nayin: term("nayin", d.pillar.nayin, lang) })}</p>
        </div>
        <button type="button" className="icon-btn" onClick={() => onChange(addDays(ymd, 1))} aria-label={t("detail.nextDay")}>
          ›
        </button>
        <button type="button" className="icon-btn detail__close" onClick={onClose} aria-label={t("detail.close")}>
          ×
        </button>
      </header>

      <section className="detail__section">
        <h3>{t("detail.sectionOutfit")}</h3>
        <div className="tiers">
          {outfit.tiers.map((tier) => (
            <div key={tier.key} className={`tier tier--${tier.key}`}>
              <span className="tier__label">{tierLabel(tier.key, rules, lang, t)}</span>
              {/* 每档写色系名和五行，下面列传统色名；大吉的两个色系平等并列 */}
              <div className={`tier__body ${tier.entries.length > 1 ? "tier__body--pair" : ""}`}>
                {tier.entries.map((entry) => (
                  <div key={entry.phase} className="tier__family">
                    <div className="tier__family-name" title={phaseLabel(entry.phase, t)}>
                      {familyWithElement(entry.element, rules, lang, t)}
                    </div>
                    <div className="tier__colors">
                      {entry.colors.map((c) => (
                        <ColorChip key={c.name} color={c} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="detail__explain">{explanation(outfit, rules, lang, t)}</p>
      </section>

      <section className="detail__section">
        <h3>{t("detail.sectionYiji")}</h3>
        {(
          [
            ["yi", d.yi],
            ["ji", d.ji],
          ] as const
        ).map(([key, list]) => (
          <div key={key} className="yiji">
            <span className={`yiji__label yiji__label--${key}`}>{t(`detail.${key}`)}</span>
            <div className="words">
              {list.map((x) => (
                <span key={x} className="word">
                  {term("yiji", x, lang)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="detail__section">
        <h3>{t("detail.sectionZodiac")}</h3>
        <dl className="facts">
          <dt>{t("detail.luckyZodiac")}</dt>
          <dd>
            {t("detail.sixHarmony")} {animal(zodiac.sixHarmony.animal)}
            <br />
            {t("detail.threeHarmony")} {zodiac.threeHarmony.map((r) => animal(r.animal)).join(lang === "en" ? ", " : "、")}
          </dd>
          <dt>{t("detail.clashLabel")}</dt>
          <dd>
            {t("detail.clash", { animal: animal(zodiac.clash.animal) })}
            <span className="muted">（{ganzhi(zodiac.clash.ganzhi, lang)}）</span>
            {t("detail.sha", { direction: term("direction", zodiac.sha, lang) })}
          </dd>
          <dt>{t("detail.xiu")}</dt>
          <dd>
            {xiuName(d, lang)}　<span className="mark">{xiuLuck(d, rules, lang, t)}</span>
          </dd>
        </dl>
      </section>

      <footer className="detail__foot">{t("detail.foot")}</footer>
    </article>
  );
}
