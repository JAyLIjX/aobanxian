# 五行小历 wuxing-calendar

一个待在桌面上的小万年历：今日卡片 + 一个每天穿当日吉色衣服的小人 + 五行生活小贴士。支持 macOS 和 Windows。

> 本工具的五行穿衣、宜忌、生肖等内容都来自传统民俗说法，仅作趣味参考，图个好心情。

## 功能

- **桌面小窗**：无边框、透明背景，默认待在其他窗口下面，像桌面小组件。按住空白处可拖动，位置重启后保持。不占任务栏和 Dock。
- **托盘 / 菜单栏图标**：显示/隐藏、置顶（切换）、开机启动、退出。
- **今日卡片**：公历日期、星期、农历、年月日干支、节气或节日，以及一条按当日五行轮换的小贴士。
- **小人**：上衣是当日主色，围巾是点缀色。点它弹出当天详情。
- **月历**：前后翻月、跳转年月、回到今天。每格显示公历日和农历日；初一显示月份名，节气和节日优先显示。点任意一天看详情。
- **详情**：日期与当日五行（纳音）、穿衣四档（大吉 / 平 / 慎穿 / 不宜）、今日宜忌、吉生肖 / 冲煞 / 值日星宿。
- 过了午夜自动换到新的一天，电脑从睡眠唤醒后也会刷新。

## 本机运行开发版

需要先装好：

- [Node.js](https://nodejs.org/) 20 以上
- [Rust](https://www.rust-lang.org/tools/install)（`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`）
- macOS 需要 Xcode 命令行工具；Windows 需要 Microsoft C++ 生成工具和 WebView2（见 [Tauri 前置条件](https://tauri.app/start/prerequisites/)）

```bash
npm install
npm run tauri dev
```

第一次运行要编译 Rust 依赖，需要几分钟。其他常用命令：

| 命令 | 作用 |
| --- | --- |
| `npm test` | 运行规则模块和历法数据的单元测试 |
| `npm run day` | 在终端打印今天的完整结果（可加日期：`npm run day 2026-10-21`） |
| `npm run dev` | 只在浏览器里打开界面（http://localhost:1420），方便调样式 |
| `npm run tauri build` | 打包安装包 |

小窗默认在其他窗口下面，第一次启动时如果被挡住，把前面的窗口挪开就能看到；拖到喜欢的位置后会自动记住。

## 穿衣规则

设当日五行为 D，按「旺相休囚死」给五个五行分档：

| 状态 | 与 D 的关系 | 档位 | 例：木日 |
| --- | --- | --- | --- |
| 旺 | 与 D 相同 | 大吉 | 木 |
| 相 | D 所生 | 大吉 | 火 |
| 休 | 生 D 者 | 平 | 水 |
| 囚 | 克 D 者 | 慎穿 | 金 |
| 死 | D 所克 | 不宜 | 土 |

小人的上衣（主色）取「相」的颜色，围巾（点缀色）取「旺」的颜色，所以木日是红上衣配绿围巾。

### 规则配置（`rules/default.json`）

| 字段 | 可选值 | 含义 |
| --- | --- | --- |
| `elementSource` | `nayin`（默认） | 当日五行取日柱纳音的最后一个字，如「松柏木」→ 木 |
| | `stem` | 取日干的五行，如庚日 → 金 |
| | `branch` | 取日支的五行，如子日 → 水 |
| `topPriority` | `xiang`（默认） | 「相」当主色（上衣），「旺」当点缀色（围巾） |
| | `wang` | 反过来，「旺」当主色，「相」当点缀色 |
| `dayBoundary` | `midnight`（默认） | 午夜 0:00 换日 |
| | `zi` | 23:00 子时换日（23 点以后按次日算） |
| `tierLabels` | 字符串 | 四档的显示文字：`best` 大吉、`neutral` 平、`caution` 慎穿、`avoid` 不宜 |
| `palettes` | 每个五行一组 `{ name, hex }` | 色系，列表里**第一个颜色是代表色**，小人穿的就是它 |
| `explanation` | 按 `xiang` / `wang` 各一条模板 | 穿衣解释句。可用占位符：`{label}`（如「松柏木」「庚金」）、`{D}`、`{wang}`、`{xiang}`、`{xiu}`、`{qiu}`、`{si}`、`{primaryColor}`、`{accentColor}` |
| `xiuLuckLabels` | `{ "吉": "...", "凶": "..." }` | 值日星宿吉凶的显示文字 |
| `tips` | 每个五行一组字符串 | 今日卡片上的小贴士，按日期轮换 |

默认色系：

- 木：绿 青 翠 浅绿 墨绿
- 火：红 紫 粉 橙
- 土：黄 棕 卡其 米 咖啡
- 金：白 金 银 香槟
- 水：黑 蓝 藏青 灰

### 欢迎补充你的流派

五行穿衣在民间本来就有不同说法：有人按纳音，有人按日干或日支；有人认为「旺」最吉，有人认为「相」最吉；换日也有午夜和子时两种算法；每个五行对应哪些颜色，各家也不完全一样。

这个项目把这些分歧都做成了配置项。如果你家用的是另一套说法，欢迎提 PR：在 `rules/` 下新增一个 JSON 文件，写清楚出处或依据，并在测试里补上对应的用例。

## 历法数据

农历、节气、干支、纳音、宜忌、冲煞、二十八宿全部来自 [6tail/lunar-javascript](https://github.com/6tail/lunar-javascript)（MIT 协议，与本项目兼容），本项目不自己实现历法算法。说明：

- 年干支按**立春**换年，月干支按节换月（与 lunar-javascript 的 `getYearInGanZhiByLiChun` / `getMonthInGanZhi` 一致）。
- 生肖六合、三合、六冲用对照表实现，测试里与 lunar-javascript 的日冲逐日核对过；冲煞直接用 lunar-javascript 的接口。
- 界面上不出现「凶」字，星宿的吉凶通过 `xiuLuckLabels` 换成温和的说法。

## 技术栈

Tauri 2 · React 19 · TypeScript · Vite · vitest · lunar-javascript

## 许可

[MIT](LICENSE)

---

## English

**Wuxing Calendar** is a small cross-platform (macOS / Windows) desktop widget built with Tauri 2 + React. It shows today's Gregorian and Chinese lunar date, the day's stem-branch (干支) and solar term, plus a little character who dresses each day in the "lucky colours" derived from the Five Elements (五行). Click the character or any day in the month view for details: clothing colour tiers, the almanac's suggested and avoided activities (宜忌), compatible/clashing zodiac signs and the lunar mansion of the day.

All calendar data comes from [lunar-javascript](https://github.com/6tail/lunar-javascript). The colour rules live in `rules/default.json` and are fully configurable, since folk traditions differ — PRs adding other schools are welcome. Everything here is folk tradition for fun, not advice.

```bash
npm install
npm run tauri dev   # run the desktop app
npm test            # unit tests
```

License: MIT.
