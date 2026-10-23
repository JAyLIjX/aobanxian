import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { dailyGua } from "../calendar/guaDay";
import { effectiveDate, type Ymd } from "../core/dayBoundary";
import { BRANCHES, TRIGRAM_ELEMENT, type Trigram } from "../core/gua";
import { fullName, ZHOUYI_SOURCE, type Hexagram } from "../data/zhouyi";
import type { Lang } from "../i18n";
import { fmtDate } from "../i18n/format";
import { castHourFor } from "../settings/guaCast";
import { useWindowSetup } from "./useWindowSetup";

/** 经卦 → 语言文件里的键 */
const TRIGRAM_KEY: Record<Trigram, string> = { 乾: "qian", 兌: "dui", 離: "li", 震: "zhen", 巽: "xun", 坎: "kan", 艮: "gen", 坤: "kun" };

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
        <b lang="zh-Hant">{h.name}</b>
        <span className="gua__full" lang="zh-Hant">
          {fullName(h)}
        </span>
        {lang === "en" && <span className="gua__en">{h.en}</span>}
      </span>
    </div>
  );
}

/** 原文 + 白话 */
function Classic({ label, text, plain, plainLabel }: { label?: string; text: string; plain?: string; plainLabel: string }) {
  return (
    <div className="gua__pair">
      <p className="gua__classic" lang="zh-Hant">
        {label && <b>{label}：</b>}
        {text}
      </p>
      {plain && (
        <p className="gua__plain">
          <span className="gua__plain-label">{plainLabel}</span>
          {plain}
        </p>
      )}
    </div>
  );
}

/**
 * 每日一卦：梅花易数时间起卦。从上到下：卦象、卦辞与彖传和大象传、六爻逐爻、体用、互卦、变卦。
 * 原文（卦辞、彖传、象传、爻辞）保持维基文库繁体；白话为自撰，三种语言。
 */
