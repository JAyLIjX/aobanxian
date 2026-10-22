# CLAUDE.md

奥半仙（Ao Banxian）：Tauri 2 + React + TypeScript 的桌面小组件。一个像素道士，每天按五行换道袍颜色，举着的幡上印字，点他展开成挂轴日历。macOS 和 Windows 都要能跑。

## 常用命令

```bash
npm run tauri dev                 # 开发版桌面窗口
VITE_FAKE_TODAY=2026-10-01 npm run tauri dev   # 把「今天」固定成某一天（看特殊日子）
npm test                          # vitest
npm run typecheck                 # tsc --noEmit
npm run day [YYYY-MM-DD]          # 终端打印某天的完整结果
npm run fonts                     # 重新收集字表、给字体做子集（见「字体」）
.venv-tools/bin/python scripts/process-sprite.py [角色id]   # 重新处理角色精灵图（不带参数 = 全部角色）
npx tsx scripts/i18n/build-zh-tw.ts                # 重新生成繁体
bash scripts/render-previews.sh   # 幡上字体 A/B 预览图（需要先 npm run dev）
```

Python 工具（精灵图、字体）用项目里的 `.venv-tools`（已在 .gitignore）：`python3 -m venv .venv-tools && .venv-tools/bin/pip install pillow numpy fonttools brotli`。

## 架构

```
rules/default.json         五行规则（流派）：取法、小人配色、换日、色系名、色系、像素色阶、四档文字、解释句、小贴士
config/
  settings.default.json    应用设置的默认值
  branding.json            幡上的字（bannerText、宜忌前缀、兜底文字、特殊日子文字）
  about.json               关于窗口的作者、仓库
locales/
  zh-CN.json zh-TW.json en.json   界面文字（i18next）
  glossary.json            术语表：历法、宜忌、颜色等的英文 / 繁体
  zh-TW.terms.json         历法词条简→繁对照（脚本生成）
src/core/                  纯 TS，不依赖 React / Tauri / lunar-javascript
  elements.ts wuxing.ts zodiac.ts rules.ts dayBoundary.ts   五行与规则（第一轮）
  banner.ts                幡面换字循环、宜忌取值
  layout.ts                卷轴放在哪、窗口多大
  opening.ts               开场白（纪念日 > 特殊日子 > 生肖相冲相合 > 黄道黑道）、特殊日子的幡面文字
  bubble.ts                气泡计时
  zodiac.ts                六合、三合、六冲、六害；我的生肖和今天的关系
  lots.ts                  求签：每日签号（日期 + 本机种子）、签册
  gua.ts                   梅花易数时间起卦（纯函数）
src/calendar/
  day.ts                   lunar-javascript → DayInfo / DayDetail
  special.ts               值神黄道黑道、天赦日、杨公忌日、特殊日子优先级
  zeri.ts                  择日：事件 → 宜忌用词（config/zeri.json），筛出宜做且不忌的日子
  anniversary.ts           纪念日：下次日期（闰月、小月、2/29）、提醒、月历记号、导入校验
  countdown.ts             卡片底部倒计时（纪念日、传统节日、节气）
  guaDay.ts                某天某时 → 农历年支、月、日、时支 → 起卦
src/data/                  古籍原文 + 自撰白话：lots.json（關聖帝君靈籤一百签）、zhouyi.json（周易六十四卦）
src/share/shareImage.ts    分享图（1080×1440）版式、离线二维码
src/sprite/
  sprite.ts                精灵数据、换色渲染（纯函数）、点击分区
  bannerText.ts            幡上文字栅格化（像素字 / 像素化行书，竖排 / 横排）、像素溶解
  characters.ts            角色清单（自动收集 assets/character/*）
  lotCylinder.ts           求签的像素签筒（代码画）
  Daoshi.tsx               canvas 绘制道士：身体层 + 幡层，呼吸、轻跳、晃幡、点击 / 拖动
src/windows/
  MainApp.tsx              主窗口：道士、幡面循环、卷轴、详情、气泡、闪光、布局、点穿区域、菜单
  SettingsApp.tsx          设置窗口（?view=settings）
  AboutApp.tsx             关于窗口（?view=about）
  ZeriApp / AnniversariesApp / LotsApp / GuaApp / ShareApp   择日、纪念日、求签、每日一卦、分享今日（?view=zeri 等）
  useWindowSetup.ts        独立窗口的公共设置（语言、标题）
  PreviewApp.tsx           开发用预览页（?view=preview，只在开发模式）
src/components/            Scroll（挂轴）/ TodayCard / MonthView / DetailPanel / ColorChip / Bubble / Sparkles
src/settings/              设置类型与校验（纯函数）、tauri-plugin-store 读写、useSettings
src/i18n/                  i18next 初始化、术语显示（terms.ts）、日期等格式化（format.ts）
src/platform/
  window.ts                Tauri 窗口封装（浏览器里是空操作）
  menu.ts                  右键菜单与托盘菜单（同一份定义）
  windows.ts               打开独立窗口；其他窗口请主窗口开详情（open-detail）、请道士说话（say）
  notify.ts                系统通知
src-tauri/src/lib.rs       点穿线程、set_window_rect、quit_app、插件、macOS 隐藏 Dock 图标
scripts/process-sprite.py  素材处理（一次性）
scripts/fonts/             字体下载、字表收集、子集化
scripts/i18n/              繁体生成
assets/character/<id>/     每个角色一个文件夹：key.png（色键版，正式素材）、ref.png（原配色参考）、character.json（名字、书写物横竖）
preview/                   效果图
```

