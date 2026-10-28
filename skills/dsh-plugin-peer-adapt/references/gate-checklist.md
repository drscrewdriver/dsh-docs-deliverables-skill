> 溯源｜门禁清单 D1-D11/V1-V6/G1-G6/T 系；分级已按闸门判定面裁决重标（peer=runtime 开关，engines/双清单=元数据卫生）。

# C. gate-checklist —— DSH 插件跨线门禁清单（草案 v0.1）

> 覆盖：`check-017-compat.ps1` 全部判据 D1-D11 + `verify-package.mjs` 全部判据 V1-V6a/b + 新增盲区 G1-G6 + 11 号台账 ⚠️ 项与 migration §8 断言。
> **分级口径按已定谳事实 1 重标**：
> - `runtime阻断` = 装载期抛错 / 闸门拒载 / client·host 半永不 apply（含「静默不执行」，因其等价于功能整块消失）
> - `高危` = 功能面缺失或数据错位但不阻断装载；以及验证有效性/发版纪律类
> - `元数据卫生`(P2) = engines、双清单、manifest 版本漂移等**不被兼容性闸门读取**的字段不一致 —— 不得当作 runtime 阻断处理
>
> 两条命令（只读，不写盘）：
> ```powershell
> powershell -File mine-dsh-plugins\_tools\check-017-compat.ps1 -Scope own -Root <ws>\mine-dsh-plugins   # <ws>=知识库所在工作区根
> node mine-dsh-plugins/_tools/verify-package.mjs <pkg.tgz> [--offline] [--registry URL] [--repo <仓目录>]
> ```
> 输出纪律：脚本只给 `file:line` 不给行内容（`:4`，lib/dist 为压缩单行）；脚本本体保持 ASCII（`:5`，PS 5.1 无 BOM 按 ANSI 读）。
> 排除面：`node_modules` / `_wt-*` / `.git`；CODE 集再排除 `*.md`/`*.spec.*`/`*.test.*`/`*.d.ts`（`:12-17`）。

## 1. D 系列 —— 静态兼容判据（check-017-compat.ps1）

| ID | 结论/陷阱一句话 | 检测器 | 命令 | 期望 | 分级 |
|---|---|---|---|---|---|
| D1 | `installSection` 是第 2 代注册面，0.1.7+ 已全删，留着必抛 | `Hit src/lib/dist 'installSection'`（`:58-59`） | `check-017-compat.ps1 -Scope all` | **0**（含构建产物，migration:521） | runtime阻断 |
| D2 | 第三方挂 `settings.plugin.item`/卡片席位 = 死代码（新线仅官方卡片头） | `regPat = slots\.inject\(\s*('settings\.plugin\.item'\|…\|CARD_SEAT)\s*[,)]`（`:62-73`，首参限定，:63-64 不误计 SETTINGS_SEAT） | 同上 | 0 命中（或人工确认仍走老线双挂） | 高危 |
| D3 | `settings.yaml` 里本插件 section 键必须已是真实 entry id（`namespace`→`entryId`） | settings.yaml 分类扫描 RUNTIME/SCRIPT/TEXT（`:76-91`） | 同上 + migration §6.3 路径 A | 键名=entry id；无孤儿 section | 高危 |
| D4 | 闸门**只读** `peerDependencies` 的 `@deepseek-ai/dsh*`；`engines` 仅展示、全宿主零读取方 | peers/engines 对照（`:94-102`，:97 peers、:98-99 engines MISS/OK） | 同上 | peers 存在且覆盖目标线；engines 漂移不算阻断 | **元数据卫生**（engines 部分）/ runtime阻断（peer 段不覆盖，见 G4） |
| D5 | `patchReload` 已从服务/事件面消失，硬 inject 即整段不 apply | `Hit 'patchReload'`（`:105-106`） | 同上 | **0** | runtime阻断 |
| D6 | `cordis-plugin-hmr` 已改名/移除，订阅方静默失效 | `Hit 'cordis-plugin-hmr'`（`:109-110`） | 同上 | **0** | 高危 |
| D7 | 直读磁盘会话 = V3→V4 断代的受害面（14 处直读点） | `session\.jsonl\|SESSION_FORMAT_VERSION\|sessionFormatVersion`（`:121-122`） | 同上 | **0**（改用会话服务面） | 高危 |
| D8 | `agent-team-web-profile` 标识已消失 | `Hit 'agent-team-web-profile'`（`:117-118`） | 同上 | **0** | runtime阻断 |
| D9 | `protocol:` 形态命中多为假阳性，不能当证据 | `(^\|[^a-zA-Z])protocol\s*[:=]`（`:113-114`） | 同上 | 逐条**人工复核**，禁止据此判断代 | 元数据卫生（审查项） |
| D10 | 语言包三事：patch 必须是 array、locale 需 `meta.title`、`exports` 必须映射 `./locale/*.json`；缺 `en.json` 则整个 `locale/` 被忽略 | locale/exports 组合判据（`:125-143`）；宿主锚 `package-meta.ts:101-122, :148-155` | 同上 | 三项齐备，9 语（zh,en+ja,ko,fr,de,it,ru,es） | 高危（缺 exports → 语言包解析失败） |
| D11 | **最重要一条**：`inject` 数组里出现 `settingsScope` → client 半 apply NEVER runs | HARD `inject\s*[:=]\s*\[[^\]]*settingsScope`（`:145-148`）；SOFT `ctx.get(`（`:150-154`）；CALL `ctx.settingsScope.bind`（`:155-160`） | 同上 | HARD **0**；SOFT/CALL 逐仓核对迁移完成 | runtime阻断 |

