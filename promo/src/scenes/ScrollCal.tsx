/**
 * 4. 挂轴日历：鼠标点道士，道士轻跳，幡收起、展开成挂轴卡片（日期、农历、干支、大吉色系、每日一诗名句）；
 * 再点「月历」展开月历，点「›」翻到下个月。
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../captions";
import { Caption } from "../lib/Caption";
import { DAY, DETAIL, MY_ZODIAC, outfitOf, RULES } from "../lib/data";
import { Cursor, type CursorKey } from "../lib/Cursor";
import { Desktop } from "../lib/Desktop";
import { PixelSprite } from "../lib/PixelSprite";
import { ScrollFrame } from "../lib/ScrollFrame";
import { Place } from "../lib/Place";
import { i18nFor, Lang } from "../lib/setup";
import { Sfx } from "../lib/Sfx";
import { localBeat } from "../lib/timing";
import { nextCountdown } from "../../../src/calendar/countdown";
import { MonthView } from "../../../src/components/MonthView";
import { TodayCard } from "../../../src/components/TodayCard";
import { personalRelation } from "../../../src/core/zodiac";
import { poemForDay, shortTitle } from "../../../src/data/poems";
import { term } from "../../../src/i18n/terms";

const t = i18nFor("zh-CN").t;

/** 卡片上的文字：和 MainApp 一样算 */
export function cardProps(lang: "zh-CN" | "zh-TW" | "en" = "zh-CN") {
  const tt = i18nFor(lang).t;
  const c = nextCountdown(DAY, []);
  const name = c && c.kind !== "anniversary" ? term(c.kind, c.name, lang) : "";
  const countdown = c ? (c.daysLeft === 1 ? tt("card.countdownTomorrow", { name }) : tt("card.countdown", { name, n: c.daysLeft })) : null;
  const { poem } = poemForDay(DAY);
  const script = lang === "zh-TW" ? "zh-TW" : "zh-CN";
  return {
    detail: DETAIL,
    rules: RULES,
    personal: personalRelation(DETAIL.pillar.branch, MY_ZODIAC),
    countdown,
    famous: { text: poem.famous[script], title: `${poem.author[script]}《${shortTitle(poem.title[script])}》`, fullTitle: poem.title[script] },
  };
}

export function ScrollCal() {
  const frame = useCurrentFrame();
  const clickBody = localBeat("scroll", 1);
  const openAt = clickBody + 3;
  const clickMonth = localBeat("scroll", 5);
  const clickNext = localBeat("scroll", 8);
  const monthOpen = frame >= clickMonth;
  const view = frame >= clickNext ? { year: 2026, month: 11 } : { year: 2026, month: 10 };
  const cell = 4;
  const keys: CursorKey[] = [
    { frame: 0, x: 1700, y: 960 },
    { frame: clickBody - 8, x: 1610, y: 860 },
    { frame: clickBody, x: 1610, y: 860, click: true },
    { frame: clickMonth - 10, x: 1258, y: 450 },
    { frame: clickMonth, x: 1258, y: 450, click: true },
    { frame: clickNext - 10, x: 1262, y: 545 },
    { frame: clickNext, x: 1262, y: 545, click: true },
  ];
  const p = cardProps();
  return (
    <AbsoluteFill>
      <Desktop>
        <div style={{ position: "absolute", left: 1450, top: 590 }}>
          <PixelSprite id="daoshi" outfit={outfitOf(DETAIL)} cell={cell} text="奥半仙" hideBanner={frame >= openAt} jumps={[clickBody]} />
        </div>
        <Lang lang="zh-CN">
          <Place x={720} y={60} zoom={1.45}>
            <ScrollFrame openAt={openAt} cell={4} style={{ position: "relative", width: 400 }}>
              <TodayCard {...p} monthOpen={monthOpen} onOpenDetail={() => {}} onToggleMonth={() => {}} />
              {monthOpen && <MonthView today={DAY} anniversaries={[]} onPick={() => {}} view={view} />}
            </ScrollFrame>
          </Place>
        </Lang>
        <Cursor keys={keys} />
      </Desktop>
      <Caption {...CAPTIONS.scroll} />
      <Sfx name="click" at={clickBody} />
      <Sfx name="unroll" at={openAt} volume={0.4} />
      <Sfx name="click" at={clickMonth} />
      <Sfx name="click" at={clickNext} />
      <Sfx name="flip" at={clickNext + 1} volume={0.28} />
    </AbsoluteFill>
  );
}

export { t as zhT };