依赖方向：`windows / components → calendar / sprite / i18n → core`，`core` 不依赖任何东西。

## 规则设计（第一轮，沿用）

- 当日五行 D 由 `elementSource` 决定：`branch`（日支，**默认**）/ `nayin`（纳音末字）/ `stem`（日干）。界面上只写结果（「今日巳火」「当日五行：巳火」），**不写取法**（不出现「按日支」等字样，测试会查）；取法只在设置里出现，选项顺序 日支 / 纳音 / 日干。纳音作为黄历信息单独显示「纳音：大林木」，不参与配色。
- 只存改过的设置项，所以默认值改了以后，没手动改过这一项的用户自动用新默认值。
- **两个大吉色的顺序全部统一为「相在前、旺在后」**（被日所生的颜色在前，同气的在后）：幡面「宜黄宜红」、卡片、详情、解释句「今日巳火：火生土，火为同气，黄、红皆为大吉」。`tests/calendar.test.ts` 的回归用例会检查卡片顺序和解释句一致。
- `phasesOf(D)`：旺 = D，相 = D 所生，休 = 生 D 者，囚 = 克 D 者，死 = D 所克。档位：旺、相 → 大吉；休 → 平；囚 → 慎穿；死 → 不宜。
- **大吉的相、旺地位平等**。界面上永远并列（相在前）：卡片「大吉 红色系 ■■■ 绿色系 ■■■」，详情「红色系（火） / 绿色系（木）」，幡上「宜红宜绿」，解释句同时说两个。界面文字里**不能**出现「穿 X 配 Y」「道袍」「腰带」（英文不能有 robe / sash），`tests/i18n.test.ts` 会检查。
- `topPriority` 只决定小人身上哪个颜色画在道袍（大面积）：`xiang` 时相在道袍、旺在腰带，`wang` 时互换。`Outfit.primary / accent` 只给画小人用。
- 色系名和幡上的单字在 `rules/default.json` 的 `colorFamilies`（红色系 / 红、绿色系 / 绿、黄色系 / 黄、白色系 / 白、黑蓝色系 / 黑）。水的单字是「黑」，色系名仍是「黑蓝色系」，像素色阶仍是藏青系（玄青 / 藏青 / 群青），避免道袍糊成一团。
- 设置窗口「规则」页里的三项覆盖 `rules/default.json` 的同名项（`rulesWith`），只存在用户的 store 里。