## 2. V 系列 —— 发版门禁（verify-package.mjs）

| ID | 结论/陷阱一句话 | 检测器 | 命令 | 期望 | 分级 |
|---|---|---|---|---|---|
| V1 | `package.json.version` 与 `dsh.plugin.json.version` 漂移（清单名兼容 `dsh-plugin.json`，`:51-53`） | `check('V1 …', pkg.version === plugin.version)`（`:56`） | `node verify-package.mjs <tgz> --repo <dir>` | 一致 | **元数据卫生**（闸门不读该清单） |
| V2 | `dsh.client.inject` 空数组被文档口径判为「整包 client 不编组」（browser-cdp 1.1.2 教训）；但 0.2.0 源码未见非空过滤判据 → **两说并存** | `check('V2 client.inject 非空', inject.length > 0)`（`:61`） | 同上 | 非空；并以 browser-probe 实测 bundle 是否加载 | 高危（非 runtime阻断，见 VD-017-020-06） |
| V3 | inject 里每项都要有 `peerDependencies`/`peerDependenciesMeta` 背书，漏配=装载期缺包 | `missing = inject.filter(m => !peers.includes(m))`（`:62-67`） | 同上 | 0 缺失 | runtime阻断 |
| V4 | prerelease 版本 + `publishConfig.tag=latest` 会把 beta 推上 latest（perm-gate 前车） | `version.includes('-') && tag==='latest'` 判失败（`:70-72`） | 同上 | tag = 线 tag（如 `dsh-0.2.0-beta`） | 高危（发版阻断） |
| V5 | 同名同哈希 = 重打包没 rebuild（perm-gate 事故）或重复发布 | tgz sha512 vs registry `dist.shasum`（`:74-90`，`--offline` 跳过） | `node verify-package.mjs <tgz> --registry https://registry.npmjs.org/` | 哈希不同（或尚未发布） | 高危 |
| V6a | pack 之后仓内又重建过 → tgz 与仓 lib 不一致 | tgz 内 `lib/` ↔ 仓 `lib/` 逐字节（`:102-119`，`:105` `.map` 豁免） | `… --repo <仓目录>` | 逐字节一致 | 高危 |
| V6b | **stale-build 元凶**：改了 src 没 build 就 pack（`npm pack` 只跑 `prepack`，不跑 `prepublishOnly`，也不跑 build） | src 最大 mtime ≤ lib 最大 mtime(+5000ms)（`:120-131`） | 同上 | 成立；并在 `prepack` 内强制 build | 高危 |

