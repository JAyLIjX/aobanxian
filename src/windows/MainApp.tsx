import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import branding from "../../config/branding.json";
import { dueReminders, todays } from "../calendar/anniversary";
import { nextCountdown } from "../calendar/countdown";
import { getDayDetail } from "../calendar/day";
import { getAlmanac } from "../calendar/special";
import { DetailPanel, SECTIONS, type SectionId } from "../components/DetailPanel";
import { poemForDay, poemScript, shortTitle } from "../data/poems";
import { MonthView } from "../components/MonthView";
import { Bubble } from "../components/Bubble";
import { Muyu } from "../components/Muyu";
import { Scroll } from "../components/Scroll";
import { Sparkles } from "../components/Sparkles";
import { TodayCard } from "../components/TodayCard";
import { BANNER_RESET_MS, buildBannerItems, nextBannerIndex, type BannerItem } from "../core/banner";
import { createBubble } from "../core/bubble";
import { ymdKey, type Ymd } from "../core/dayBoundary";
import type { Element } from "../core/elements";
import { anchorAfterSwitch, placeOverWriting, placePanel, toLocal, union, windowRect, type Chrome, type Rect } from "../core/layout";
import { openingFor, specialBannerText } from "../core/opening";
import { personalRelation, ZODIAC, zodiacRelations, type Branch } from "../core/zodiac";
import { setLanguage, type Lang } from "../i18n";
import { anniversaryTitle, fmtDate } from "../i18n/format";
import { term, translate } from "../i18n/terms";
import { useToday } from "../hooks/useToday";
import { isContextMenuOpen, popupContextMenu, syncTray, type MenuModel } from "../platform/menu";
import { notify } from "../platform/notify";
import { onOpenDetailRequest, onSayRequest, openView } from "../platform/windows";
import { checkForUpdate, installUpdate } from "../platform/updater";
import { todaysLot } from "../settings/lotBook";
import {
  focusWindow,
  onWindowMoved,
  quitApp,
  setHitRegions,
  setOnTop,
  setWindowRect,
  showWindow,
  windowPosition,
  workAreaAt,
  type HitMask,
} from "../platform/window";
import { rulesWith, SIZE_SCALE } from "../settings/settings";
import { useAnniversaries } from "../settings/anniversaries";
import { knockMerit } from "../settings/merit";
import { playWoodBlock } from "../platform/sound";
import { MUYU_H, MUYU_W } from "../sprite/muyu";
import { getState, setState } from "../settings/store";
import { useSettings } from "../settings/useSettings";
import { Daoshi } from "../sprite/Daoshi";
import { getCharacter, voiceLine } from "../sprite/characters";
import { inBanner, isOpaque, type Outfit, type Ramp } from "../sprite/sprite";

/** 道士四周留给气泡、闪光、翻译小气泡的空白（逻辑像素） */
const CHROME: Chrome = { top: 48, left: 130, right: 170, bottom: 12 };
/** 卷轴 / 详情和道士之间的空隙，离屏幕边缘至少留的距离 */
const GAP = 6;
const SCREEN_MARGIN = 8;
/** 卷轴 / 详情的阴影留边 */
const SHADOW = 10;
/** 木鱼出现几秒（每敲一下重新计时） */
const MUYU_SECONDS = 5;

/** 木鱼（连木槌）在窗口里的位置：小和尚左边、腰的高度 */
function muyuRect(spriteRect: { x: number; y: number }, spriteHeight: number, cell: number) {
  const w = (MUYU_W + 3) * cell;
  const h = (MUYU_H + 9) * cell;
  return { x: spriteRect.x - w + 2 * cell, y: spriteRect.y + spriteHeight * 0.52 * cell - 9 * cell, w, h };
}

/** 失焦后等一会儿再判断，避开原生下拉框、菜单等短暂失焦 */
const BLUR_DELAY = 150;

type ScrollState = "closed" | "open" | "closing";

interface Layout {
  win: Rect;
  sprite: Rect;
  scroll: (Rect & { direction: "down" | "up" }) | null;
  detail: Rect | null;
}