/** demo：宣传片等离线展示用，固定日期和起卦的钟点 */
export function GuaApp({ demo }: { demo?: { today: Ymd; hour: number } } = {}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { settings, loaded } = useWindowSetup("gua.title");
  const today = demo?.today ?? effectiveDate(new Date(), settings.dayBoundary);
  const [hour, setHour] = useState<number | null>(demo?.hour ?? null);
  useEffect(() => {
    if (loaded && !demo) void castHourFor(today).then(setHour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  const g = useMemo(() => (hour === null ? null : dailyGua(today, hour)), [hour, today.year, today.month, today.day]); // eslint-disable-line react-hooks/exhaustive-deps
  // 六爻：动爻默认展开，其余收起
  const [openLines, setOpenLines] = useState<Set<number> | null>(null);
  useEffect(() => {
    if (g) setOpenLines(new Set([g.cast.moving - 1]));
  }, [g]);
  // 开发版截图（VITE_TEST_SHOT=windows）：4 秒后滚到动爻那一条
  useEffect(() => {
    if (!g || !import.meta.env.DEV || import.meta.env.VITE_TEST_SHOT !== "windows") return;
    const timer = window.setTimeout(() => document.querySelector(".gua__yao-item.is-moving")?.scrollIntoView({ block: "center" }), 4000);
    return () => window.clearTimeout(timer);
  }, [g]);
  if (!g) return <main className="tool paper" />;

  const { main, hu, changed, cast: c, input, tiYong: ty } = g;
  const m = c.moving - 1;
  const hourIdx = BRANCHES.indexOf(input.hourBranch);
  const hourRange = t("gua.hourRange", { from: (hourIdx * 2 + 23) % 24, to: (hourIdx * 2 + 1) % 24 });
  const positions = t("gua.linePosition", { returnObjects: true }) as string[];
  const tri = (x: Trigram) => t(`gua.trigram.${TRIGRAM_KEY[x]}.name`);
  const el = (x: Trigram) => t(`gua.element.${TRIGRAM_ELEMENT[x]}`);
  const hexFull = (h: Hexagram) =>
    lang === "en"
      ? `${fullName(h)} · ${h.en}`
      : h.upper === h.lower
        ? `${tri(h.upper)}${lang === "zh-TW" ? "為" : "为"}${t(`gua.trigram.${TRIGRAM_KEY[h.upper]}.image`)}`
        : `${t(`gua.trigram.${TRIGRAM_KEY[h.upper]}.image`)}${t(`gua.trigram.${TRIGRAM_KEY[h.lower]}.image`)}${h.nameLocal?.[lang] ?? h.name}`;
  const trigramLines = (main.upper === main.lower ? [main.upper] : [main.upper, main.lower]).map((x) =>
    t("gua.trigramLine", { name: tri(x), image: t(`gua.trigram.${TRIGRAM_KEY[x]}.image`), element: el(x), meaning: t(`gua.trigram.${TRIGRAM_KEY[x]}.meaning`) }),
  );
  const toggleLine = (i: number) =>
    setOpenLines((s) => {
      const next = new Set(s ?? []);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const plainLabel = t("gua.plain");

  return (
    <main className="tool paper gua">
      <section className="tool__controls">
        <div className="gua__date">
          <b>{fmtDate(today, lang, t)}</b>
          <span className="muted">
            {t("gua.castAt", { hour: lang === "en" ? `${input.hourBranch} (${hourRange})` : `${input.hourBranch}${lang === "zh-TW" ? "時" : "时"}（${hourRange}）` })}
          </span>
        </div>
        <p className="tool__summary">{t("gua.note")}</p>
      </section>

      <div className="tool__body">
        {/* 1. 卦象 */}
        <section className="gua__block">
          <h3 className="gua__label">
            {t("gua.sectionImage")} · {t("gua.main")}
          </h3>
          <div className="gua__head">
            <Lines lines={c.lines} moving={c.moving} />
            <Title h={main} lang={lang} />
          </div>
          <p className="gua__composition">{t("gua.composition", { upper: tri(main.upper), lower: tri(main.lower), full: hexFull(main) })}</p>
          <ul className="gua__trigrams">
            {trigramLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="gua__plain">{main.image[lang]}</p>
        </section>

        {/* 2. 卦辞与彖传、大象传 */}
        <section className="gua__block">
          <h3 className="gua__label">{t("gua.sectionText")}</h3>
          <Classic text={`${main.name}：${main.judgment}`} plain={main.reading[lang]} plainLabel={plainLabel} />
          <Classic label={t("gua.tuanLabel")} text={main.tuan} plain={main.tuanPlain[lang]} plainLabel={plainLabel} />
          <Classic label={t("gua.daxiangLabel")} text={main.daxiang} plain={main.daxiangPlain[lang]} plainLabel={plainLabel} />
        </section>

        {/* 3. 六爻逐爻：动爻高亮并展开，其余默认收起 */}
        <section className="gua__block">
          <h3 className="gua__label">
            {t("gua.sectionLines")}
            <span className="gua__moving">{t("gua.movingLine", { position: positions[m], tag: main.lineTags[m] })}</span>
          </h3>
          <ol className="gua__yao">
            {main.lines.map((text, i) => {
              const open = openLines?.has(i) ?? i === m;
              return (
                <li key={i} className={`gua__yao-item ${i === m ? "is-moving" : ""} ${open ? "is-open" : ""}`}>
                  <button type="button" className="gua__yao-head" aria-expanded={open} onClick={() => toggleLine(i)}>
                    <span className="gua__yao-pos">{positions[i]}</span>
                    <span lang="zh-Hant" className="gua__yao-text">
                      <b>{main.lineTags[i]}</b>：{text}
                    </span>
                    {i === m && <span className="tag tag--red">{t("gua.movingTag")}</span>}
                    <span className="gua__yao-arrow" aria-hidden="true">
                      {open ? "▾" : "▸"}
                    </span>
                  </button>
                  {open && (
                    <div className="gua__yao-body">
                      <p className="gua__classic" lang="zh-Hant">
                        <b>{t("gua.xiaoxiangLabel")}：</b>
                        {main.xiaoxiang[i]}
                      </p>
                      <p className="gua__plain">
                        <span className="gua__plain-label">{plainLabel}</span>
                        {main.lineReadings[lang][i]}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {main.extra && (
            <p className="gua__classic gua__extra" lang="zh-Hant">
              {main.extra.tag}：{main.extra.text}
              {main.xiaoxiang[6] && <span>　{t("gua.xiaoxiangLabel")}：{main.xiaoxiang[6]}</span>}
              <span className="muted">　{t("gua.extraNote", { tag: main.extra.tag })}</span>
            </p>
          )}
        </section>

        {/* 4. 体用：动爻所在的经卦为用，另一个为体 */}
        <section className="gua__block">
          <h3 className="gua__label">
            {t("gua.sectionTiYong")}
            <span className={`tag ${ty.tone === "smooth" ? "tag--red" : "tag--soft"}`}>{t(`gua.tone.${ty.tone}`)}</span>
          </h3>
          <p>
            {t("gua.tiYongIntro", {
              where: t(`gua.where.${ty.yongIs}`),
              yongWhere: t(`gua.where.${ty.yongIs}`),
              tiWhere: t(`gua.where.${ty.yongIs === "lower" ? "upper" : "lower"}`),
              yong: tri(ty.yong),
              ti: tri(ty.ti),
            })}
          </p>
          <p>
            {t("gua.tiYongPair", { ti: tri(ty.ti), yong: tri(ty.yong), tiElement: el(ty.ti), yongElement: el(ty.yong), relation: t(`gua.relation.${ty.relation}`) })}
          </p>
          <p className="gua__plain">{t(`gua.relationMeaning.${ty.relation}`)}</p>
        </section>

        {/* 5. 互卦 */}
        <section className="gua__block">
          <h3 className="gua__label">{t("gua.sectionHu")}</h3>
          <div className="gua__head">
            <Lines lines={g.huLines} />
            <Title h={hu} lang={lang} />
          </div>
          <Classic text={`${hu.name}：${hu.judgment}`} plain={hu.brief[lang]} plainLabel={plainLabel} />
          <p className="muted gua__note">{t("gua.huNote")}</p>
        </section>

        {/* 6. 变卦 */}
        <section className="gua__block">
          <h3 className="gua__label">{t("gua.sectionChanged")}</h3>
          <div className="gua__head">
            <Lines lines={c.changedLines} />
            <Title h={changed} lang={lang} />
          </div>
          <Classic text={`${changed.name}：${changed.judgment}`} plain={changed.reading[lang]} plainLabel={plainLabel} />
          <p className="gua__trajectory">{t("gua.trajectory", { main: main.theme[lang], hu: hu.theme[lang], changed: changed.theme[lang] })}</p>
        </section>

        <footer className="lot-paper__source muted">{t("gua.source", { title: ZHOUYI_SOURCE.title })}</footer>
      </div>
    </main>
  );
}
