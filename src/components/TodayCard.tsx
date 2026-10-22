import type { KeyboardEvent, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import type { DayDetail } from "../calendar/day";
import type { Rules } from "../core/rules";
import type { PersonalRelation } from "../core/zodiac";
import type { Lang } from "../i18n";
import { dayLabel, familyName, fmtYearMonth, ganzhiLine, lunarText, tip as tipText, weekday } from "../i18n/format";
import { term } from "../i18n/terms";
import { ColorChip } from "./ColorChip";

interface Props {
  detail: DayDetail;
  rules: Rules;
  /** 今天和我的生肖的关系；没设置生肖时为 null */
  personal: PersonalRelation | null;
  monthOpen: boolean;
  onOpenDetail: () => void;
  onToggleMonth: () => void;
}

/** 卷轴上的今日卡片：点纸面看当天详情，点「月历」展开月历 */
export function TodayCard({ detail, rules, personal, monthOpen, onOpenDetail, onToggleMonth }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { ymd, outfit } = detail;
  const marks = [
    ...(detail.jieqi ? [term("jieqi", detail.jieqi, lang)] : []),
    ...detail.festivals.map((f) => term("festival", f, lang)),
  ];
  const tip = tipText(detail, rules, lang, t);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpenDetail();
    }
  };
  const toggleMonth = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleMonth();
  };

  return (
    <section className="today" role="button" tabIndex={0} aria-label={t("detail.label")} onClick={onOpenDetail} onKeyDown={onKeyDown}>
      <div className="today__head">
        <span>{fmtYearMonth(ymd, lang, t)}</span>
        <span>{weekday(ymd, lang)}</span>
      </div>

      <div className="today__main">
        <div className="today__day display">{ymd.day}</div>
        <div className="today__lunar">
          <div className="today__lunar-date display">{lunarText(detail, lang, t)}</div>
          <div className="today__ganzhi">{ganzhiLine(detail, lang, t)}</div>
          {marks.length > 0 && (
            <div className="today__marks">
              {marks.map((m) => (
                <span key={m} className="mark">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="today__element">{t("card.todayElement", { label: dayLabel(outfit, lang) })}</div>
      {/* 两个大吉色平等并列，相在前；每个色系 3 个小色块，悬停显示传统色名 */}
      <div className="today__lucky">
        <span className="today__lucky-label">{t("card.lucky")}</span>
        {outfit.tiers[0].entries.map((entry, i) => (
          <span key={entry.phase} className="today__family">
            {i > 0 && <span className="today__sep">{t("card.familySep")}</span>}
            {familyName(entry.element, rules, lang, true)}
            {entry.colors.slice(0, 3).map((c) => (
              <ColorChip key={c.name} color={c} label="none" />
            ))}
          </span>
        ))}
      </div>
      {personal && (
        <div className={`today__personal today__personal--${personal}`}>
          {t("card.withYou", { relation: t(`relation.${personal}`) })}
        </div>
      )}
      {tip && <div className="today__tip">{tip}</div>}

      <div className="today__foot">
        <span className="today__hint">{t("card.hint")}</span>
        <button type="button" className="text-btn" onClick={toggleMonth} aria-expanded={monthOpen}>
          {monthOpen ? t("card.closeMonth") : t("card.month")}
        </button>
      </div>
    </section>
  );
}
