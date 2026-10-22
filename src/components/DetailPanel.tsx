import { useEffect, useMemo } from "react";
import { getDayDetail } from "../calendar/day";
import type { Ymd } from "../core/dayBoundary";
import type { Rules } from "../core/rules";
import { PHASE_NAMES } from "../core/wuxing";
import { ColorChip } from "./ColorChip";

interface Props {
  ymd: Ymd;
  rules: Rules;
  onChange: (ymd: Ymd) => void;
  onClose: () => void;
}

const SOURCE_NAMES = { nayin: "纳音", stem: "日干", branch: "日支" } as const;

function addDays(ymd: Ymd, delta: number): Ymd {
  const d = new Date(ymd.year, ymd.month - 1, ymd.day + delta);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function DetailPanel({ ymd, rules, onChange, onClose }: Props) {
  const d = useMemo(() => getDayDetail(ymd, rules), [ymd, rules]);
  const { outfit, zodiac, xiu } = d;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onChange(addDays(ymd, -1));
      if (e.key === "ArrowRight") onChange(addDays(ymd, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ymd, onChange]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article className="card paper detail" role="dialog" aria-label="当日详情">
        {/* 1. 日期与当日五行 */}
        <header className="detail__head">
          <button type="button" className="icon-btn" onClick={() => onChange(addDays(ymd, -1))} aria-label="前一天">
            ‹
          </button>
          <div className="detail__title">
            <h2 className="display">
              {d.ymd.year}年{d.ymd.month}月{d.ymd.day}日
            </h2>
            <p>
              {d.weekday}　{d.lunar.text}
              {[d.jieqi, ...d.festivals].filter(Boolean).map((m) => (
                <span key={m} className="mark">
                  {m}
                </span>
              ))}
            </p>
            <p>
              {d.ganzhi.year}年 {d.ganzhi.month}月 <b>{d.ganzhi.day}日</b>
            </p>
            <p className="detail__element">
              当日五行：<b>{d.pillar.nayin}</b>
              {outfit.day.source !== "nayin" && (
                <span className="muted">
                  （按{SOURCE_NAMES[outfit.day.source]}取 {outfit.day.label}）
                </span>
              )}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={() => onChange(addDays(ymd, 1))} aria-label="后一天">
            ›
          </button>
          <button type="button" className="icon-btn detail__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        {/* 2. 穿衣 */}
        <section className="detail__section">
          <h3>穿衣</h3>
          <div className="tiers">
            {outfit.tiers.map((tier) => (
              <div key={tier.key} className={`tier tier--${tier.key}`}>
                <span className="tier__label">{tier.label}</span>
                <div className="tier__body">
                  {tier.entries.map((entry) => (
                    <div key={entry.phase} className="tier__entry">
                      <span className="tier__element" title={`${entry.element}：${PHASE_NAMES[entry.phase]}`}>
                        {entry.element}
                        {entry.phase === outfit.primary.phase && <small>上衣</small>}
                        {entry.phase === outfit.accent.phase && <small>围巾</small>}
                      </span>
                      {entry.colors.map((c) => (
                        <ColorChip key={c.name} color={c} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="detail__explain">{outfit.explanation}</p>
        </section>

        {/* 3. 宜忌 */}
        <section className="detail__section">
          <h3>宜忌</h3>
          <div className="yiji">
            <span className="yiji__label yiji__label--yi">宜</span>
            <div className="words">
              {d.yi.map((x) => (
                <span key={x} className="word">
                  {x}
                </span>
              ))}
            </div>
          </div>
          <div className="yiji">
            <span className="yiji__label yiji__label--ji">忌</span>
            <div className="words">
              {d.ji.map((x) => (
                <span key={x} className="word">
                  {x}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 4. 生肖与星宿 */}
        <section className="detail__section">
          <h3>生肖与星宿</h3>
          <dl className="facts">
            <dt>吉生肖</dt>
            <dd>
              六合 {zodiac.sixHarmony.animal}
              <span className="muted">（{zodiac.sixHarmony.branch}）</span>　三合{" "}
              {zodiac.threeHarmony.map((r) => r.animal).join("、")}
              <span className="muted">（{zodiac.threeHarmony.map((r) => r.branch).join("")}）</span>
            </dd>
            <dt>今日冲</dt>
            <dd>
              冲{zodiac.clash.animal}
              <span className="muted">（{zodiac.clash.ganzhi}）</span>　煞{zodiac.sha}
            </dd>
            <dt>值日星宿</dt>
            <dd>
              {xiu.fullName}　<span className="mark">{xiu.luckLabel}</span>
            </dd>
          </dl>
        </section>

        <footer className="detail__foot">传统民俗趣味参考，图个好心情</footer>
      </article>
    </div>
  );
}
