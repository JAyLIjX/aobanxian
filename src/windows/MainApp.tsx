import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import branding from "../../config/branding.json";
import { getDayDetail } from "../calendar/day";
import { getAlmanac } from "../calendar/special";
import { DetailPanel } from "../components/DetailPanel";
import { MonthView } from "../components/MonthView";
import { Bubble } from "../components/Bubble";
import { Scroll } from "../components/Scroll";
import { Sparkles } from "../components/Sparkles";
import { TodayCard } from "../components/TodayCard";
import { BANNER_RESET_MS, buildBannerItems, nextBannerIndex, type BannerItem } from "../core/banner";
import { createBubble } from "../core/bubble";
import { ymdKey, type Ymd } from "../core/dayBoundary";
import type { Element } from "../core/elements";
import { placePanel, toLocal, union, windowRect, type Chrome, type Rect } from "../core/layout";
import { openingFor, specialBannerText } from "../core/opening";
import { zodiacRelations } from "../core/zodiac";
import { setLanguage, type Lang } from "../i18n";
import { term, translate } from "../i18n/terms";
import { useToday } from "../hooks/useToday";
import { popupContextMenu, syncTray, type MenuModel } from "../platform/menu";
import {
  focusWindow,
  inTauri,
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
import { getState, setState } from "../settings/store";
import { useSettings } from "../settings/useSettings";
import { Daoshi } from "../sprite/Daoshi";
import { inBanner, isOpaque, sprite, type Outfit, type Ramp } from "../sprite/sprite";

/** 道士四周留给气泡、闪光、翻译小气泡的空白（逻辑像素） */
const CHROME: Chrome = { top: 48, left: 130, right: 170, bottom: 12 };
/** 卷轴 / 详情和道士之间的空隙，离屏幕边缘至少留的距离 */
const GAP = 6;
const SCREEN_MARGIN = 8;
/** 卷轴 / 详情的阴影留边 */
const SHADOW = 10;
/** 失焦后等一会儿再判断，避开原生下拉框、菜单等短暂失焦 */
const BLUR_DELAY = 150;

type ScrollState = "closed" | "open" | "closing";

interface Layout {
  win: Rect;
  sprite: Rect;
  scroll: (Rect & { direction: "down" | "up" }) | null;
  detail: Rect | null;
}

function openWindow(label: "settings" | "about", title: string, size: { width: number; height: number }) {
  if (!inTauri) return;
  void (async () => {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    new WebviewWindow(label, { url: `index.html?view=${label}`, title, ...size, center: true, focus: true, resizable: label === "settings" });
  })();
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
  const almanac = useMemo(() => getAlmanac(today), [today]);
  const ramp = useCallback((e: Element) => rules.pixelRamps[e].map((l) => l.hex) as Ramp, [rules]);
  const outfit: Outfit = useMemo(
    () => ({ robe: ramp(detail.outfit.primary.element), sash: ramp(detail.outfit.accent.element) }),
    [detail, ramp],
  );

  // ── 几何 ──
  const scale = SIZE_SCALE[settings.size];
  const cell = Math.max(1, Math.round(scale * (window.devicePixelRatio || 1))) / (window.devicePixelRatio || 1);
  const spriteW = sprite.width * cell;
  const spriteH = sprite.height * cell;

  // ── 状态 ──
  const [scrollState, setScrollState] = useState<ScrollState>("closed");
  const [monthOpen, setMonthOpen] = useState(false);
  const [detailDay, setDetailDay] = useState<Ymd | null>(null);
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
  const translationCtl = useMemo(() => createBubble(setTranslationText), []);
  useEffect(() => () => (bubbleCtl.dispose(), translationCtl.dispose()), [bubbleCtl, translationCtl]);

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
      },
      { ...branding, bannerText: settings.bannerText },
    );
  }, [detail, almanac, settings.bannerText, rules]);
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
        case "zodiac":
          return t("bannerTranslation.zodiac", { animals: item.terms.map((a) => en("zodiac", a)).join(", ") });
      }
    },
    [lang, t, almanac],
  );

  // ── 开场白 ──
  const openingText = useMemo(() => {
    const o = openingFor(almanac);
    const name = o.name ? term(o.key === "festival" ? "festival" : "jieqi", o.name, lang) : undefined;
    return t(`opening.${o.key}`, { name: lang === "en" && name ? translate(o.key === "festival" ? "festival" : "jieqi", o.name!, lang) : name });
  }, [almanac, lang, t]);

  const sayOpening = useCallback(() => {
    bubbleCtl.show(openingText, settings.bubbleSeconds);
  }, [bubbleCtl, openingText, settings.bubbleSeconds]);

  // 每天第一次显示（含跨过午夜、睡眠唤醒后进入新的一天）说一次
  useEffect(() => {
    if (!loaded || !layout || !settings.openingEnabled) return;
    const key = ymdKey(today);
    void getState<string>("lastOpening").then((last) => {
      if (last === key) return;
      sayOpening();
      void setState("lastOpening", key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, !!layout, today, settings.openingEnabled]);

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
    // 展开期间幡变成了卷轴，点幡换字暂停
    if (expanded) return;
    setSway((n) => n + 1);
    const next = nextBannerIndex(bannerIndex, bannerItems.length);
    setBannerIndex(next);
    if (lang === "en") {
      const text = bannerTranslation(bannerItems[next]);
      if (text) translationCtl.show(text, Math.min(settings.bubbleSeconds, 5));
      else translationCtl.hide();
    }
  };

  // ── 右键菜单与托盘 ──
  const menuModel: MenuModel = useMemo(
    () => ({
      labels: {
        divine: t("menu.divine"),
        detail: t("menu.detail"),
        toggleCalendar: expanded ? t("menu.collapse") : t("menu.expand"),
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
          sayOpening();
        },
        detail: () => setDetailDay(today),
        toggleCalendar,
        setSize: (size) => void update((s) => ({ ...s, size })),
        toggleOnTop: () => void update((s) => ({ ...s, onTop: !s.onTop })),
        settings: () => openWindow("settings", t("settings.title"), { width: 560, height: 560 }),
        about: () => openWindow("about", t("about.title"), { width: 420, height: 440 }),
        quit: quitApp,
      },
    }),
    [t, expanded, settings.size, settings.onTop, sayOpening, today, toggleCalendar, update],
  );
  const menuRef = useRef(menuModel);
  menuRef.current = menuModel;
  useEffect(() => {
    if (loaded) void syncTray(menuModel);
  }, [loaded, menuModel]);
  const onContextMenu = useCallback(() => void popupContextMenu(menuRef.current), []);

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
        if (!document.hasFocus()) collapse();
      }, BLUR_DELAY);
    };
    window.addEventListener("blur", onBlur);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("blur", onBlur);
    };
  }, [settings.collapseOnBlur, collapse]);

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
      const bannerCenterX = anchor.x + (sprite.banner.x + sprite.banner.w / 2) * cell;
      const place = (size: { w: number; h: number }) =>
        placePanel({ work, sprite: spriteRect, bannerCenterX, panel: size, gap: GAP, margin: SCREEN_MARGIN });
      const scroll = expanded && scrollSize ? place(scrollSize) : null;
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
  }, [anchor, loaded, spriteW, spriteH, cell, expanded, scrollSize, detailDay, detailSize]);

  // ── 点穿：告诉 Rust 哪里能点 ──
  useEffect(() => {
    if (!layout) return;
    const rows: string[] = [];
    const opaqueAt = (x: number, y: number) => isOpaque(sprite, x, y) && !(expanded && inBanner(sprite, x, y));
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
    setHitRegions({ rects, masks: [mask] });
  }, [layout, expanded, cell, scrollSize, detailSize]);

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
          outfit={outfit}
          scale={scale}
          bannerText={bannerItems[bannerIndex]?.text ?? settings.bannerText}
          bannerFont={settings.bannerFont}
          hideBanner={expanded}
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
            fromWidth={sprite.banner.w * cell}
            fromCenterX={layout.scroll ? layout.sprite.x + (sprite.banner.x + sprite.banner.w / 2) * cell - layout.scroll.x : 0}
            cell={cell}
            closing={scrollState === "closing"}
            onClosed={onScrollClosed}
            onResize={onScrollResize}
          >
            <TodayCard
              detail={detail}
              rules={rules}
              monthOpen={monthOpen}
              onOpenDetail={() => setDetailDay(today)}
              onToggleMonth={() => setMonthOpen((v) => !v)}
            />
            {monthOpen && <MonthView today={today} onPick={setDetailDay} />}
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
          <DetailPanel ymd={detailDay} rules={rules} onChange={setDetailDay} onClose={() => setDetailDay(null)} />
        </div>
      )}

      {bubble && <Bubble text={bubble} x={headX} y={headTop - 4} side="above-left" maxWidth={220} />}
      {translation && <Bubble text={translation} x={bannerRight + 4} y={faceTop + 8} side="right" maxWidth={160} small />}
    </main>
  );
}
