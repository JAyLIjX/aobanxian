import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { todays, type Anniversary } from "../calendar/anniversary";
import { getDayDetail } from "../calendar/day";
import { getDayExtras, hourIndex } from "../calendar/extras";
import { getAlmanac } from "../calendar/special";
import { poemForDay, poemScript, shortTitle } from "../data/poems";
import { luckyNumbers } from "../core/luckyNumbers";
import { Compass, MarkIcon, MoonIcon, type CompassMark } from "./AlmanacIcons";
import type { Ymd } from "../core/dayBoundary";
import type { Rules } from "../core/rules";
import { personalRelation, ZODIAC, type Branch } from "../core/zodiac";
import type { MyZodiac } from "../settings/settings";
import type { Lang } from "../i18n";
import {
  anniversaryTitle,
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
import { ganzhi, term, termDesc, translate, yijiExplain } from "../i18n/terms";
import { loadOpenSections, saveOpenSections } from "./detailSections";
import { ColorChip } from "./ColorChip";

interface Props {
  ymd: Ymd;
  rules: Rules;
  myZodiac: MyZodiac;
  anniversaries: Anniversary[];
  onChange: (ymd: Ymd) => void;
  onClose: () => void;
  /** 跳到哪一栏（卡片上点名句时跳到「物候与诗」）；seq 每次请求加一，同一栏也能再跳 */
  focus?: { id: SectionId; seq: number } | null;
  /** 固定「现在」（宣传片等离线展示用，决定高亮哪个时辰）；不传就用真实时间 */
  now?: Date;
  /** 四个折叠栏全部展开（离线展示用） */
  openAll?: boolean;
}

/** 详情的各栏，顺序同顶部小目录 */
export const SECTIONS = ["outfit", "yiji", "zodiac", "hours", "positions", "nature", "more"] as const;
export type SectionId = (typeof SECTIONS)[number];
/** 这四栏默认折叠，展开状态记在本机 */
const FOLDABLE: SectionId[] = ["hours", "positions", "nature", "more"];

function addDays(ymd: Ymd, delta: number): Ymd {
  const d = new Date(ymd.year, ymd.month - 1, ymd.day + delta);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function DetailPanel({ ymd, rules, myZodiac, anniversaries, onChange, onClose, focus, now: fixedNow, openAll }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const d = useMemo(() => getDayDetail(ymd, rules), [ymd, rules]);
  const almanac = useMemo(() => getAlmanac(ymd), [ymd]);
  const extras = useMemo(() => getDayExtras(ymd), [ymd]);
  const picked = useMemo(() => poemForDay(ymd), [ymd]);
  const [open, setOpen] = useState<Record<string, boolean>>(() => (openAll ? { hours: true, positions: true, nature: true, more: true } : loadOpenSections()));
  const refs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({});
  const liveNow = useNow();
  const now = fixedNow ?? liveNow;
  const isToday = now.getFullYear() === ymd.year && now.getMonth() + 1 === ymd.month && now.getDate() === ymd.day;
  const currentHour = isToday ? hourIndex(now.getHours()) : null;

  const script = poemScript(lang);
  const bestElements = d.outfit.tiers[0].entries.map((e) => e.element);
  const lucky = luckyNumbers(bestElements);
  const positionMarks: (Omit<CompassMark, "label"> & { key: "xi" | "cai" | "fu" })[] = [
    { key: "xi", dir: extras.positions.xi, shape: "circle" },
    { key: "cai", dir: extras.positions.cai, shape: "diamond" },
    { key: "fu", dir: extras.positions.fu, shape: "triangle" },
  ];

  const toggle = (id: SectionId, value?: boolean) =>
    setOpen((o) => {
      const next = { ...o, [id]: value ?? !o[id] };
      saveOpenSections(next);
      return next;
    });
  const jump = (id: SectionId) => {
    if (FOLDABLE.includes(id) && !open[id]) toggle(id, true);
    requestAnimationFrame(() => {
      // 穿衣是第一栏：滚到最上面，日期和小目录也留在视野里
      if (id === "outfit") refs.current.outfit?.closest(".detail")?.scrollTo({ top: 0, behavior: "smooth" });
      else refs.current[id]?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };
  // 时辰时间轴：把当前时辰滚到中间
  const hoursRef = useRef<HTMLOListElement | null>(null);
  useEffect(() => {
    const ol = hoursRef.current;
    const cell = ol?.querySelector<HTMLElement>(".is-now");
    if (ol && cell) ol.scrollLeft = cell.offsetLeft - ol.offsetLeft - (ol.clientWidth - cell.clientWidth) / 2;
  }, [open.hours, currentHour, ymd]);
  useEffect(() => {
    if (focus) jump(focus.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.seq]);
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
            {todays(anniversaries, ymd).map((a) => (
              <span key={a.id} className="tag tag--red">
                {anniversaryTitle(a, t)}
              </span>
            ))}
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

      <nav className="detail__nav" aria-label={t("detail.navLabel")}>
        {SECTIONS.map((id) => (
          <button key={id} type="button" className="detail__nav-item" onClick={() => jump(id)}>
            {t(`detail.nav.${id}`)}
          </button>
        ))}
      </nav>

      <section className="detail__section" ref={(el) => void (refs.current.outfit = el)}>
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

      <section className="detail__section" ref={(el) => void (refs.current.yiji = el)}>
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
                <span key={x} className="word" title={yijiExplain(x, lang)}>
                  {term("yiji", x, lang)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="detail__section" ref={(el) => void (refs.current.zodiac = el)}>
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
          {myZodiac !== "none" && (
            <>
              <dt>{t("detail.you", { animal: term("zodiac", ZODIAC[myZodiac as Branch], lang) })}</dt>
              <dd>{t(`relation.${personalRelation(d.pillar.branch, myZodiac)}`)}</dd>
            </>
          )}
          <dt>{t("detail.xiu")}</dt>
          <dd>
            {xiuName(d, lang)}　<span className="mark">{xiuLuck(d, rules, lang, t)}</span>
          </dd>
        </dl>
      </section>

      {/* 时辰：十二时辰横向时间轴，子时跨两天作为一格；看今天时高亮当前时辰 */}
      <Fold id="hours" title={t("detail.sectionHours")} open={!!open.hours} onToggle={() => toggle("hours")} refs={refs}>
        <ol className="hours" ref={hoursRef} aria-label={t("detail.sectionHours")}>
          {extras.hours.map((h, i) => (
            <li key={h.branch} className={`hours__cell hours__cell--${h.luck === "吉" ? "good" : "fair"} ${i === currentHour ? "is-now" : ""}`} aria-current={i === currentHour ? "time" : undefined}>
              <b>{t("detail.hourName", { branch: translate("branch", h.branch, lang === "en" ? "zh-CN" : lang) })}</b>
              {lang === "en" && <span className="hours__en">{translate("branch", h.branch, lang)}</span>}
              <span className="hours__time">
                {h.start}
                <br />
                {h.end}
              </span>
              <span className="hours__gz">{ganzhi(h.ganzhi, lang === "en" ? "zh-CN" : lang)}</span>
              <span className="hours__luck">{t(`detail.hourLuck.${h.luck === "吉" ? "good" : "fair"}`)}</span>
              {i === currentHour && <span className="hours__now">{t("detail.now")}</span>}
            </li>
          ))}
        </ol>
        <p className="muted detail__note">{t("detail.hoursNote")}</p>
      </Fold>

      {/* 方位与数字：喜神、财神、福神方位 + 小罗盘；幸运数字按河图数配大吉的五行 */}
      <Fold id="positions" title={t("detail.sectionPositions")} open={!!open.positions} onToggle={() => toggle("positions")} refs={refs}>
        <div className="positions">
          <Compass
            marks={positionMarks.map((m) => ({ ...m, label: t(`detail.god.${m.key}`) }))}
            labels={{ n: t("detail.compass.n"), e: t("detail.compass.e"), s: t("detail.compass.s"), w: t("detail.compass.w") }}
          />
          <ul className="positions__legend">
            {positionMarks.map((m) => (
              <li key={m.key}>
                <MarkIcon shape={m.shape} />
                {t(`detail.god.${m.key}`)} <b>{term("direction", m.dir, lang)}</b>
              </li>
            ))}
          </ul>
        </div>
        <dl className="facts">
          <dt>{t("detail.luckyNumbers")}</dt>
          <dd>
            <span className="lucky-numbers">{lucky.join(lang === "en" ? ", " : "、")}</span>
            <span className="muted">　{t("detail.luckyNumbersHint", { elements: bestElements.map((e) => term("element", e, lang)).join(lang === "en" ? ", " : "、") })}</span>
          </dd>
        </dl>
      </Fold>

      {/* 物候与诗：七十二候（古籍原文用字）、月相、每日一诗 */}
      <Fold id="nature" title={t("detail.sectionNature")} open={!!open.nature} onToggle={() => toggle("nature")} refs={refs}>
        <dl className="facts">
          <dt>{t("detail.wuhou")}</dt>
          <dd>
            {t("detail.wuhouValue", {
              jieqi: term("jieqi", extras.wuhou.jieqi, lang),
              hou: translate("hou", extras.wuhou.hou, lang),
              name: term("wuhou", extras.wuhou.name, lang),
            })}
            <span className="muted detail__desc">{termDesc("wuhou", extras.wuhou.name, lang)}</span>
          </dd>
          <dt>{t("detail.yueXiang")}</dt>
          <dd className="moon">
            <MoonIcon lunarDay={extras.moon.lunarDay} />
            <span>{term("yuexiang", extras.moon.name, lang)}</span>
          </dd>
        </dl>
        <div className="poem">
          <h4 className="poem__head">
            {t("detail.sectionPoem")}
            {picked.reason !== "season" && (
              <span className="tag tag--red">
                {picked.reason === "moon"
                  ? t("detail.poemReason.moon")
                  : term(picked.reason === "festival" ? "festival" : "jieqi", (picked.reason === "festival" ? picked.poem.festival : picked.poem.jieqi) ?? "", lang)}
              </span>
            )}
          </h4>
          <p className="poem__title">
            {/* 组诗只显示短题目，完整题目放在悬停提示里 */}
            <span className="poem__name" lang={script === "zh-TW" ? "zh-Hant" : "zh-Hans"} title={picked.poem.title[script]}>
              {shortTitle(picked.poem.title[script])}
            </span>
            <span className="poem__author muted">
              {t("detail.poemAuthor", { dynasty: picked.poem.dynasty === "唐" ? t("detail.dynasty.tang") : t("detail.dynasty.song"), author: picked.poem.author[script] })}
            </span>
            {lang === "en" && (
              <span className="poem__en muted">
                {picked.poem.titleEn} · {picked.poem.authorEn}
              </span>
            )}
          </p>
          <div className={`poem__lines poem__lines--${picked.poem.kind}`} lang={script === "zh-TW" ? "zh-Hant" : "zh-Hans"}>
            {picked.poem.lines[script].map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          <p className="poem__gist">{picked.poem.appreciation[lang]}</p>
          <p className="poem__source muted">{t("detail.poemSource")}</p>
        </div>
      </Fold>

      {/* 更多黄历：建除十二神、彭祖百忌、胎神方位、九星 */}
      <Fold id="more" title={t("detail.sectionMore")} open={!!open.more} onToggle={() => toggle("more")} refs={refs}>
        <dl className="facts">
          <dt>{t("detail.zhiXing")}</dt>
          <dd>
            {t("detail.zhiXingValue", { name: term("zhixing", extras.zhiXing, lang) })}
            <span className="muted detail__desc">{termDesc("zhixing", extras.zhiXing, lang)}</span>
          </dd>
          <dt>{t("detail.pengzu")}</dt>
          <dd>{extras.pengzu.map((p) => term("pengzu", p, lang)).join(lang === "en" ? "; " : "　")}</dd>
          <dt>{t("detail.taishen")}</dt>
          <dd>
            {term("taishen", extras.taishen, lang)}
            <span className="muted detail__desc">{t("detail.taishenHint")}</span>
          </dd>
          <dt>{t("detail.nineStar")}</dt>
          <dd>{term("ninestar", extras.nineStar.name, lang)}</dd>
        </dl>
      </Fold>

      <footer className="detail__foot">{t("detail.foot")}</footer>
    </article>
  );
}

/** 可折叠的一栏：标题是按钮，展开状态由详情面板记在本机 */
function Fold({
  id,
  title,
  open,
  onToggle,
  refs,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: () => void;
  refs: React.MutableRefObject<Partial<Record<SectionId, HTMLElement | null>>>;
  children: ReactNode;
}) {
  return (
    <section className={`detail__section detail__fold ${open ? "is-open" : ""}`} ref={(el) => void (refs.current[id] = el)}>
      <h3>
        <button type="button" className="detail__fold-head" aria-expanded={open} aria-controls={`detail-${id}`} onClick={onToggle}>
          <span className="detail__fold-arrow" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
          {title}
        </button>
      </h3>
      {open && <div id={`detail-${id}`}>{children}</div>}
    </section>
  );
}

/** 现在的时间，每分钟更新一次（高亮当前时辰用） */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