## 精灵图

`scripts/process-sprite.py` 把 `assets/character/<id>/key.png`（道士是 1254×1254，AI 画的像素风）处理成 `src/assets/sprite/<id>.json`，预览图在 `preview/character/<id>/`。下面以道士为例：

1. **网格**：先用傅里叶估出格子周期（约 10.6×10.9 像素），再沿边缘强度用动态规划找每一条实际网格线（AI 画的格子不均匀），得到 79×115 格。每格取中间 60% 像素的主色（粗量化找众数再取中位数），不插值。原图约 111 格高，不是最初估计的 64 格。
2. **透明度**：每格 alpha 按多数二值化，去掉四邻都透明的孤立点和小于 4 格的碎块。
3. **换色区域**：HSV 色相 280–340° 为洋红（道袍），165–210° 为青色（腰带）；紧挨区域的偏色过渡格并入区域，其他偏色格去饱和。每个区域按亮度 1D k-means 分成 暗 / 中 / 亮 三档。
4. **底层**：其余像素原样保留，调色板超过 90 色时按格数加权合并最近的颜色。
5. **幡**：幡面 = 米白色最大连通块里的最大内接矩形（`bannerFace`，16×42 格）。整面幡的左右范围只看上下木轴所在行、从幡面中心连续的一段（木轴两端有金色端头）；往下到握杆的手为止；再从幡面做连通填充得到幡的形状 `bannerMask`。**不要**用整块矩形判断幡：矩形会把道士的耳朵和肩膀算进去。顶上的金色宝珠颜色接近皮肤色，所以填充时不按皮肤色拦，只在找握杆的手时用皮肤色。
6. **预览**：`preview/character/<id>/outfits.png` 五种日子的配色，脚本会检查底层不残留洋红 / 青色。

JSON 结构：`id`、`writing`（`vertical` 竖排 / `horizontal` 横排）、`base`（每格一个字符，指向 `palette`）、`regions`（`a/b/c` 道袍暗中亮、`x/y/z` 腰带暗中亮）、`banner`（外接矩形）、`bannerMask`、`bannerFace`、`headTop`。

## 角色

角色 = 一张色键图 + 一个说明文件，代码里不写死。现有四个：道士（daoshi，竖幡）、书生（shusheng，扇面横排）、青天大老爷（guanyuan，告示横排）、小和尚（heshang，木牌竖排）。`src/sprite/characters.ts` 用 `import.meta.glob` 自动收集 `assets/character/*/character.json` 和 `src/assets/sprite/*.json`，两者 id 对上的就出现在设置「外观 → 角色」里（道士永远排第一，是默认角色）。字段名沿用道士：「幡」= 印字的书写物，「道袍 / 腰带」= 大面积 / 小面积两个换色区。

每个角色包含：
- **id**：文件夹名，也是 `settings.character` 的值。
- **名字**：`character.json` 的 `name`，简体、繁体、英文三种。
- **主图**：`key.png`。换色区涂成洋红（大面积，色相 280–340°）和青色（小面积，165–210°）；书写处留米白空白。
- **书写区**：脚本自动找米白空白处的最大内接矩形（`bannerFace`，印字）和整个书写物的形状（`banner` + `bannerMask`，点击判定、展开卷轴时隐藏、卷轴从这里展开）。`writing: "vertical"` 竖排（幡），`"horizontal"` 横排（扇面、告示），横排时幡上文字从左往右排、字号按书写区高度算。
- **点击区**：`bannerMask` 里的不透明格 = 点书写物（换字、晃一下）；其他不透明格 = 点人（轻跳、展开 / 收起）；透明格点穿。
- **展开日历**（`unroll`）：`writing` 书写物收起、卡片在人物上下展开（道士的幡）；`inPlace` 书写物原地展开成卡片、把它盖住（青天大老爷的告示——原画告示后面没有衣服，藏起来会露出洞）；`body` 书写物不动、卡片从人物下方展开（书生的扇面、小和尚的木牌）。
- **口吻**（`voice`）：右键菜单第一项的名字 `divine` 和各种日子的开场白（黄道、黑道、天赦、杨公忌、节日、节气、生肖相冲、相合、纪念日），简体、英文手写，繁体由 `scripts/i18n/build-zh-tw.ts` 生成。称呼：道士「善信」、书生「兄台」、青天大老爷命令语气、小和尚「施主」。**「施主」只能出现在小和尚的文字里**（`tests/voice.test.ts` 会查）；英文里道士用中性说法，不用佛教词。

