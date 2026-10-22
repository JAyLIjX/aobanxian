# CLAUDE.md

五行小历：Tauri 2 + React + TypeScript 的桌面小组件，macOS 和 Windows 都要能跑。

## 常用命令

```bash
npm run tauri dev   # 开发版桌面窗口
npm test            # vitest：规则模块 + 历法数据
npm run typecheck   # tsc --noEmit
npm run day [YYYY-MM-DD]  # 终端打印某天的完整结果，用来和老黄历核对
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
src/components/           TodayCard / MonthView / DetailPanel
src/hooks/useToday.ts     当前历日；定时器 + 轮询 + visibilitychange/focus 处理换日和睡眠唤醒
src/platform/window.ts    Tauri 窗口接口的封装（浏览器里调用是空操作）
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

## 窗口

- `tauri.conf.json`：无边框、透明、`alwaysOnBottom`、`skipTaskbar`、`acceptFirstMouse`。
- 窗口大小由前端控制：收起 420×210，展开月历或打开详情时 420×600（`App.tsx` 里的常量）。所以 window-state 只记 `POSITION`。
- 拖动：`App.tsx` 在空白处 mousedown 时调用 `startDragging()`；按钮、下拉框和 `[data-no-drag]` 区域除外。
- 托盘「置顶」与默认的置底互斥：`set_on_top` 先取消一个再设置另一个。
- 配置里的 `alwaysOnBottom` 在 macOS 上创建窗口时不生效（窗口层级仍是 0），所以 `setup` 里再调用一次 `set_on_top(false)`，之后层级为 -1。
- 位置保存：窗口 `Moved` 事件停止 500ms 后写盘（`MOVE_GENERATION` 去抖），托盘「退出」时也会再存一次。所以 Ctrl+C 或异常退出也不丢位置。

## 换正式小人形象（下一轮）

目前是 `src/figure/PlaceholderFigure.tsx`：SVG 里 `#shirt` 和 `#scarf` 是两块独立形状，颜色由 props 传入。

换正式图片时：
1. 新建一个满足 `FigureProps`（`primary`、`accent`、`title`、`onClick`）的组件，比如 `ImageFigure.tsx`。
2. 推荐做法：一张底图 + 上衣、围巾各一张蒙版图（PNG alpha），用 CSS `mask-image` 叠一层 `background-color: primary/accent`（或 canvas 着色），这样任意颜色都能换。
3. 在 `src/figure/index.ts` 里把导出换成新组件，其他代码不用改。点击弹跳的动画写在 `App.css` 的 `.figure__svg--bounce`，新组件可以沿用。