## 3. G 系列 —— 新增盲区（三件套编纂期补入）

| ID | 结论/陷阱一句话 | 检测器 | 命令 | 期望 | 分级 |
|---|---|---|---|---|---|
| G1 | **devDeps 假绿**：typecheck 绿 ≠ 兼容。审计修正（search-index 案）：**判「假绿」之前必须先确认该 devDep 是否被 `import` 作类型基线**，否则误把必要依赖当假绿删掉 | `rg -n "from '<pkg>'\|import type .* from '<pkg>'" src` + `package.json.devDependencies` 对照 | `powershell -File check-017-compat.ps1` 后逐仓 rg | 被 import 作基线 → 保留并说明；纯装饰 → 才可清 | 高危（验证有效性） |
| G2 | **交叉校验脚本硬编码版本**：校验脚本里写死的 `0.1.x`/`0.2.x` 常量会随宿主升级变成假裁判 | grep 脚本内版本号字面量（含 `_tools/*.mjs`、`*.spec.*` 的 version 常量） | `rg -n "0\.1\.[0-9]+(\-rc\.[0-9]+)?\|0\.2\.0" _tools *.spec.*` | 版本常量集中一处 + 有注释来源 | 高危（验证有效性） |
| G3 | **farm 假满足**：六线共享工作格，外来 peer hoist 会让某格「测起来像有」能力 | 结论级纪律（非 grep）：引用 farm 数字必须带线号 + FARM 标记 | 人工：见 host-matrix.yaml `meta.invariants` 警示 | 每条 farm 结论标注所在格 + 是否可能被 hoist | 高危（证据分级） |
| G4 | peer 上界 `<0.2.0-0` / caret 写法**漏 rc 线**；分包窄枚举致老线整体拒载（tidy-display 15/15 绿实证） | 逐线装载试装 + 闸门日志；语义依据 `plugin-compatibility.ts:77`（`includePrerelease:true`） | `dsh plugin list` / 六线 farm 逐格 `farm add` | 每目标 runtime 都实际装载通过 | **runtime阻断**（唯一跨线开关） |
| G5 | 默认 registry 是 **npmmirror**（`~/.npmrc`）→ publish/view 不钉源会得出「版本不存在」的假象（guard 4.1.x 案） | 发布/查询命令检查是否带 `--registry` | `npm view <pkg> dist-tags --json --registry https://registry.npmjs.org` | 一律钉 npmjs；publishConfig 也写 registry | 高危（发版纪律） |
| G6 | **grep 模板打错靶**：单腿 grep（只搜服务名或只搜包名）会产出错误的「零代码证据」。零代码证据必须**两腿**：① type-import 宿主包 ② `ctx.get` 服务面 | 双判据 union：`rg "from '@deepseek-ai/dsh-…'"` ∧ `rg "ctx\.get\(['\"]<service>['\"]\)"` | 两腿各跑一遍再下结论 | 两腿皆 0 才可宣称「该仓无依赖」 | 高危（验证有效性） |
| G7 | ⚠️ **Native DLL 冲突**：插件 runtime / 间接依赖引入的 native binary（.dll/.node/.so/.dylib）文件名与宿主已加载的同名 → 同进程 LoadLibrary 去重 → ABI 不匹配崩溃或功能静默损坏。worker_threads 不隔离（共享地址空间），仅 child_process 隔离 | ①枚举 runtime/自身 node_modules 中 native basename；②比对宿主 `node_modules/@img/sharp-*` 等已知清单；③交集非空时确认是否走子进程 | `find <runtime>/node_modules \( -name '*.dll' -o -name '*.node' \) | xargs -I{} basename {} | sort` 与宿主清单 `comm -12` | 交集 = 0（或冲突项已有子进程隔离证据） | **runtime阻断**（崩溃，非静默） |

## 4. T 系列 —— 台账 ⚠️ 项与环境/断言纪律（11 号 + migration §8 + 08 号）