### 加一个新角色（例：书生）

1. 建文件夹 `assets/character/shusheng/`，放进 `key.png`（色键版）和 `ref.png`（原配色参考）。
2. 写 `assets/character/shusheng/character.json`：
   ```json
   { "id": "shusheng", "name": { "zh-CN": "书生", "zh-TW": "書生", "en": "Scholar" }, "writing": "horizontal" }
   ```
3. 运行 `.venv-tools/bin/python scripts/process-sprite.py shusheng`，生成 `src/assets/sprite/shusheng.json` 和 `preview/character/shusheng/`。看预览图：换色区是否干净、`sprite-regions.png` 里书写区找得对不对。
4. 不用改代码，`npm run tauri dev` 后在设置「外观 → 角色」里就能选。**跑测试前先删 `node_modules/.vitest-cache`**：`import.meta.glob` 在编译时展开，vitest 的缓存不会因为多了角色文件而失效，测试会看不到新角色。
5. 书写物的范围：竖排按「木轴 + 握杆的手」找；横排从米白区域向外扩几格算边框。`character.json` 里可以按角色微调：
   - `writingFrame`（横排）：向外扩几格，默认 3。书生的扇面 2（再往外是衣服轮廓线），青天大老爷的告示 6（两头木轴、金头伸出较多）。
   - `writingShape: "scroll"`（横排）：卷轴形状，只有两头能伸出纸面上下，中间上下只算两格（再往外是衣领、胡子）。青天大老爷用。
   - `writingSide`（竖排）：写字面那几行里，左右各最多算几格边框。小和尚 3（木牌紧贴耳朵）；道士不设（幡的边框宽）。
6. 格子周期：AI 画的像素格本来是正方形、约 10.5 原图像素。脚本先分别估横竖周期，两者相差超过 6% 时（书生、青天大老爷、小和尚都是）改用两个方向共同的周期（`joint_period`，限定在 9.8–11.5），否则人会被压扁或拉长。
7. 用 `scripts/process-sprite.py` 处理完，看 `preview/character/<id>/sprite-regions.png` 和 `outfits.png`；`tests/characterSprites.test.ts` 检查每个角色没有色键残留、两层叠加等于完整角色、高度和道士相差 10% 以内、写字面排得下「奥半仙」。


## 渲染

- canvas 按格画，每格的**设备像素**取整（`round(scale × devicePixelRatio)`），`image-rendering: pixelated`。小 / 中 / 大 = 每格 1 / 2 / 3 个 CSS 像素。
- 身体层（`hideBanner`）和幡层（`onlyBanner`）分开画：幡单独晃、展开成卷轴时单独隐藏。测试保证两层叠起来 = 完整的道士。
- 换色：区域格按深浅档换成 `pixelRamps[五行]` 的三个颜色；道袍、腰带分别用哪个五行由 `topPriority` 决定。
- 幡上的字（`bannerText.ts`）：按幡面大小和字数自动选字号，字宽占幡面宽度 70%–80%，整列上下居中。所有尺寸在设备像素上算：
  - 像素字：Fusion Pixel 原生 12px / 10px 按**整数倍**放大（每个字体像素 = p 个设备像素），在宽度 ≤ 80%、整列放得下的前提下取最大；放不下时去掉字间距再试。3 个字一般落在 75%，4 个字自动降一档。
  - 像素化行书：画到半格网格（每格设备像素为奇数时用整格）后二值化。行书字形四周留白很大，按字号算会显得很小，所以按**墨迹**排：先用参考字号量出每个字的墨迹框，再缩放到最宽的墨迹占幡面约 76%、整列放得下。
  - `tests/bannerText.test.ts` 覆盖小 / 中 / 大 × 普通屏 / Retina 的字号比例。`bash scripts/render-previews.sh` 出 `preview/banner-size.png`。
  - 换字时新旧两段的字号可能不同（3 个字 → 4 个字），像素溶解在设备像素上按小块混合。