export function MainApp() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { settings, loaded, update } = useSettings();

  useEffect(() => setLanguage(settings.language), [settings.language]);
  useEffect(() => {
    document.documentElement.dataset.displayFont = settings.displayFont;
  }, [settings.displayFont]);
  useEffect(() => {
    if (loaded) void setOnTop(settings.onTop);
  }, [loaded, settings.onTop]);

  // ── 历法数据 ──
  const rules = useMemo(() => rulesWith(settings), [settings]);
  const today = useToday(rules.dayBoundary);
  const detail = useMemo(() => getDayDetail(today, rules), [today, rules]);
  // 卡片底部的名句：今天这首诗最有名的两句
  const todayFamous = useMemo(() => {
    const { poem } = poemForDay(today);
    const script = poemScript(lang);
    return { text: poem.famous[script], title: `${poem.author[script]}《${shortTitle(poem.title[script])}》`, fullTitle: poem.title[script] };
  }, [today, lang]);
  const almanac = useMemo(() => getAlmanac(today), [today]);
  const ramp = useCallback((e: Element) => rules.pixelRamps[e].map((l) => l.hex) as Ramp, [rules]);
  const outfit: Outfit = useMemo(
    () => ({ robe: ramp(detail.outfit.primary.element), sash: ramp(detail.outfit.accent.element) }),
    [detail, ramp],
  );

  // ── 角色与几何 ──
  const character = useMemo(() => getCharacter(settings.character), [settings.character]);
  const sprite = character.data;
  /** 书写物本身变成卡片（幡收起、告示原地展开）；否则书写物不动，卡片从人物下方展开（扇面、木牌） */
  const unrollWriting = character.unroll !== "body";
  const scale = SIZE_SCALE[settings.size];
  const cell = Math.max(1, Math.round(scale * (window.devicePixelRatio || 1))) / (window.devicePixelRatio || 1);
  const spriteW = sprite.width * cell;
  const spriteH = sprite.height * cell;

  // ── 状态 ──
  const [scrollState, setScrollState] = useState<ScrollState>("closed");
  const [monthOpen, setMonthOpen] = useState(false);
  const [detailDay, setDetailDay] = useState<Ymd | null>(null);
  // 卡片上点名句：打开今天的详情并跳到「物候与诗」
  const [detailFocus, setDetailFocus] = useState<{ id: SectionId; seq: number } | null>(null);
  const [scrollSize, setScrollSize] = useState<{ w: number; h: number } | null>(null);
  const [detailSize, setDetailSize] = useState<{ w: number; h: number } | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [jump, setJump] = useState(0);
  const [sway, setSway] = useState(0);
  const [bubble, setBubbleText] = useState<string | null>(null);
  const [translation, setTranslationText] = useState<string | null>(null);
  const expanded = scrollState !== "closed";

  const bubbleCtl = useMemo(() => createBubble(setBubbleText), []);
  // 「有新版了」气泡的文字：气泡显示的正好是它时，气泡可以点、点了打开更新窗口
  const [updateText, setUpdateText] = useState<string | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleIsUpdate = bubble !== null && bubble === updateText;
  const translationCtl = useMemo(() => createBubble(setTranslationText), []);
  useEffect(() => () => (bubbleCtl.dispose(), translationCtl.dispose()), [bubbleCtl, translationCtl]);

  // ── 我的生肖：今天和我的关系（没设置时为 null） ──
  const personal = useMemo(() => {
    if (settings.myZodiac === "none") return null;
    return {
      relation: personalRelation(detail.pillar.branch, settings.myZodiac),
      animal: ZODIAC[settings.myZodiac as Branch],
    };
  }, [settings.myZodiac, detail]);

  // ── 幡上的字 ──
  const bannerItems = useMemo<BannerItem[]>(() => {
    const rel = zodiacRelations(detail.pillar.branch);
    return buildBannerItems(
      {
        yi: detail.yi,
        ji: detail.ji,
        // 两个大吉色平等，相在前（幡上写「宜红宜绿」）
        luckyColors: [
          rules.colorFamilies[detail.outfit.phases.xiang].char,
          rules.colorFamilies[detail.outfit.phases.wang].char,
        ],
        luckyAnimals: [rel.sixHarmony.animal, ...rel.threeHarmony.map((r) => r.animal)],
        specialText: specialBannerText(almanac.special, branding.special),
        personal: personal?.relation ?? null,
      },
      { ...branding, bannerText: settings.bannerText },
    );
  }, [detail, almanac, settings.bannerText, rules, personal]);
  const [bannerIndex, setBannerIndex] = useState(0);
  // 停 8 秒没操作回到第一项
  useEffect(() => {
    if (bannerIndex === 0) return;
    const timer = setTimeout(() => setBannerIndex(0), BANNER_RESET_MS);
    return () => clearTimeout(timer);
  }, [bannerIndex]);
  useEffect(() => setBannerIndex(0), [today]);

  const bannerTranslation = useCallback(
    (item: BannerItem): string => {
      const en = (cat: Parameters<typeof translate>[0], zh: string) => translate(cat, zh, lang);
      switch (item.kind) {
        case "brand":
          return t("bannerTranslation.brand");
        case "special":
          return t("bannerTranslation.special", { text: en(almanac.special?.kind === "festival" ? "festival" : almanac.special?.kind === "jieqi" ? "jieqi" : "special", item.terms[0] ?? item.text) });
        case "yi":
          return item.terms[0] ? t("bannerTranslation.yi", { term: en("yiji", item.terms[0]) }) : t("bannerTranslation.noYi");
        case "ji":
          return item.terms[0] ? t("bannerTranslation.ji", { term: en("yiji", item.terms[0]) }) : t("bannerTranslation.noJi");
        case "colors":
          return t("bannerTranslation.colors", { first: en("color", item.terms[0]).toLowerCase(), second: en("color", item.terms[1]).toLowerCase() });
        case "personal":
          return item.terms[0] === "clash" ? t("bannerTranslation.clashYou") : t("bannerTranslation.withYou");
        case "zodiac":
          return t("bannerTranslation.zodiac", { animals: item.terms.map((a) => en("zodiac", a)).join(", ") });
      }
    },
    [lang, t, almanac],
  );

  // ── 纪念日 ──
  const { list: anniversaries, loaded: annivLoaded } = useAnniversaries();
  const todayAnniversary = useMemo(() => {
    const list = todays(anniversaries, today);
    return list.length ? list.map((a) => anniversaryTitle(a, t)).join(lang === "en" ? " & " : "、") : null;
  }, [anniversaries, today, t, lang]);
  const countdownText = useMemo(() => {
    const c = nextCountdown(today, anniversaries);
    if (!c) return null;
    const name =
      c.kind === "anniversary"
        ? anniversaryTitle(c.anniversary, t)
        : lang === "en"
          ? translate(c.kind, c.name, lang)
          : term(c.kind, c.name, lang);
    return c.daysLeft === 1 ? t("card.countdownTomorrow", { name }) : t("card.countdown", { name, n: c.daysLeft });
  }, [today, anniversaries, t, lang]);

  // 系统通知：当天一次、提前 N 天一次；提醒过的记在 store 里，不重复
  useEffect(() => {
    if (!loaded || !settings.annivNotify || anniversaries.length === 0) return;
    const due = dueReminders(anniversaries, today, settings.annivNotifyDays);
    if (due.length === 0) return;
    void (async () => {
      const sent = new Set((await getState<string[]>("annivNotified")) ?? []);
      let changed = false;
      for (const r of due) {
        if (sent.has(r.key)) continue;
        const title = anniversaryTitle(r.anniversary, t);
        const body =
          r.daysLeft === 0
            ? t("anniv.notifyToday", { title })
            : r.daysLeft === 1
              ? t("anniv.notifyTomorrow", { title })
              : t("anniv.notifyAhead", { title, n: r.daysLeft, date: fmtDate(r.date, lang, t) });
        if (await notify(t("app.name"), body)) {
          sent.add(r.key);
          changed = true;
        }
      }
      // 只留最近的 200 条
      if (changed) void setState("annivNotified", [...sent].slice(-200));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, today, anniversaries, settings.annivNotify, settings.annivNotifyDays]);

  // ── 开场白：按当前角色的口吻 ──
  const openingText = useMemo(() => {
    const o = openingFor(almanac, personal, todayAnniversary);
    if (o.key === "anniversary") return voiceLine(character, lang, "anniversary", { name: o.name });
    const cat = o.key === "festival" ? "festival" : "jieqi";
    const name = o.name ? (lang === "en" ? translate(cat, o.name, lang) : term(cat, o.name, lang)) : undefined;
    return voiceLine(character, lang, o.key, { name, animal: o.animal ? translate("zodiac", o.animal, lang) : undefined });
  }, [almanac, lang, personal, todayAnniversary, character]);

  const sayOpening = useCallback(() => {
    bubbleCtl.show(openingText, settings.bubbleSeconds);
  }, [bubbleCtl, openingText, settings.bubbleSeconds]);

  // 每天第一次显示（含跨过午夜、睡眠唤醒后进入新的一天）说一次
  useEffect(() => {
    if (!loaded || !annivLoaded || !layout || !settings.openingEnabled) return;
    const key = ymdKey(today);
    void getState<string>("lastOpening").then((last) => {
      if (last === key) return;
      sayOpening();
      void setState("lastOpening", key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, annivLoaded, !!layout, today, settings.openingEnabled]);

  // ── 展开 / 收起 ──
  const collapse = useCallback(() => {
    setDetailDay(null);
    setMonthOpen(false);
    setScrollState((s) => (s === "open" ? "closing" : s));
  }, []);
  const expand = useCallback(() => setScrollState((s) => (s === "closed" ? "open" : s)), []);
  const toggleCalendar = useCallback(() => (expanded ? collapse() : expand()), [expanded, collapse, expand]);
  const onScrollClosed = useCallback(() => {
    setScrollState("closed");
    setScrollSize(null);
  }, []);

  const onClickPart = (part: "banner" | "body") => {
    if (part === "body") {
      setJump((n) => n + 1);
      toggleCalendar();
      return;
    }
    // 展开期间幡（告示）变成了卷轴，点它换字暂停；扇面、木牌不动，照常换字
    if (expanded && unrollWriting) return;
    setSway((n) => n + 1);
    const next = nextBannerIndex(bannerIndex, bannerItems.length);
    setBannerIndex(next);
    if (lang === "en") {
      const text = bannerTranslation(bannerItems[next]);
      if (text) translationCtl.show(text, Math.min(settings.bubbleSeconds, 5));
      else translationCtl.hide();
    }
  };

  // ── 小和尚敲木鱼：木鱼出现几秒，期间点木鱼可以连续敲，每敲一下功德 +1 ──
  const [muyuVisible, setMuyuVisible] = useState(false);
  const [muyuStrike, setMuyuStrike] = useState(0);
  const [meritFloats, setMeritFloats] = useState<number[]>([]);
  const muyuTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showMuyu = useCallback(() => {
    setMuyuVisible(true);
    clearTimeout(muyuTimer.current);
    muyuTimer.current = setTimeout(() => setMuyuVisible(false), MUYU_SECONDS * 1000);
  }, []);
  const knock = useCallback(() => {
    showMuyu();
    setMuyuStrike((n) => n + 1);
    // 木槌落下那一刻响（Rust 那边延后 110ms 播放）
    if (settings.muyuSound) playWoodBlock(0.11);
    // 木槌落到木鱼上时飘字
    setTimeout(() => {
      const id = Date.now() + Math.random();
      setMeritFloats((list) => [...list, id]);
      setTimeout(() => setMeritFloats((list) => list.filter((x) => x !== id)), 1200);
    }, 110);
    void knockMerit();
  }, [showMuyu, settings.muyuSound]);
  useEffect(() => () => clearTimeout(muyuTimer.current), []);
  // 换了角色就收起木鱼
  useEffect(() => setMuyuVisible(false), [character]);

  // ── 右键菜单与托盘 ──
  const menuModel: MenuModel = useMemo(
    () => ({
      labels: {
        divine: voiceLine(character, lang, "divine"),
        lots: t("menu.lots"),
        gua: t("menu.gua"),
        detail: t("menu.detail"),
        toggleCalendar: expanded ? t("menu.collapse") : t("menu.expand"),
        zeri: t("menu.zeri"),
        anniversaries: t("menu.anniversaries"),
        share: t("menu.share"),
        size: t("menu.size"),
        sizes: { small: t("menu.sizeSmall"), medium: t("menu.sizeMedium"), large: t("menu.sizeLarge") },
        onTop: t("menu.onTop"),
        settings: t("menu.settings"),
        about: t("menu.about"),
        quit: t("menu.quit"),
        tooltip: t("app.name"),
      },
      size: settings.size,
      onTop: settings.onTop,
      actions: {
        divine: () => {
          setJump((n) => n + 1);
          if (!character.muyu) {
            sayOpening();
            return;
          }
          // 敲木鱼：木鱼出现，木槌敲一下，飘「功德 +1」，然后照常说开场白
          showMuyu();
          setTimeout(knock, 250);
          setTimeout(sayOpening, 900);
        },
        lots: () => {
          // 今天已经求过：道士先说一句，再打开签纸
          void todaysLot(today).then((rec) => {
            if (rec) bubbleCtl.show(t("lots.already"), settings.bubbleSeconds);
            openView("lots", t("lots.title"));
          });
        },
        gua: () => openView("gua", t("gua.title")),
        detail: () => setDetailDay(today),
        toggleCalendar,
        zeri: () => openView("zeri", t("zeri.title")),
        anniversaries: () => openView("anniversaries", t("anniv.title")),
        share: () => openView("share", t("share.title")),
        setSize: (size) => void update((s) => ({ ...s, size })),
        toggleOnTop: () => void update((s) => ({ ...s, onTop: !s.onTop })),
        settings: () => openView("settings", t("settings.title")),
        about: () => openView("about", t("about.title")),
        quit: quitApp,
      },
    }),
    [t, lang, character, showMuyu, knock, expanded, settings.size, settings.onTop, settings.bubbleSeconds, sayOpening, today, toggleCalendar, update, bubbleCtl],
  );
  const menuRef = useRef(menuModel);
  menuRef.current = menuModel;
  useEffect(() => {
    if (loaded) void syncTray(menuModel);
  }, [loaded, menuModel]);
  const onContextMenu = useCallback(() => void popupContextMenu(menuRef.current), []);

  // 开发版（浏览器预览）里没有原生菜单：用事件触发菜单项，方便调界面
  //   window.dispatchEvent(new CustomEvent("aobanxian:menu", { detail: "divine" }))
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onMenu = (e: Event) => {
      const action = (e as CustomEvent<string>).detail as keyof MenuModel["actions"];
      const f = menuRef.current.actions[action];
      if (typeof f === "function") (f as () => void)();
    };
    window.addEventListener("aobanxian:menu", onMenu);
    return () => window.removeEventListener("aobanxian:menu", onMenu);
  }, []);

  // 开发版自测：VITE_TEST_KNOCK=1 npm run tauri dev，启动 3 秒后自动执行一次菜单第一项（小和尚就是敲木鱼），
  // 不用点鼠标就能检查「菜单 → 敲木鱼 → 系统音频」整条路
  useEffect(() => {
    if (!import.meta.env.DEV || !import.meta.env.VITE_TEST_KNOCK || !loaded) return;
    const timer = setTimeout(() => menuRef.current.actions.divine(), 3000);
    return () => clearTimeout(timer);
  }, [loaded]);

  // 自动检查更新：每天第一次启动（或跨天）检查一次，只访问 GitHub；有新版时角色按自己的口吻冒气泡
  useEffect(() => {
    if (!loaded || !settings.autoUpdate) return;
    const key = ymdKey(today);
    let cancelled = false;
    void (async () => {
      if ((await getState<string>("updateCheckedOn")) === key) return;
      await setState("updateCheckedOn", key);
      try {
        const u = await checkForUpdate();
        if (!u || cancelled) return;
        // 本机验证自动更新用（只在构建时设了 VITE_TEST_UPDATE 的测试包里生效）：不等点击，直接安装
        if (import.meta.env.VITE_TEST_UPDATE) {
          await installUpdate(() => {});
          return;
        }
        const text = voiceLine(character, lang, "update", { version: u.version });
        setUpdateText(text);
        bubbleCtl.show(text, Math.max(settings.bubbleSeconds, 20));
      } catch {
        // 没网或 GitHub 访问不了：明天再试，不打扰
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, settings.autoUpdate, today.year, today.month, today.day]);

  // 开发版截图：VITE_TEST_SHOT=card npm run tauri dev 启动后展开卷轴（看卡片底部的名句）；
  // VITE_TEST_SHOT=windows 打开每日一卦和分享今日窗口；
  // VITE_TEST_SHOT=detail 再打开今天的详情，把四个折叠栏都展开，每 4 秒跳到下一栏（穿衣 → … → 更多），
  // 外面用 screencapture -l <窗口号> 按时截图，不用点鼠标
  useEffect(() => {
    const shot = import.meta.env.DEV ? (import.meta.env.VITE_TEST_SHOT as string | undefined) : undefined;
    if (!shot || !loaded) return;
    const timers: number[] = [];
    if (shot === "windows") {
      // 打开每日一卦、分享今日两个窗口
      timers.push(window.setTimeout(() => menuRef.current.actions.gua(), 1500));
      timers.push(window.setTimeout(() => menuRef.current.actions.share(), 3000));
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
    timers.push(window.setTimeout(expand, 1500));
    if (shot === "detail") {
      try {
        localStorage.setItem("aobanxian.detail.open", JSON.stringify({ hours: true, positions: true, nature: true, more: true }));
      } catch {
        // 开发用，存不了就算了
      }
      timers.push(window.setTimeout(() => setDetailDay(today), 3000));
      SECTIONS.forEach((id, i) => timers.push(window.setTimeout(() => setDetailFocus({ id, seq: i + 1 }), 5000 + i * 4000)));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // 择日、纪念日窗口里点某一天：在主窗口打开那天的详情
  useEffect(() => onOpenDetailRequest((ymd) => setDetailDay(ymd)), []);
  // 求签等窗口请道士说话
  const sayRef = useRef<(key: string) => void>(() => {});
  sayRef.current = (key: string) => {
    setJump((n) => n + 1);
    bubbleCtl.show(t(key), settings.bubbleSeconds);
  };
  useEffect(() => onSayRequest((key) => sayRef.current(key)), []);

  // 正式版里关掉 WebView 默认的右键菜单
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const block = (e: Event) => e.preventDefault();
    window.addEventListener("contextmenu", block);
    return () => window.removeEventListener("contextmenu", block);
  }, []);

  // ── 键盘与失焦 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailDay) setDetailDay(null);
      else if (expanded) collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailDay, expanded, collapse]);

  useEffect(() => {
    if (!settings.collapseOnBlur) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onBlur = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // 右键菜单打开时窗口也会失焦，这时不收起（菜单里还有「收起日历」）
        if (!document.hasFocus() && !isContextMenuOpen()) collapse();
      }, BLUR_DELAY);
    };
    window.addEventListener("blur", onBlur);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("blur", onBlur);
    };
  }, [settings.collapseOnBlur, collapse]);

  // ── 换角色：脚底中点不动，换完站在原地 ──
  const prevSprite = useRef(sprite);
  useEffect(() => {
    const prev = prevSprite.current;
    prevSprite.current = sprite;
    if (prev === sprite) return;
    setAnchor((a) => {
      if (!a) return a;
      const next = anchorAfterSwitch(a, prev, sprite, cell);
      void setState("anchor", next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprite]);

  // ── 道士位置：读取 / 拖动后保存 ──
  useEffect(() => {
    void (async () => {
      const saved = await getState<{ x: number; y: number }>("anchor");
      const probe = saved ?? { x: 0, y: 0 };
      const work = await workAreaAt(probe.x + 1, probe.y + 1);
      const fallback = { x: work.x + work.w - spriteW - 160, y: work.y + work.h - spriteH - 40 };
      const a = saved ?? fallback;
      // 屏幕布局变了（比如拔掉外接屏）时把道士拉回屏幕内
      const x = Math.min(Math.max(a.x, work.x), work.x + work.w - spriteW);
      const y = Math.min(Math.max(a.y, work.y), work.y + work.h - spriteH);
      setAnchor({ x, y });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applying = useRef(false);
  const layoutRef = useRef<Layout | null>(null);
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const off = onWindowMoved(() => {
      if (applying.current || !layoutRef.current) return;
      void windowPosition().then((pos) => {
        const l = layoutRef.current;
        if (!pos || !l || applying.current) return;
        const next = { x: pos.x + l.sprite.x, y: pos.y + l.sprite.y };
        setAnchor(next);
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => void setState("anchor", next), 500);
      });
    });
    return () => {
      clearTimeout(saveTimer);
      off();
    };
  }, []);

  // ── 布局：道士不动，窗口围绕它伸缩 ──
  const shown = useRef(false);
  useEffect(() => {
    if (!anchor || !loaded) return;
    let cancelled = false;
    void (async () => {
      const work = await workAreaAt(anchor.x + spriteW / 2, anchor.y + spriteH / 2);
      // 换了尺寸或屏幕后道士可能跑出屏幕，先拉回来（之后道士就不动了）
      const clamped = {
        x: Math.round(Math.min(Math.max(anchor.x, work.x), work.x + work.w - spriteW)),
        y: Math.round(Math.min(Math.max(anchor.y, work.y), work.y + work.h - spriteH)),
      };
      if (clamped.x !== anchor.x || clamped.y !== anchor.y) {
        setAnchor(clamped);
        void setState("anchor", clamped);
        return;
      }
      const spriteRect = { x: anchor.x, y: anchor.y, w: spriteW, h: spriteH };
      // 卡片水平中心：从书写物展开时对着书写物，否则对着人
      const bannerCenterX = anchor.x + (unrollWriting ? sprite.banner.x + sprite.banner.w / 2 : sprite.width / 2) * cell;
      const place = (size: { w: number; h: number }) =>
        placePanel({ work, sprite: spriteRect, bannerCenterX, panel: size, gap: GAP, margin: SCREEN_MARGIN });
      const writingRect = {
        x: anchor.x + sprite.banner.x * cell,
        y: anchor.y + sprite.banner.y * cell,
        w: sprite.banner.w * cell,
        h: sprite.banner.h * cell,
      };
      const scroll =
        expanded && scrollSize
          ? character.unroll === "inPlace"
            ? placeOverWriting({ work, writing: writingRect, panel: scrollSize, margin: SCREEN_MARGIN })
            : place(scrollSize)
          : null;
      const det = detailDay && detailSize ? place(detailSize) : null;
      const panels = [scroll?.rect, det?.rect]
        .filter((r): r is Rect => !!r)
        .map((r) => ({ x: r.x - SHADOW, y: r.y - SHADOW, w: r.w + SHADOW * 2, h: r.h + SHADOW * 2 }));
      const win = windowRect(spriteRect, CHROME, panels.length ? panels.reduce(union) : undefined);
      const rounded = { x: Math.round(win.x), y: Math.round(win.y), w: Math.ceil(win.w), h: Math.ceil(win.h) };
      if (cancelled) return;
      const next: Layout = {
        win: rounded,
        sprite: toLocal(spriteRect, rounded),
        scroll: scroll ? { ...toLocal(scroll.rect, rounded), direction: scroll.direction } : null,
        detail: det ? toLocal(det.rect, rounded) : null,
      };
      const prev = layoutRef.current;
      const winChanged = !prev || (["x", "y", "w", "h"] as const).some((k) => prev.win[k] !== rounded[k]);
      applying.current = true;
      layoutRef.current = next;
      if (winChanged) await setWindowRect(rounded);
      if (cancelled) return;
      setLayout(next);
      // 窗口移动事件可能稍晚到，等一会儿再恢复「拖动后记位置」
      setTimeout(() => (applying.current = false), 120);
      if (!shown.current) {
        shown.current = true;
        await showWindow();
        if (settings.expandOnLaunch) expand();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, loaded, character, sprite, unrollWriting, spriteW, spriteH, cell, expanded, scrollSize, detailDay, detailSize]);

  // ── 点穿：告诉 Rust 哪里能点 ──
  useEffect(() => {
    if (!layout) return;
    const rows: string[] = [];
    const opaqueAt = (x: number, y: number) => isOpaque(sprite, x, y) && !(expanded && unrollWriting && inBanner(sprite, x, y));
    // 遮罩从道士上方一格开始，共 height + 1 行
    for (let y = 0; y <= sprite.height; y++) {
      let row = "";
      for (let x = 0; x < sprite.width; x++) {
        // 呼吸时会上下浮动一格，向下多算一格；再向四周多扩一格，
        // 让光标还没碰到道士时窗口就已经切回接收鼠标，第一下点击不会被漏掉
        let opaque = false;
        for (let dy = -2; dy <= 1 && !opaque; dy++) {
          for (let dx = -1; dx <= 1 && !opaque; dx++) opaque = opaqueAt(x + dx, y + dy);
        }
        row += opaque ? "1" : "0";
      }
      rows.push(row);
    }
    const mask: HitMask = { x: layout.sprite.x, y: layout.sprite.y - cell, cell, rows };
    const rects: [number, number, number, number][] = [];
    if (layout.scroll && scrollSize) rects.push([layout.scroll.x, layout.scroll.y, scrollSize.w, scrollSize.h]);
    if (layout.detail && detailSize) rects.push([layout.detail.x, layout.detail.y, detailSize.w, detailSize.h]);
    if (muyuVisible) {
      const m = muyuRect(layout.sprite, sprite.height, cell);
      rects.push([m.x, m.y, m.w, m.h]);
    }
    // 「有新版了」气泡可以点：它的范围也要接收鼠标（气泡弹出有 160ms 的缩放动画，动画结束后再量一次）
    const apply = () => {
      const b = bubbleIsUpdate ? bubbleRef.current?.getBoundingClientRect() : null;
      setHitRegions({ rects: b ? [...rects, [b.x, b.y, b.width, b.height]] : rects, masks: [mask] });
    };
    apply();
    if (!bubbleIsUpdate) return;
    const timer = window.setTimeout(apply, 250);
    return () => window.clearTimeout(timer);
  }, [layout, sprite, unrollWriting, expanded, cell, scrollSize, detailSize, muyuVisible, bubbleIsUpdate]);

  const onScrollResize = useCallback((w: number, h: number) => setScrollSize({ w, h }), []);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = detailRef.current;
    if (!detailDay || !el) {
      setDetailSize(null);
      return;
    }
    const ro = new ResizeObserver(() => setDetailSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [detailDay]);

  if (!layout) return <main className="stage" />;


  // ── 气泡位置：头顶，向左长 ──
  const headX = layout.sprite.x + sprite.width * 0.3 * cell;
  const headTop = layout.sprite.y + sprite.headTop * cell;
  const bannerRight = layout.sprite.x + (sprite.banner.x + sprite.banner.w) * cell;
  const faceTop = layout.sprite.y + sprite.bannerFace.y * cell;
  const showSparkles = settings.effectsEnabled && almanac.sparkle;

  const stageStyle = { width: layout.win.w, height: layout.win.h } as CSSProperties;

  return (
    <main className="stage" style={stageStyle} onPointerDownCapture={focusWindow}>
      {showSparkles && (
        <Sparkles x={layout.sprite.x - 14} y={layout.sprite.y - 14} w={spriteW + 28} h={spriteH + 28} cell={cell} />
      )}

      <div className="stage__sprite" style={{ left: layout.sprite.x, top: layout.sprite.y }}>
        <Daoshi
          data={sprite}
          outfit={outfit}
          scale={scale}
          bannerText={bannerItems[bannerIndex]?.text ?? settings.bannerText}
          bannerFont={settings.bannerFont}
          hideBanner={expanded && unrollWriting}
          breathing={!expanded}
          jumpSignal={jump}
          swaySignal={sway}
          onClickPart={onClickPart}
          onContextMenu={onContextMenu}
        />
      </div>

      {expanded && (
        <div onContextMenu={(e) => (e.preventDefault(), onContextMenu())}>
          <Scroll
            x={layout.scroll ? layout.scroll.x : null}
            y={layout.scroll ? layout.scroll.y : null}
            direction={layout.scroll?.direction ?? "down"}
            fromWidth={(unrollWriting ? sprite.banner.w : sprite.width * 0.5) * cell}
            fromCenterX={
              layout.scroll
                ? layout.sprite.x + (unrollWriting ? sprite.banner.x + sprite.banner.w / 2 : sprite.width / 2) * cell - layout.scroll.x
                : 0
            }
            cell={cell}
            closing={scrollState === "closing"}
            onClosed={onScrollClosed}
            onResize={onScrollResize}
          >
            <TodayCard
              detail={detail}
              rules={rules}
              personal={personal?.relation ?? null}
              countdown={countdownText}
              monthOpen={monthOpen}
              onOpenDetail={() => setDetailDay(today)}
              onToggleMonth={() => setMonthOpen((v) => !v)}
              famous={todayFamous}
              onOpenPoem={() => {
                setDetailDay(today);
                setDetailFocus((f) => ({ id: "nature", seq: (f?.seq ?? 0) + 1 }));
              }}
            />
            {monthOpen && <MonthView today={today} anniversaries={anniversaries} onPick={setDetailDay} />}
          </Scroll>
        </div>
      )}

      {detailDay && (
        <div
          ref={detailRef}
          className="stage__detail"
          style={{ left: layout.detail?.x ?? 0, top: layout.detail?.y ?? 0, visibility: layout.detail ? "visible" : "hidden" }}
          onContextMenu={(e) => (e.preventDefault(), onContextMenu())}
        >
          <DetailPanel
            ymd={detailDay}
            rules={rules}
            myZodiac={settings.myZodiac}
            anniversaries={anniversaries}
            onChange={setDetailDay}
            onClose={() => setDetailDay(null)}
            focus={detailFocus}
          />
        </div>
      )}

      {bubble && (
        <Bubble
          text={bubble}
          x={headX}
          y={headTop - 4}
          side="above-left"
          maxWidth={220}
          ref={bubbleRef}
          onClick={
            bubbleIsUpdate
              ? () => {
                  bubbleCtl.hide();
                  openView("update", t("update.title"));
                }
              : undefined
          }
        />
      )}
      {translation && <Bubble text={translation} x={bannerRight + 4} y={faceTop + 8} side="right" maxWidth={160} small />}

      {muyuVisible && (() => {
        const m = muyuRect(layout.sprite, sprite.height, cell);
        return <Muyu x={m.x} y={m.y + 9 * cell} cell={cell} strike={muyuStrike} onKnock={knock} />;
      })()}
      {meritFloats.map((id) => (
        <span key={id} className="merit-float" style={{ left: layout.sprite.x + sprite.width * 0.45 * cell, top: headTop - 22 }}>
          {t("muyu.merit")}
        </span>
      ))}
    </main>
  );
}