| ID | 结论/陷阱一句话 | 来源 | 命令/动作 | 期望 | 分级 |
|---|---|---|---|---|---|
| T1 | `window.__pgSurf` 是**失败才初始化**（`??= []`）：读到 undefined = 零失败；写反则全盘误判 | 11 号 D1:183-184 | browser-probe 断言 | `undefined` 为绿；数组为红 | 高危（验证有效性） |
| T2 | 0.1.x SPA fallback 对任意未匹配路径返回 **200 HTML** → 看状态码必假绿 | 11 号 C5:148-150 | `curl` 探路由后看 body | 判定 body 是否 JSON | 高危 |
| T3 | 孤儿 `settings.yaml.lock` 会让下次 boot 的 atomic-write 全线超时（tab 卡死同源） | 11 号 C1:129-132 | `farm stop/smoke/start` 三处 pre-clean `cleanLocks` | 无残留 lock | 高危 |
| T4 | `cd` 进 `.pnpm` 深层会永久毒化本会话（`spawn bash.exe ENOENT`），子代理一并死 | 11 号 C3:139-141 | 只用 Read/`node -e` 绝对路径直读 | 全程不 cd 进 node_modules 深层 | 高危 |
| T5 | 全农场 `settings.yaml` 零化腐蚀（0.1.0 格 980B 全 NUL）；`settings.yaml.*.tmp` 是事实快照，**禁止手工清理** | 11 号 C7:157-179 | `node _host-farm/repair-settings.cjs --dry` → 正式修复 → `farm start` | rotten=含 NUL 检出的格全部 healed | 高危 |
| T6 | `npm publish` 输出「with tag latest」不可信，实落 publishConfig | 11 号 B2:117-120 | 发布后 `npm view <pkg> dist-tags --json`（404 60s 内属 CDN 传播，勿重复 publish） | dist-tags 与预期一致才算发版完成 | 高危 |
| T7 | 同名 tgz 重打包 pnpm 不认；无前缀路径会被 npm 解析成 GitHub shorthand | 11 号 B3:122-125 + 10 号:83 §3.8 | 固定 `bump → pack → verify` 顺序；路径用 `./` 前缀 | 重打包必 bump（哪怕 patch 一位） | 高危 |
| T8 | migration §8:525「宿主起 0.1.7 后表单页**自动出现**」**已被 :541 推翻**：rc.2 web UI 必须补挂 `plugins.bundle.config`/`plugins.row.config` | migration:525 ↔ :541/:544 | 断言改为「配置卡真实渲染 + `formFor` 命中（entry id ≠ 包名时卡须自绑 entry id）」 | 页面上可见表单；非按包名 dispatch 落空 | 高危（断言本身失效） |
| T9 | volatile 三条硬断言：字段标 `.volatile()` 且不嵌套/不在 union-lazy-transform 分支；改值不 remount 且只收一次 `loader/volatile-update`；无效值 → 报错但运行中引用不变 | migration §8:523-528；宿主锚 `vendor/schemastery/src/index.ts:480-494`、`vendor/loader/src/index.ts:30-34` | 双 5 面 farm 冒烟 + 日志核对 | 三条全绿 | runtime阻断（嵌套 → ValidationError） |
| T10 | `configure({ auto: false })` 只关自动页，且**只登记一次**（重复登记抛错）；「自带页 + 仍需表单数据」交互未实测 | migration §8:529、:547；MAIN `product-analytics/src/index.ts:38` | 单文件重复调用实验 | 一次生效、二次抛 | 高危 |
| T11 | 升级前后两端必查：`settings.yaml` 键改真实 entry id（前）；无 `settings: section … was not imported into entry …` warn 且 `settings.yaml.imported` 不残留（后） | migration §8:530-532；导入器锚 AUX `settings/src/index.ts:200-206, :244-253` | 双端 grep + 日志 | warn 0 条；孤儿 section 已人工裁决 | 高危 |
| T12 | 死文案 = 漏渲染（不是文案问题）；建议加 `locales.spec.ts` 断言键集 | 08 号:305-327（#11） | 单测跑 locale 键集对账 | 未渲染键 = 0 | 高危 |
| T13 | 卡片默认 `open=false`，DOM 结构固定；不可据「看不到」推断未注册 | 08 号:288-297、:271-283 | browser-probe 先展开再断言 | 展开后 entryKey 对账命中 | 高危 |
| T14 | 四层验证（build→dist 冒烟→部署产物→无头浏览器点击穿越）；UI 断言必须在**部署产物**上跑 | 08 号:475-482（#19）、:554-567（交付清单 E/F）；11 号 D4:192-193 | `farm probe`（点击重试 400ms×10、`settleMs` 6000ms+、load 预算 ≥30s） | 四层全绿 | 高危 |
| T15 | `remove` 成功 + `add` 失败 = 插件彻底消失；`pnpm add` 不补 bundles；`dsh` 会吞 pnpm `allowBuilds` key | 08 号:29-30（#15/#16/#17）；migration:543（pnpm 12 `allowBuilds` map 形态、`onlyBuiltDependencies` 失效；宿主运行时 `pnpm add` 可能因 better-sqlite3 文件锁失败） | add 后立即 `farm list` + 装前停宿主 | 装卸成对成功；bundles 计数不为 0 | 高危 |
| T16 | 注释钉语义：跨线契约要在注释里写明「谁渲染我」，否则下次勘误无处对账 | 08 号:33（#20）；12 号:52-56 机制铁律 | code review | 每个 slot 注册点带渲染方注释 | 元数据卫生 |
| T17 | 家族节（`dsh-family.tab`，list/scope root/id `dsh-family`/order 40）**只在 0.1.7-rc.1+ 有渲染面**；让位选举 TL 正座 / guard 500ms `FAMILY_YIELD_MS` / steward 2600ms 兜底 | 10 号:120 §8；12 号:10-14、:36-38、:73-76 | 五格单行 DOM 断言 `probe-asserts-family-single-row.json` | console 必须 stand down；禁 `takeover registered`；行数=1 | 高危 |
| T18 | 兼容指南速查表的旧 dual-API 结论（「0.1.0/0.1.1 `register` ✅ 存在」）**已 SUPERSEDED**，模板首改点在 `dsh-plugin-template/src/client/index.ts:155` | compat-guide:27-36 ↔ migration:29/:321 | 以 D1/D11 + 三代探测为准 | 表内 register 分支删除 | 高危（误导源） |