- 动画都按格跳变（CSS `steps()` / Web Animations 的 `steps(1, end)`）：呼吸每秒浮动一格，点人轻跳三格，点幡左右晃一格，换字像素溶解 0.2 秒。**不要**用改 `key` 的方式重播动画，那会让 canvas 重新挂载、画好的内容丢失。

## 交互

| 操作 | 结果 |
| --- | --- |
| 点幡 | 晃一下，换下一项（奥半仙 → 宜事 → 忌事 → 宜红宜绿 → 吉生肖），8 秒没操作回到第一项；展开期间暂停 |
| 点人 | 轻跳，幡展开成挂轴 / 卷回 |
| 点挂轴纸面 / 「月历」/ 月历某天 | 详情 / 月历 / 那天的详情 |
| 按住道士移动 > 4px | 拖动窗口 |
| 右键道士或挂轴 | 原生菜单（`Menu.popup()`）；正式版关掉 WebView 默认右键菜单 |
| Esc | 详情 → 卷轴，逐层收起 |
| 点别处（窗口失焦） | 全部收起（可在设置里关掉） |

- 点击分区按格判断：`bannerMask` 里的不透明格算幡，其他不透明格算人，透明格不响应（在 Tauri 里根本收不到，见「点穿」）。
- 拖动和点击：按下只记位置，移动超过 4px 才 `startDragging()`（之后这次松开不会回到网页），没动就在 pointerup 按落点当点击。
- 焦点：窗口开了 `acceptFirstMouse`，点击时不会自动成为焦点窗口。主窗口 `onPointerDownCapture` 每次都调 `setFocus()`（不能用 `document.hasFocus()` 判断，网页可能误以为自己有焦点），这样才收得到 Esc 和失焦。失焦后等 150ms 再收起，避开原生下拉框等短暂失焦。
- macOS 上用 System Events 查「前台应用」看不到本应用（Accessory 策略），这不代表没拿到焦点。
- **右键菜单开着时不能调任何菜单接口**：Tauri 的 `popup` 命令在菜单打开期间一直占着这个网页的菜单资源表锁，这时再新建菜单项、换托盘菜单，会在主线程上死锁，整个程序卡死（v0.2.0 出过：展开日历时右键，150ms 后失焦收起 → 菜单文字变了 → 重建托盘菜单 → 卡死）。所以 `menu.ts` 里所有菜单操作排队、一次一件；文字和勾选没变就不重建；菜单开着时失焦不收起日历。

## 点穿

`lib.rs` 里一个线程每 16ms 读光标位置（`AppHandle::cursor_position`，每次只向主线程问这一样；窗口位置和缩放比例由窗口事件 `Moved` / `ScaleFactorChanged` 缓存），换算成窗口内逻辑坐标，判断是否落在前端报告的可点击区域（`set_hit_regions`：精灵图不透明格遮罩 + 卷轴、详情的矩形），不在就 `set_ignore_cursor_events(true)`，点击直接落到桌面或下面的窗口。只用跨平台接口。

- 遮罩向上下各多算一格（呼吸浮动），再向四周扩一格：光标还没碰到道士时窗口就已经切回接收鼠标。macOS 在 `ignoresMouseEvents` 切换后要等下一次鼠标移动才把点击交给这个窗口，所以提前切换能避免「第一下点击被漏掉」。
- 展开时幡的格不算（幡已经变成卷轴）。

## 窗口与布局

