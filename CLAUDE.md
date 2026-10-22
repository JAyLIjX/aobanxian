# CLAUDE.md

五行小历：Tauri 2 + React + TypeScript 的桌面小组件，macOS 和 Windows 都要能跑。

## 常用命令

```bash
npm run tauri dev   # 开发版桌面窗口
npm test            # vitest：规则模块 + 历法数据
npm run typecheck   # tsc --noEmit
npm run day [YYYY-MM-DD]  # 终端打印某天的完整结果，用来和老黄历核对
npm run fonts       # 重新收集字表并给三套字体做子集（见「字体」）
```

## 架构

```
rules/default.json        规则配置（唯一的数据来源，改规则不改代码）
src/core/                 纯 TS，不依赖 React、Tauri 和 lunar-javascript
  elements.ts             五行生克；天干、地支、纳音 → 五行
  wuxing.ts               旺相休囚死分档、主色/点缀色、解释句、小贴士
  zodiac.ts               六合 / 三合 / 六冲对照表
  rules.ts                Rules 类型、parseRules 校验、defaultRules
  dayBoundary.ts          午夜 / 子时换日
src/calendar/day.ts       唯一调用 lunar-javascript 的地方，拼出 DayInfo / DayDetail
src/types/lunar-javascript.d.ts  lunar-javascript 用到部分的类型声明
src/figure/               小人。types.ts 定义 FigureProps，index.ts 决定用哪个实现
src/components/           HuangliSlip（黄历签）/ TodayCard / MonthView / DetailPanel / ColorChip（印泥色签）
src/hooks/useToday.ts     当前历日；定时器 + 轮询 + visibilitychange/focus 处理换日和睡眠唤醒
src/hooks/useDragOrClick.ts  同一元素既可点击又可拖动窗口（移动 > 4px 算拖动）
src/platform/window.ts    Tauri 窗口接口的封装（浏览器里调用是空操作）
src/config/appearance.ts  外观配置（config/appearance.json），目前只有大字字体 A / B
src/fonts.css             三套字体的 @font-face 和 --font-body / --font-display
src/assets/fonts/         子集化后的 woff2 和各自的 OFL 许可
scripts/fonts/            字体下载、字表收集、子集化脚本和字表 glyphs-*.txt
preview/                  效果截图（card-A / card-B / collapsed）
src-tauri/src/lib.rs      托盘菜单、置顶/置底切换、window-state、autostart
tests/                    vitest
```

依赖方向：`components → calendar → core`，`core` 不能反向依赖任何东西。

## 规则设计

- 当日五行 D 由 `elementSource` 决定：`nayin`（纳音末字）/ `stem`（日干）/ `branch`（日支）。
- `phasesOf(D)`：旺 = D，相 = D 所生，休 = 生 D 者，囚 = 克 D 者，死 = D 所克。
- 档位：旺、相 → 大吉；休 → 平；囚 → 慎穿；死 → 不宜。
- 主色（上衣）/ 点缀色（围巾）：`topPriority = xiang` 时为 相 / 旺，`wang` 时互换。颜色取该五行色系的第一个。
- 解释句是 `explanation[topPriority]` 模板，占位符见 README。
- 新流派加在 `rules/` 下的新 JSON；所有字段都要过 `parseRules`。

## 约定

- 历法数据一律从 lunar-javascript 取，不自己写历法算法。年干支用 `getYearInGanZhiByLiChun`（立春换年）。
- 六合 / 三合 / 六冲用 `core/zodiac.ts` 的表；冲煞的显示直接用 lunar-javascript 的 `getDayChong*` / `getDaySha`，测试保证两者一致。
- 界面文案是传统民俗趣味参考，**不出现「凶」字**。星宿吉凶走 `xiuLuckLabels`；`tests/calendar.test.ts` 会逐日扫描两年的 DayDetail。旺相休囚死的「死」「囚」也不直接显示在界面上（只在悬停提示里）。
- `calendar/day.ts` 里的 `HIDDEN_FESTIVALS` 过滤掉 lunar-javascript 里较冷门的公历节日。
- 不用只有单一平台才有的接口。唯一的平台分支是 macOS 用 `ActivationPolicy::Accessory` 隐藏 Dock 图标（Windows 由 `skipTaskbar` 处理），用 `#[cfg(target_os = "macos")]` 包住。
- 透明窗口在 macOS 需要 `macOSPrivateApi`（项目不上 App Store，可以接受）。

## 交互

| 操作 | 结果 |
| --- | --- |
| 点黄历签 | 展开 / 收起今日卡片 |
| 点卡片主体 | 打开当天详情 |
| 点卡片上的「月历」 | 展开 / 收起月历 |
| 点月历某一天 | 打开那天的详情 |
| 点小人 | 只轻跳一下（第二轮改成换幡上的字） |
| 按住小人或黄历签移动 > 4px | 拖动整个窗口 |
| Esc | 逐层收起：详情 → 月历 → 卡片 |
| 点桌面或其他窗口 | 全部收起 |

- 拖动与点击的区分在 `useDragOrClick`：按下只记位置，移动超过 4px 才调用 `startDragging()`（之后这次松开不会回到网页），没动就在 pointerup 时当点击。**不要**再用「mousedown 就 startDragging」或 `data-tauri-drag-region`：那样会吞掉点击，第一版点卡片没反应就是这个原因。
- 窗口开了 `acceptFirstMouse`，点击时**不会**自动成为焦点窗口，所以收不到 Esc、也不会失焦。`App` 在 `onPointerDownCapture` 里调用 `focusWindow()`（`setFocus`），之后才有 blur；blur 后等 150ms 且 `document.hasFocus()` 为假才收起，避开原生下拉框等短暂失焦。
- 没有用 `setIgnoreCursorEvents` 做透明点穿。窗口大小紧贴内容（见下），透明区域只剩四周 10px 留白和小人周围的空隙。以后如果加点穿，只能对透明像素生效，卡片、黄历签、弹窗都必须能收到点击。