## 5. 门禁执行顺序（建议写进 SKILL.md）

1. `check-017-compat.ps1 -Scope all` → D1/D5/D6/D7/D8/D11 必须 **0**（runtime阻断先清）。
2. G6 两腿复核所有「零命中」结论；G1 判 devDeps 前先查是否被 import 作类型基线；G2 查脚本内硬编码版本。
3. D2/D3/D4 复核：卡面改挂 `plugins.*`、settings.yaml 键改 entry id、**peer 段覆盖目标线**（唯一开关）。
4. `bump → build → pack → verify-package.mjs --repo <dir> --registry https://registry.npmjs.org`（V1-V6 全绿；V4/V5 为发版前置）。
5. farm 逐线 `add` + `probe`（T14 四层、T1 `__pgSurf`、T2 JSON 判活、T17 家族节单行）；引用 farm 结论时挂 G3 警示。
6. 发布后 T6 `dist-tags` 复核；T3/T5 lock 与 settings.yaml 体检。

---

## 附：分级统计（按本表条目）

| 分级 | 条数 | ID |
|---|---|---|
| runtime阻断 | 9 | D1、D5、D8、D11、V3、T9、G4（peer 段）、D4-peer 侧、**G7** |
| 高危 | 26 | D2、D3、D6、D7、D10、V2、V4、V5、V6a、V6b、G1、G2、G3、G5、G6、T1-T8、T10-T15、T17、T18 |
| 元数据卫生 | 4 | D4-engines、D9、V1、T16 |

> 注：条目总数 = 11(D) + 7(V2 拆 a/b 记 1 行计 7) + 7(G) + 18(T) = 43 行；分级列中 D4 因两侧拆分重复计数，故 9+26+4=39 对应 37 行 + 2 个拆分侧。