- `tauri.conf.json`：无边框、透明、`shadow: false`、`skipTaskbar`、`alwaysOnBottom`、`acceptFirstMouse`、`visible: false`（布局算好后前端再显示）。
- **道士在屏幕上的位置始终不动**，窗口围绕它伸缩。存的是道士左上角的屏幕坐标（store 里的 `anchor`），不是窗口位置；所以去掉了 window-state 插件。窗口被拖动后（`onMoved`）反推 anchor，500ms 去抖存盘；程序自己改窗口时（`applying`）忽略移动事件。
- 窗口 = 道士 + 四周空白（气泡、闪光、翻译小气泡）∪ 卷轴 ∪ 详情（各加阴影留边）。透明处点穿，所以窗口大一点不碍事。
- 卷轴位置（`core/layout.ts` 的 `placePanel`）：水平以幡为中心，默认放在**道士下方**，下面放不下放上方，都放不下放在空间大的一侧并压回屏幕内（这时会和道士重叠）；贴边时整体往屏幕内收。不把卷轴盖在道士身上：幡在道士右上方，卡片以幡为中心展开会盖住道士，就点不到他来卷回了。详情弹窗用同样的规则单独定位。
- 换了尺寸或屏幕后，道士超出屏幕会先被拉回屏幕内。
- 卷轴动画：木轴从幡的宽度、以幡中心为原点横向拉宽（0.15s），再拉开纸面（0.2s，向下展开时下木轴往下走，向上展开时上木轴往上走）；收起时反向播放。
- macOS：配置里的 `alwaysOnBottom` 创建窗口时不生效，`setup` 里再设一次；`ActivationPolicy::Accessory` 隐藏 Dock 图标（唯一的平台分支）。透明窗口需要 `macOSPrivateApi`。

## 每日开场白与特殊日子

- 开场白在「每天第一次显示」时说（启动、跨过午夜或睡眠唤醒后进入新的一天）。store 里的 `lastOpening` 记录说过的日期。
- 内容只由当天的历法数据决定（`openingFor`），所以「掐指一算」重播的和当天第一次说的一致；气泡还在时再触发会重新计时。
- 黄道日 = 值神青龙、明堂、金匮、天德、玉堂、司命（lunar-javascript 的 `getDayTianShenType`）。
- 天赦日按月建分季（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬，等价于按立春 / 立夏 / 立秋 / 立冬划分）；杨公忌按农历月日表。优先级 天赦 > 传统节日 > 节气 > 杨公忌。2026 年的 6 个天赦日已与公开日历核对（测试里有）。

## 设置

- `tauri-plugin-store` 存在应用数据目录的 `settings.json`，`settings` 键只存和默认值不同的项（`diffFromDefaults`）；`anchor`、`lastOpening` 也在这个文件里。
- 默认值：`config/settings.default.json` + `rules/default.json`（取法、小人配色、换日）+ `config/branding.json`（幡上文字）。
- 改动即时生效：设置窗口保存后 `emit("settings-changed")`，所有窗口的 `useSettings` 都更新。
- 开机启动以系统里的实际状态为准（`plugin-autostart` 的 `isEnabled`）。
- 浏览器里（`npm run dev`）退回 localStorage。

## 多语言

- i18next，`locales/zh-CN.json`（默认）、`zh-TW.json`、`en.json`；跟随系统语言（`resolveSystemLang`：zh-TW/HK/MO/Hant → 繁体，其他中文 → 简体，其他 → 英文），设置里可切换，所有窗口即时更新。
- 简体界面里四档文字、解释句、星宿吉凶、小贴士直接用 `rules/default.json`；其他语言用语言文件的 `rulesText`。所以 `zh-CN.json` 没有 `rulesText`，测试允许这一处差异。
- 术语（`src/i18n/terms.ts`）：英文显示「中文原词 · 英文解释」，干支「戊辰 Wu-Chen」，颜色「Vermilion 银朱」（英文在前）；繁体先查术语表的 `zh-TW`，再查 `zh-TW.terms.json`。
- 繁体用 OpenCC 生成：界面 `cn→twp`（台湾用词），历法 / 宜忌**逐条** `cn→tw`（保持传统写法）。**不要逐字转换**：会把「理发」转成「理發」（应为「理髮」）、「谷雨」留成「谷雨」（应为「穀雨」）。人工修正写进脚本的 `UI_FIXES` / `TERM_FIXES` / `KEY_FIXES`：黄历 → 農民曆、衝 → 沖（沖煞）、畫素 → 像素、儲存庫、以 MIT 授權開源、結束（退出）等。
- 幡上的字所有语言都保持中文；英文界面换字时在幡旁冒翻译小气泡（繁体是中文，不冒）。

