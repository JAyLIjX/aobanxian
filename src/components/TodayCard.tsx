import type { KeyboardEvent, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import type { DayDetail } from "../calendar/day";
import type { Rules } from "../core/rules";
import type { Lang } from "../i18n";
import { dayLabel, fmtYearMonth, ganzhiLine, lunarText, tip as tipText, weekday } from "../i18n/format";
import { term } from "../i18n/terms";
import { ColorChip } from "./ColorChip";

interface Props {
  detail: DayDetail;
  rules: Rules;
  monthOpen: boolean;
  onOpenDetail: () => void;
  onToggleMonth: () => void;
}

/** 卷轴上的今日卡片：点纸面看当天详情，点「月历」展开月历 */
export function TodayCard({ detail, rules, monthOpen, onOpenDetail, onToggleMonth }: Props) {
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

      <div className="today__outfit">
        <span>{t("card.todayElement", { label: dayLabel(outfit, lang) })}</span>
        <span className="today__wear">
          {t("card.wear")}
          <ColorChip color={outfit.primary} />
          {t("card.with")}
          <ColorChip color={outfit.accent} />
        </span>
      </div>
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