## 窗口

- `tauri.conf.json`：无边框、透明、`alwaysOnBottom`、`skipTaskbar`、`acceptFirstMouse`。
- 窗口大小由前端按内容实测：`App` 用 ResizeObserver 量 `.content`（必须 `width: max-content`，否则宽度被当前窗口卡住，窗口永远长不大），加上四周留白后 `setSize`；打开详情时高度至少 612。小人和黄历签固定在左上，展开只向右、向下长。window-state 只记 `POSITION`。
- 托盘「置顶」与默认的置底互斥：`set_on_top` 先取消一个再设置另一个。
- 配置里的 `alwaysOnBottom` 在 macOS 上创建窗口时不生效（窗口层级仍是 0），所以 `setup` 里再调用一次 `set_on_top(false)`，之后层级为 -1。
- 位置保存：窗口 `Moved` 事件停止 500ms 后写盘（`MOVE_GENERATION` 去抖），托盘「退出」时也会再存一次。所以 Ctrl+C 或异常退出也不丢位置。

## 视觉

- 卡片只用三种基调：宣纸底 `--paper`、朱砂红 `--cinnabar`、墨色 `--ink`（层级用墨色的不同透明度 `--ink-2/3`、`--ink-wash`）。其他颜色只出现在色签 `ColorChip` 里。
- 纸纹是 `--paper-grain`：两层 SVG feTurbulence（细噪点 + 横向纤维），用在卡片、黄历签和色签上。
- 色签是带纸纹的小方块（印泥色签），不要用圆点。
- 色值取中国传统色，`rules/default.json` 里每个颜色的 `traditional` 是传统色名（悬停可见）；界面显示的仍是 `name`（绿、红……）。

## 字体

| 用途 | 字体 | 文件 |
| --- | --- | --- |
| 正文、小字 | 霞鹜文楷 LXGW WenKai | `LXGWWenKai-subset.woff2` |
| 大字 A 版 | 马善政毛笔楷书 Ma Shan Zheng | `MaShanZheng-subset.woff2` |
| 大字 B 版 | 志莽行书 Zhi Mang Xing | `ZhiMangXing-subset.woff2` |

- 大字 = 日期数字、农历标题、黄历签、详情标题，CSS 里用 `.display` 或 `var(--font-display)`。A / B 由 `config/appearance.json` 的 `displayFont` 切换；开发时也可以用地址参数 `?font=B` 临时覆盖。
- 三套都是 OFL 1.1，许可在 `src/assets/fonts/OFL-*.txt`。霞鹜文楷有保留字体名，但它的附加许可允许子集 / WOFF2 版本在不作为可安装字体分发时沿用原名，内嵌在应用里属于这种情况；另外两套没有保留字体名。
- 完整原版很大（文楷约 26MB），不进仓库。仓库里只放按字表做的子集（合计约 230KB）。

### 加字 / 重新子集化

字表由 `scripts/fonts/collect-glyphs.ts` 自动收集，来源是：
- ASCII 和常用中文标点
- `src/`、`rules/`、`config/` 里出现的所有字符（界面文案、小贴士、色名……）
- 1901–2099 年每一天的完整 DayDetail（农历、干支、节气、节日、宜忌、星宿……）

大字字表只收数字、`/`、「年月日农历星期天闰」和所有农历月日名、星期。

所以**改了界面文字、规则或新增流派 JSON 之后，运行一次 `npm run fonts` 即可**，脚本会：
1. 用 `scripts/fonts/fetch-fonts.sh` 下载原版到 `fonts-src/`（已存在则跳过，已在 .gitignore）
2. 建 `.venv-fonts` 并装 fonttools + brotli（首次）
3. 重新生成 `scripts/fonts/glyphs-body.txt` / `glyphs-display.txt`
4. 用 pyftsubset 输出 woff2 到 `src/assets/fonts/`，复制 OFL 许可
5. 打印每个字体缺哪些字。缺的字会回退到系统字体，需要时换字或者在大字里避免使用

如果要让大字显示新的字（比如在黄历签上加节气名），在 `collect-glyphs.ts` 里往 `display` 字表加对应文字再跑 `npm run fonts`。提交时 woff2 和 glyphs-*.txt 一起提交，方便在 diff 里看出字表变化。

## 换正式小人形象（下一轮）

目前是 `src/figure/PlaceholderFigure.tsx`：SVG 里 `#shirt` 和 `#scarf` 是两块独立形状，颜色由 props 传入。小人只负责「画」，点击和拖动在 `App` 里用 `useDragOrClick` 处理；想让它跳一下就把 `bounceSignal` 加一。

换正式图片时：
1. 新建一个满足 `FigureProps`（`primary`、`accent`、`bounceSignal`）的组件，比如 `ImageFigure.tsx`。
2. 推荐做法：一张底图 + 上衣、围巾各一张蒙版图（PNG alpha），用 CSS `mask-image` 叠一层 `background-color: primary/accent`（或 canvas 着色），这样任意颜色都能换。
3. 在 `src/figure/index.ts` 里把导出换成新组件，其他代码不用改。弹跳动画写在 `App.css` 的 `.figure__svg--bounce`，新组件可以沿用。