## 字体

| 用途 | 字体 | 文件 | 字表 |
| --- | --- | --- | --- |
| 正文 | 霞鹜文楷 | `LXGWWenKai-subset.woff2` | glyphs-body（含繁体） |
| 大字 A / B | 马善政 / 志莽行书 | `MaShanZheng-subset.woff2` / `ZhiMangXing-subset.woff2` | glyphs-display |
| 幡上像素字 | Fusion Pixel 12px / 10px | `FusionPixel12-banner.woff2` / `FusionPixel10-banner.woff2` | glyphs-banner（幡面用字 + GB2312 一级字） |
| 幡上行书 | 志莽行书 | `ZhiMangXing-banner.woff2` | glyphs-banner-words（只有幡面用字，缺字回退到像素字） |
| 英文正文 | EB Garamond | `EBGaramond-subset.woff2` | glyphs-latin |

- 全部 OFL 1.1，许可在 `src/assets/fonts/`（Fusion Pixel 由 Ark Pixel、Cubic 11、Galmuri 合成，三份许可在 `FusionPixel-LICENSES/`）。霞鹜文楷有保留字体名，但附加许可允许子集 / WOFF2 在不作为可安装字体分发时沿用原名。合计约 780KB。
- 马善政 / 志莽行书没有 奧曆臘農閏 这几个繁体字，繁体界面里这几个字回退到霞鹜文楷。
- 幡上文字可以在设置里自定义，所以像素字收了 GB2312 一级常用字（3755 字）；GB2312 解码会混进几个私用区字符，收集时要跳过。

### 加字 / 重新子集化

**改了界面文字、规则、语言文件或幡上文字之后，运行一次 `npm run fonts`。** 脚本会下载原版到 `fonts-src/`（已存在跳过）、重新生成 `scripts/fonts/glyphs-*.txt`、用 pyftsubset 输出 woff2 并打印每个字体缺哪些字。字表来源：ASCII 和常用标点；`src/`、`rules/`、`config/`、`locales/` 里的所有字符；1901–2099 年每一天的完整详情；幡面循环可能出现的所有字。要让大字显示新的字，在 `collect-glyphs.ts` 里往 `display` 字表加字。提交时 woff2 和 glyphs-*.txt 一起提交。

## Windows 与 WebView2

GitHub Actions（`.github/workflows/release.yml`）推送 `v*` 标签时用 tauri-action 构建 macOS universal 和 Windows（.msi + NSIS .exe），生成草稿 Release；暂不签名。本机没有 Windows 环境，以下是按 Tauri / WebView2 的已知行为做的处理和需要在 Windows 上确认的点：

