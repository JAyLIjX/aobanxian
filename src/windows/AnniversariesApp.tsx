import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  nextDate,
  daysBetween,
  type Anniversary,
  type AnniversaryType,
} from "../calendar/anniversary";
import { effectiveDate, type Ymd } from "../core/dayBoundary";
import type { Lang } from "../i18n";
import {
  anniversaryDate,
  anniversaryTitle,
  fmtDate,
  lunarDayName,
  lunarMonthName,
  monthName,
  weekday,
} from "../i18n/format";
import { toTW } from "../i18n/terms";
import { requestOpenDetail } from "../platform/windows";
import { newAnniversaryId, useAnniversaries } from "../settings/anniversaries";
import { useWindowSetup } from "./useWindowSetup";
import { TextField } from "../components/TextField";

/** 纪念日名称最多几个字 */
const MAX_ANNIV_NAME = 20;

const TYPES: AnniversaryType[] = ["birthday", "anniversary", "other"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function blank(today: { year: number }): Anniversary {
  return {
    id: "",
    name: "",
    type: "birthday",
    calendar: "solar",
    year: today.year,
    month: 1,
    day: 1,
    leap: false,
    repeat: true,
  };
}

/** 纪念日管理：列表（下次的公历日期、还有几天）+ 添加 / 编辑表单 */
/** demo：宣传片等离线展示用，固定「今天」和纪念日列表（不读写本机数据） */
export function AnniversariesApp({ demo }: { demo?: { today: Ymd; list: Anniversary[] } } = {}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { settings } = useWindowSetup("anniv.title");
  const stored = useAnniversaries();
  const list = demo?.list ?? stored.list;
  const save = stored.save;
  const today = demo?.today ?? effectiveDate(new Date(), settings.dayBoundary);
  const [editing, setEditing] = useState<Anniversary | null>(null);
  // 名称输入框里当前的字是否合法（超字数或空白时不能保存）
  const [nameValid, setNameValid] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      list
        .map((a) => {
          const next = nextDate(a, today);
          return { a, next, left: next ? daysBetween(today, next) : Infinity };
        })
        .sort((x, y) => x.left - y.left),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, today.year, today.month, today.day],
  );

  const submit = async () => {
    if (!editing || !editing.name.trim() || !nameValid) return;
    const clean: Anniversary = {
      ...editing,
      id: editing.id || newAnniversaryId(),
      name: editing.name.trim(),
      leap: editing.calendar === "lunar" && editing.leap,
      year: editing.repeat ? undefined : editing.year,
    };
    await save((prev) =>
      prev.some((x) => x.id === clean.id)
        ? prev.map((x) => (x.id === clean.id ? clean : x))
        : [...prev, clean],
    );
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    await save((prev) => prev.filter((x) => x.id !== id));
  };

  const leftText = (left: number) =>
    left === 0
      ? t("anniv.today")
      : left === 1
        ? t("anniv.tomorrow")
        : t("anniv.daysLeft", { n: left });

  const dayOptions = (e: Anniversary) =>
    Array.from(
      { length: e.calendar === "lunar" ? 30 : 31 },
      (_, i) => i + 1,
    ).map((d) => ({
      value: d,
      label:
        e.calendar === "lunar" && lang !== "en"
          ? lunarDayName(d, lang)
          : String(d),
    }));
  const monthLabel = (e: Anniversary, m: number) => {
    if (e.calendar === "solar")
      return lang === "en"
        ? monthName(m, lang)
        : t("date.month", { month: m, monthName: monthName(m, lang) });
    if (lang === "en") return `${m}`;
    const name = lunarMonthName(m);
    return lang === "zh-TW" ? toTW(name) : name;
  };

  return (
    <main className="tool paper">
      {!editing && (
        <>
          <section className="tool__controls">
            <div className="tool__row anniv__bar">
              <span className="tool__summary">
                {list.length > 0 ? t("anniv.hint") : t("anniv.empty")}
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setNameValid(true);
                  setEditing(blank(today));
                }}
              >
                {t("anniv.add")}
              </button>
            </div>
          </section>
          <ol className="zeri__list">
            {rows.map(({ a, next, left }) => (
              <li key={a.id} className="anniv__item">
                <button
                  type="button"
                  className="zeri__day"
                  disabled={!next}
                  onClick={() => next && void requestOpenDetail(next)}
                >
                  <span className="zeri__date">
                    <b>{anniversaryTitle(a, t)}</b>{" "}
                    <span className="tag tag--ink">
                      {t(`anniv.types.${a.type}`)}
                    </span>
                  </span>
                  <span className="zeri__meta">
                    {anniversaryDate(a, lang, t)}
                  </span>
                  <span className="zeri__tags">
                    {next ? (
                      <>
                        <span className="muted">
                          {t("anniv.next", {
                            date: fmtDate(next, lang, t),
                            weekday: weekday(next, lang),
                          })}
                        </span>
                        <span
                          className={`tag ${left === 0 ? "tag--red" : "tag--ink"}`}
                        >
                          {leftText(left)}
                        </span>
                      </>
                    ) : (
                      <span className="muted">{t("anniv.past")}</span>
                    )}
                  </span>
                </button>
                <span className="anniv__actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setNameValid(true);
                      setEditing({ ...a, year: a.year ?? today.year });
                    }}
                  >
                    {t("anniv.edit")}
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => void remove(a.id)}
                    onBlur={() => setConfirmId(null)}
                  >
                    {confirmId === a.id
                      ? t("anniv.confirmDelete")
                      : t("anniv.delete")}
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <p className="tool__foot muted">{t("anniv.local")}</p>
        </>
      )}

      {editing && (
        <form
          className="anniv__form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="tool__row">
            <span className="tool__label">{t("anniv.name")}</span>
            <TextField
              key={editing.id || "new"}
              value={editing.name}
              max={MAX_ANNIV_NAME}
              required
              autoFocus
              placeholder={t("anniv.namePlaceholder")}
              onCommit={(name) => setEditing((e) => e && { ...e, name })}
              onValidChange={setNameValid}
            />
          </label>
          <div className="tool__row">
            <span className="tool__label">{t("anniv.type")}</span>
            <div className="segmented">
              {TYPES.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  className={editing.type === ty ? "is-on" : ""}
                  onClick={() => setEditing({ ...editing, type: ty })}
                >
                  {t(`anniv.types.${ty}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="tool__row">
            <span className="tool__label">{t("anniv.calendar")}</span>
            <div className="segmented">
              {(["solar", "lunar"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={editing.calendar === c ? "is-on" : ""}
                  onClick={() =>
                    setEditing({
                      ...editing,
                      calendar: c,
                      day: Math.min(editing.day, c === "lunar" ? 30 : 31),
                    })
                  }
                >
                  {t(`anniv.calendars.${c}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="tool__row">
            <span className="tool__label">{t("anniv.date")}</span>
            <div className="anniv__date">
              {!editing.repeat && (
                <input
                  className="text-input anniv__year"
                  type="number"
                  min={1901}
                  max={2099}
                  aria-label={t("anniv.year")}
                  value={editing.year ?? today.year}
                  onChange={(e) =>
                    setEditing({ ...editing, year: Number(e.target.value) })
                  }
                />
              )}
              <select
                aria-label={t("anniv.date")}
                value={editing.month}
                onChange={(e) =>
                  setEditing({ ...editing, month: Number(e.target.value) })
                }
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(editing, m)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("anniv.date")}
                value={editing.day}
                onChange={(e) =>
                  setEditing({ ...editing, day: Number(e.target.value) })
                }
              >
                {dayOptions(editing).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {editing.calendar === "lunar" && (
            <label className="tool__row anniv__check">
              <input
                type="checkbox"
                checked={editing.leap}
                onChange={(e) =>
                  setEditing({ ...editing, leap: e.target.checked })
                }
              />
              <span>
                {t("anniv.leap")}
                <span className="set-row__hint">{t("anniv.leapHint")}</span>
              </span>
            </label>
          )}
          {editing.calendar === "lunar" && editing.day === 30 && (
            <p className="set-row__hint">{t("anniv.day30Hint")}</p>
          )}
          <label className="tool__row anniv__check">
            <input
              type="checkbox"
              checked={editing.repeat}
              onChange={(e) =>
                setEditing({ ...editing, repeat: e.target.checked })
              }
            />
            <span>{t("anniv.repeat")}</span>
          </label>
          <div className="anniv__buttons">
            <button
              type="button"
              className="text-btn"
              onClick={() => setEditing(null)}
            >
              {t("anniv.cancel")}
            </button>
            <button
              type="submit"
              className="btn"
              disabled={!editing.name.trim() || !nameValid}
            >
              {t("anniv.save")}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