- **透明窗口**：`transparent: true` + `decorations: false` + `shadow: false`（Windows 上 shadow 会给无边框窗口加 1px 边框和阴影）。页面 `html, body, #root` 背景必须透明。
- **置底**：`alwaysOnBottom` 在 Windows 上通过拦截窗口层级变化保持在底部；需要确认点击道士后它不会跳到其他窗口前面。
- **点穿**：`set_ignore_cursor_events` 在 Windows 上是 `WS_EX_TRANSPARENT | WS_EX_LAYERED`；`cursor_position` 返回物理像素，已按 `scale_factor` 换算。
- **拖动**：`startDragging()` 需要在鼠标按住时调用（在 pointermove 里调用满足）。
- **缩放**：Windows 常见 125% / 150% 缩放时，每格设备像素 = round(格 × 1.25) 等，像素仍锐利，但尺寸会和 macOS 略有不同；幡上文字在每格设备像素为奇数时自动改用整格网格 + 10px 字。
- **右键**：WebView2 默认右键菜单在正式版里用 `contextmenu` 的 `preventDefault` 关掉；Tauri 原生菜单 `popup()` 在鼠标位置弹出。
- **托盘**：Windows 托盘图标常被折叠到「^」里，右键道士是主入口；托盘菜单左键也能打开（`showMenuOnLeftClick`）。
- **`acceptFirstMouse`** 只对 macOS 生效，Windows 上点击无焦点窗口本来就会传给网页。
- **安装包名称**：productName 是中文「奥半仙」，可执行文件名用 `mainBinaryName: "aobanxian"` 保持 ASCII；WiX 设了 `language: zh-CN`（代码页 936）以支持中文产品名，v0.1.0 在 GitHub Actions 上 MSI、NSIS 都构建成功。GitHub 上传 Release 附件时会**去掉文件名里的中文**（附件会变成 `_0.1.0_universal.dmg`），所以 release.yml 用 `assetNamePattern: "AoBanxian_[version]_[arch][setup][ext]"`（tauri-action@v0 里叫 assetNamePattern，新版改名为 releaseAssetNamePattern） 改成拼音名。
- **WebView2 运行时**：Windows 10 可能没有，NSIS 安装包默认会下载引导程序。
- 需要在 Windows 上确认：透明边缘没有黑边、点穿、拖动、卷轴展开不超出屏幕（含任务栏）、右键菜单位置、设置窗口、字体（canvas 文字栅格化在 ClearType 下仍按阈值取点）。

## v0.2 功能要点

- **数据都在本机**：我的生肖在设置里；纪念日（`anniversaries`）、签册（`lotBook`）、求签种子（`lotSalt`）、今天第一次起卦的钟点（`guaCast`）、已发过的纪念日提醒（`annivNotified`）都在 store 的 `settings.json` 里。
- **古籍原文**（签诗、卦辞、爻辞）保持维基文库原文繁体，简体界面也不转换；白话和英文是自撰。**不要编造或改写原文**；换版本时整份替换 `src/data/*.json` 并注明出处。
- **每天一签**：签号 = hash(本机种子 + 日期) mod 100 + 1，同一天怎么求都一样。
- **起卦**：年支按农历年（正月初一换年），闰月按本月数，时辰 23 点起算子时。
- **择日**：`config/zeri.json` 里每件事对应的宜忌用词；要求「宜」里有、「忌」里没有。和我的生肖相冲的日子变灰并标「冲你」。
- **分享图**：文字按界面语言；存到 `图片/奥半仙/奥半仙-日期.png`（附签加「-签」），需要 fs 的 `$PICTURE` 权限；导出 / 导入纪念日走对话框选的路径（对话框会把选中的路径加进 fs 权限范围）。

## 测试

`tests/`：v0.2 新增 生肖关系（六合、三合、六冲、六害）、择日（结果里没有一个在忌里）、纪念日（闰月、小月、跨年、提醒、导入）、开场白优先级、求签（同日同签、一百签齐全）、起卦（观梅占等固定例子、64 卦 384 爻用九用六齐全）、分享图（尺寸、二维码解码）、角色框架（道士搬家后数据不变、横排排版）；以及第一、二轮的 规则、历法、精灵图（五种日子不残留色键色、底层不变、两层叠加、点击分区、幡外的手和肩膀算点人、透明处点穿）、幡面循环与宜忌取值、特殊日子（真实日期、优先级）、开场白与气泡计时、卷轴布局（四个角不超出屏幕、道士不动）、设置（每项改动读回、只存改过的项、恢复默认）、多语言（键一致、繁体无简体字、术语表覆盖十年内所有历法词）。

界面交互（点击、拖动、右键、设置即时生效）需要在真实窗口里验证：`npm run tauri dev`。
