> 溯源｜本计划核心交付（定稿 2026-10-11，2026-10-17 增补 §7 至 7 卡）。44 卡 VERIFIED38/FARM2/PENDING4。与旧文档冲突时以本台账+源码为准；farm 级结论自带共享格假满足警示。

# A. version-delta-ledger —— DSH 宿主跨线变化点台账（草案 v0.1）

> 组织方式：按六个线间迁移分节，**一变化一卡**；稳定 ID `VD-<from>-<to>-<序>`；卡头即症状词。
> 检测点一律 **typeof / inject 探测**，禁止读宿主版本号（10 号手册:9-10 铁律）。
> 基线坐标：MAIN=`deepseek-harness`(0.2.0-rc.2) / AUX=`.harness-017rc2-wt`(0.1.7-rc.2) / OLD=`dsh-repo`(0.1.5-rc.2)。
> 探针方式：MAIN 为 git 仓、含 26 个 `dsh-v*` tag，故 0.1.0-rc.8…0.2.1-alpha.1 六线均可 `git grep -l` 取**文件数**做源码级断代（下表简称「tag 探针」）。
> 证据等级：`VERIFIED`=三基线或 tag 探针源码锚定；`FARM`=仅六线 farm 实测（**共享格≠某线能力，外来 peer hoist 假满足**）；`PENDING`=有反证/两说并存待裁决；`UNVERIFIED`=文档口径未核到。

**全局探测配方（所有卡共用，禁读版本号）**

| 代号 | 探测 | 含义 |
|---|---|---|
| P-gen1 | `typeof (await import('@deepseek-ai/dsh-settings')).installSettingsSection === 'function'` | 第 1 代注册面在 |
| P-gen2 | `typeof sctx.settings.installSection === 'function'`（在 `ctx.inject(['settings'])` 内） | 第 2 代注册面在 |
| P-gen3 | `ctx.get('configForms') !== undefined` / `typeof ctx.settings.configure === 'function'` | 第 3 代声明式面在 |
| P-vol | `typeof field.volatile === 'function'` | 支持 `.volatile()` |
| P-scope | `ctx.get('settingsScope') !== undefined` | 老服务面在（0.1.7 起恒为 undefined） |
| P-gate | 装一个 peer 写 `>=99.0.0` 的探针包看是否拒载 | 兼容性闸门在（0.1.7-rc.1 起） |

---

## §1 0.1.0 → 0.1.1

### VD-010-011-01 · 两线零断代（症状：升级到 0.1.1 什么都不用改）

| 字段 | 内容 |
|---|---|
| 变化点 | 0.1.0-rc.8 → 0.1.1-rc.2 在 settings/client/boot 三面**无 API 断代** |
| 断裂面 | 无。tag 探针：`installSettingsSection` 11↔11、`installSection` 0↔0、`settingsScope` 40↔40、`settings.plugin.item` 11↔11、`snapshotEvents` 0↔0；`git diff --stat` 0.1.0-rc.8↔0.1.1-rc.2（settings/ui-settings/ui-settings-plugins/boot）= 17 files / +27 / −25，全为版本行级 |
| 运行时症状 | 无（此卡的作用是**阻止误判断代**而写入不必要的能力探测） |
| 检测点代码 | 直接沿用 P-gen1；两线共用同一份 bundle |
| 兜底处方 | 把 0.1.0 与 0.1.1 当作**同一档**做 peer 与代码分发，不要拆两份清单 |
| 证据 | VERIFIED：tag 探针 + `git diff --stat`；席位账本见 migration:437-439 前置口径 |
| 先例仓 | 第一批七插件（09）中 brief/canvas/tidy-display 三线共用同一 range 写法 |

### VD-010-011-02 · gen-1 注册骨架形状（症状：`installSettingsSection is not a function`）

| 字段 | 内容 |
|---|---|
| 变化点 | 第 1 代 waist = **模块级** `settingsNamespace()` + `installSettingsSection()`，内部自行 `ctx.inject(['settings'])` |
| 断裂面 | dsh-study-docs 0.1.0-rc.5 快照 `settings/settings/src/index.ts`:19 `NAMESPACE_PATTERN`、:26-31 `settingsNamespace()` 导出、:863-875 `installSettingsSection(ctx, ns, schema, entry, hooks)`，函数体 :870 `ctx.inject(['settings'], sctx => { :871 sctx.settings.register(ns, schema, { base: entry, … }) :875 hooks.setSource(() => scope.get())` |
| 运行时症状 | 在 0.1.2+ 上解构该模块级导出 → `undefined`/`TypeError: … not a function`，插件 host 半 fiber FAILED；compat-guide:10-17 记为 `Failed to load plugins` |
| 检测点代码 | P-gen1（模块导入后 typeof），失败即转 P-gen2/P-gen3 |
| 兜底处方 | 三态分派：P-gen1 → gen-1 骨架；P-gen2 → `installSection`；P-gen3 → `ctx.settings` 声明式（VD-016-017-01） |
| 证据 | VERIFIED：`settingsNamespace` tag 探针 0.1.0-rc.8=34 文件 → 0.1.5-rc.3=2（且那 2 处为无关局部命名，见 `git grep -n` 定位 `packages/api/settings-controller/src/index.ts`:33,:266 与 `ui-settings-models/tests/onboarding-dialog.client.spec.tsx`:70,:119,:248）；快照行号仅作引用坐标 |
| 先例仓 | compat-guide:64-98 ✅新写法（:85-94 typeof 守卫 + register 回退）；:115-130 `settingsNamespace` → 字符串字面量 |

### VD-010-011-03 · 无宿主设置页 → shell.overlay 浮窗兜底（症状：设置项没地方填）

| 字段 | 内容 |
|---|---|
| 变化点 | 0.1.0/0.1.1 壳内无可用的宿主设置页，`settings.*` 槽休眠 |
| 断裂面 | 10 号手册:47-48（老线槽位全集与「settings.* 槽休眠」）、:87-88（§4 兜底：`shell.overlay` 浮窗 + `commandUi`） |
| 运行时症状 | `settings.plugin.item` 注册成功但 UI 无任何呈现；用户看不到表单，插件静默「无设置」 |
| 检测点代码 | 探测宿主是否存在设置页渲染面：`ctx.get('configForms')`/`plugins.*` 席位皆 undefined 即视为无页；**不要靠 DOM 判断线**（见证据栏） |
| 兜底处方 | 自带 `shell.overlay` 浮窗或命令面板入口写值；值仍走当期 waist 注册，保证 host 半可读 |
| 证据 | FARM（**假满足警示**：共享格可能由别的线提供 UI）；tag 级无法证 DOM 渲染与否——`SettingsPage` 字符串全线 0 命中不构成判据，故不升 VERIFIED |
| 先例仓 | 10 号 §4 处方；OLD `ui-settings-plugins/src/client/index.ts`:157-165 证明 gen-2 才有真设置页 |

---

## §2 0.1.1 → 0.1.2

### VD-011-012-01 · 模块级导出被删（症状：`Failed to load plugins`）

| 字段 | 内容 |
|---|---|
| 变化点 | gen1→gen2：`installSettingsSection` 模块级导出删除，改为服务实例方法 `settings.installSection(owner, ns, schema, entry, hooks)` |
| 断裂面 | tag 探针 `installSettingsSection` 11 → **0**（0.1.2-rc.1 起），`installSection` 0 → **15** 同步出现 |
| 运行时症状 | 旧骨架在 0.1.2+ 载入即抛，宿主侧表现为整包 `Failed to load plugins`（compat-guide:10-17 明确点名 0.1.2-alpha.1→alpha.2） |
| 检测点代码 | P-gen1 失败 ∧ P-gen2 成功 → 走 gen-2；两者皆失败 → P-gen3 |
| 兜底处方 | dual-waist 分派（compat-guide:85-94）；一份源码 + 三态探测，而非分线两份码 |
| 证据 | VERIFIED：tag 探针 + OLD `settings/settings/src/index.ts`:472-478 方法签名、:479-495 注册与回退体 |
| 先例仓 | compat-guide:27-59 ❌旧写法 / :64-98 ✅新写法对照 |

### VD-011-012-02 · client 包改名（症状：`Cannot find package '@deepseek-ai/dsh-client-runtime'`）

| 字段 | 内容 |
|---|---|
| 变化点 | `@deepseek-ai/dsh-client-runtime`（≤0.1.1）→ `@deepseek-ai/dsh-client-store`（≥0.1.2） |
| 断裂面 | version-distribution:9-14 包重构表；MAIN tag 探针 `git ls-tree packages/client/`：0.1.0-rc.8 → `runtime` 目录，0.1.2-rc.1/0.1.7-rc.1/0.2.0-rc.2 → `store` |
| 运行时症状 | peer/import 指向旧包名 → 装载期解析失败，client 半永不 apply（无红字，静默） |
| 检测点代码 | 探测 `exports['./client']` 是否存在 + bundle 挂载 id 是否等于 npm 包名（09:105），不靠包名硬判断线 |
| 兜底处方 | peer 段按线窄枚举（INDEX §A）；一份 client 代码经 type-only import 双包名兼容时须两腿证据（见 C 文件 G6） |
| 证据 | VERIFIED：`git ls-tree` 目录名实测；文档口径 version-distribution:9-14 |
| 先例仓 | host-matrix-rollout:5-13 五线矩阵的「关键包名差异」列 |

### VD-011-012-03 · 宿主设置页出现（症状：升级后突然多出表单页）

| 字段 | 内容 |
|---|---|
| 变化点 | 0.1.2 起宿主自带插件管理器/设置页，`settings.plugins.tab` + `settings.plugin.item` 席位激活 |
| 断裂面 | OLD `ui-settings-plugins/src/client/index.ts`:157-165 `ctx.slots.inject('settings.plugins.tab', …)` 内嵌 `children: { 'settings.plugin.item': { kind:'keyed', scope:'root' } }`；:167-192 四张官方卡 `key: SHELL_NS / AGENT_LOOP_NS / SUBAGENT_MODEL_SELECTION_NS / WEB_SEARCH_NS` |
| 运行时症状 | gen-1 时代自带浮窗的插件在 0.1.2+ 出现「双入口」；反之老代码不挂卡则「有页无卡」 |
| 检测点代码 | P-gen2 ∧ 挂卡探测：老线卡 key = **命名空间**（NS），非插件包名 |
| 兜底处方 | ≤0.1.6-alpha.1 用 `key: <ns>`；≥0.1.6-alpha.2 改挂 `plugins.bundle.config`/`plugins.row.config`（entryKey=`<pkg>#<rowId>`） |
| 证据 | VERIFIED（OLD 源码）+ 10 号:49 口径 |
| 先例仓 | 08:271-283 ConfigurablePluginsTab `renderSlot('settings.plugin.item', {}, { entryKey: ns })`；08:288-297 卡片 DOM 与默认 `open=false` |

### VD-011-012-02b · snapshotEvents 面出现（症状：`session.events` 读不到数组）

| 字段 | 内容 |
|---|---|
| 变化点 | 会话快照事件访问器 `snapshotEvents` 自 0.1.2-rc.1 全面存在 |
| 断裂面 | tag 探针：0.1.0-rc.8=**0** → 0.1.2-rc.1=**167** → 0.1.5-rc.3=181 → 0.1.6-alpha.1=200 → alpha.2=204 → 0.1.7-rc.1=209 → 0.2.0-rc.2=211 |
| 运行时症状 | 在 0.1.0/0.1.1 上按数组读会话事件 → `undefined` 遍历崩溃 |
| 检测点代码 | `Array.isArray(session.snapshotEvents) ? session.snapshotEvents : session.events ?? []`（能力探测，不判线） |
| 兜底处方 | 两形并存读取；写侧统一走会话服务提供的方法 |
| 证据 | VERIFIED：tag 探针文件数。**并推翻** version-distribution:84 把该迁移归给 0.1.5 的说法（见未裁决清单 #4） |
| 先例仓 | 09:11-23 三层模型；migration:394 W7 会话格式 V3→V4 属另一断代（VD-016-017-10） |

### VD-011-012-05 · 控制器包 0.1.2 起才存在（症状：老线装不上 API 控制器）

| 字段 | 内容 |
|---|---|
| 变化点 | `dsh-api-session-controller` / `dsh-api-workspace-controller` 自 0.1.2-rc.1 起才进入分发 |
| 断裂面 | INDEX:27 六线全集表；INDEX:29 结论：分包窄枚举若漏掉老线，**老线宿主在闸门处整体拒载**（tidy-display 15/15 绿实证） |
| 运行时症状 | 老线上缺包 → 依赖解析失败；0.1.7+ 上 peer 段不覆盖 → 兼容性闸门直接判不兼容 |
| 检测点代码 | 不适用（属分发元数据，非运行时探测）；用 `dsh plugin list` 与装载日志判断 |
| 兜底处方 | peer 采用全枚举或宽 caret + 精确豁免 `dsh plugin allow-version`（plugin-compatibility.ts:101） |
| 证据 | VERIFIED（INDEX 实测口径）；闸门本体见 VD-016-017-07 |
| 先例仓 | enum-peer-migration 第一批（INDEX §F 批次状态表:67-75） |

---

## §3 0.1.2 → 0.1.5

### VD-012-015-01 · gen-2 内部零断代（症状：0.1.2→0.1.5 迁移无感）

| 字段 | 内容 |
|---|---|
| 变化点 | 0.1.2-rc.1 → 0.1.5-rc.3 之间 settings 面**无 API 断代** |
| 断裂面 | tag 探针三面一致：`installSection` 15↔15、`settingsScope` 40↔40、`settings.plugin.item` 13↔13、`configForms` 0↔0；`git diff --stat`（settings 三包）= 19 files / +43 / −120，无 API 面断代 |
| 运行时症状 | 无 |
| 检测点代码 | 单次 P-gen2 覆盖 0.1.2~0.1.6 全段 |
| 兜底处方 | 合并为一档写 peer（如 `>=0.1.2-rc.1 <0.1.7-rc.1`），避免逐 rc 枚举 |
| 证据 | VERIFIED：tag 探针 + diff 计数 |
| 先例仓 | 10 号:4 六线覆盖声明；INDEX:14-21 §A 七 rc 基线 |

### VD-012-015-02 · installSection base 须已解析配置（症状：`ValidationError: $.provider expected string but got [object Object]`）

| 字段 | 内容 |
|---|---|
| 变化点 | gen-2 `installSection(owner, ns, schema, entry, hooks)` 的 `entry`（base）必须是 **resolveConfig 之后**的值 |
| 断裂面 | OLD `settings/settings/src/index.ts`:472-482（`const scope = this.register(ns, schema, { base: entry, … })`）；10 号:55 §3.1 |
| 运行时症状 | 直接把未解析的 Config schema/对象当 base 传入 → 校验期 `[object Object]` 类错误，host 半 fiber FAILED |
| 检测点代码 | `const base = typeof ctx.resolveConfig === 'function' ? ctx.resolveConfig(raw) : raw`；或在 `ctx.effect` 内取已生效值 |
| 兜底处方 | base 只填字面默认值；派生值经 `hooks.setSource` 注入 |
| 证据 | VERIFIED（OLD 源码）+ 10 号:55 实测错误文案 |
| 先例仓 | 10 号:58 §3.2 出口解包同族陷阱 |

### VD-012-015-03 · 设置卡派发三条件交集（症状：卡片注册了但不出现）

| 字段 | 内容 |
|---|---|
| 变化点 | 卡的可见性 = 三条件交集（席位注册 ∧ entry 命中 ∧ view/form 就绪），缺一即静默不渲染 |
| 断裂面 | 10 号:67 §3.5；OLD `ui-settings-plugins/src/client/index.ts`:157-192（官方四卡的 keyed 派发） |
| 运行时症状 | 无报错、无占位，「设置里找不到」；用户以为功能丢失 |
| 检测点代码 | 用 entryKey/`key` 对账：老线 `entryKey = ns`；先确认 P-gen2 再确认卡 key 拼写 |
| 兜底处方 | key 与注册 ns 逐字一致；注册期在 apply 期（12 号:52「inject 必须 apply 期注册」） |
| 证据 | VERIFIED（OLD 源码）+ 10 号 FARM 实测 |
| 先例仓 | 08:271-283、08:288-297（DOM 结构与默认折叠） |

### VD-012-015-04 · sub-inject settingsScope 永不 resolve（症状：client 半整段不执行）

| 字段 | 内容 |
|---|---|
| 变化点 | ≤0.1.5（含 gen-2 全段）在 client bundle 的子级 `ctx.inject(['settingsScope'])` 中嵌套注入**永不 resolve** |
| 断裂面 | 11 号 A2:15-19；`settingsScope` tag 探针 40 文件 @0.1.0-rc.8~0.1.6-alpha.2 → **0** @0.1.7-rc.1 |
| 运行时症状 | 无异常、无日志，`inject` 回调永不执行 → UI 完全缺失但插件显示「已启用」 |
| 检测点代码 | `ctx.get('settingsScope')` 单次软读；缺服务时 `const s = ctx.get('settingsScope')` 判空而非嵌套 inject（10 号:61 §3.3「插件级 inject 缺服务 = 整段 apply 静默死」） |
| 兜底处方 | 顶层只 inject 必然存在的服务；可选服务一律 `ctx.get(name)`；跨线改用 `configForms`（VD-016-017-03） |
| 证据 | VERIFIED：`check-017-compat.ps1` D11 HARD 规则 `:145-148`（`inject\s*[:=]\s*\[[^\]]*settingsScope` 判「client apply NEVER runs」）+ 探针 40→0 |
| 先例仓 | migration:446「比 Tier2 更严重：依赖门禁 → client 半永不 apply」；migration:452-457 六仓硬注入行号表 |

### VD-012-015-05 · stale-build / npm pack 只触发 prepack（症状：改了码发出去还是旧行为）

| 字段 | 内容 |
|---|---|
| 变化点 | 发布链路：`npm pack`/`npm publish` **只跑 `prepack`，不跑 `prepublishOnly`** → lib 陈旧产物被打包 |
| 断裂面 | 11 号 A1:9-13；10 号:196（§10 实测）、:200-201（prepack 注入 + V6 闸）、:190（dsh-settings@0.1.5 `lib/index.js`:327-343 setSource 同步调用的冤案本体） |
| 运行时症状 | 版本号已升、源码已改，装到 farm 上仍复现旧 bug；排查方向被误导为「宿主行为断代」 |
| 检测点代码 | 不适用；靠构建产物对账 |
| 兜底处方 | 三防线：① `prepack` 内强制 build ② V6a/V6b（tgz↔仓 lib 逐字节 + src mtime ≤ lib mtime+5000ms）③ browser-probe 部署产物点击穿越（10 号:202） |
| 证据 | VERIFIED（脚本判据 `verify-package.mjs`:102-131 已实现）+ 10 号 §10 事故 FARM 实测 |
| 先例仓 | mine-dsh-plugins `_tools/verify-package.mjs`；10 号:203「孤儿 lock」 |

---

## §4 0.1.5 → 0.1.6

### VD-015-016-01 · 0.1.6 非单一体（症状：按「0.1.6」写 range 打不中）

| 字段 | 内容 |
|---|---|
| 变化点 | 0.1.6 线只有 `0.1.6-alpha.1` 与 `0.1.6-alpha.2` 两个 tag，**无 rc**；且两 alpha 之间存在断代 |
| 断裂面 | MAIN tag 实测（`git tag -l`：… 0.1.5-rc.1/2/3、**0.1.6-alpha.1/alpha.2**、0.1.7-alpha.1/2、0.1.7-rc.1/2 …）；INDEX:27 六线全集口径 |
| 运行时症状 | 写 `^0.1.6` 或 `>=0.1.6-rc.1` 之类 range → 对 alpha 线不命中；按「0.1.6 = 一代」写的探测分支错位 |
| 检测点代码 | 运行时不得读版本；分发元数据侧用**具体 tag 枚举**（INDEX §A） |
| 兜底处方 | 0.1.6 段拆成 alpha.1 / alpha.2 两个能力档；09 号批次若只测一个 0.1.6 格，结论不得外推 |
| 证据 | VERIFIED：`git tag -l` 直读 |
| 先例仓 | INDEX:14-21 §A 七 rc 基线 + `developmentHost` |

### VD-015-016-02 · plugin-manager 卡面在 alpha.2 诞生（症状：`plugins.row.config` 未知席位）

| 字段 | 内容 |
|---|---|
| 变化点 | `plugins.bundle.config` / `plugins.row.config` / `data-plugin-config` 均在 **0.1.6-alpha.2** 出现，不在 0.1.7 |
| 断裂面 | tag 探针：`plugins.row.config` 0.1.5-rc.3=0 / 0.1.6-alpha.1=0 / **0.1.6-alpha.2=12** / 0.1.7-rc.1=10 / 0.2.0-rc.2=10；`data-plugin-config` 0→**2**（同一 alpha.2）；`plugins.detail.section` 直到 0.1.7-rc.1 才 =8（alpha.2 仍 0） |
| 运行时症状 | 在 alpha.1 上挂 `plugins.row.config` → 未知席位静默不渲染（09:106/:218「槽位改名静默失效」） |
| 检测点代码 | 注册前后对账 `ctx.slots` 已知席位；不可用「0.1.6」整体判断 |
| 兜底处方 | 双挂策略：老 key `settings.plugin.item`(keyed) + 新 `plugins.row.config`，由宿主择一渲染 |
| 证据 | VERIFIED：tag 探针文件数。**注意**与 migration §7.2 表口径不同（见未裁决清单 #5/#6） |
| 先例仓 | AUX `ui-plugin-manager/src/client/slot-contract.ts`:94/:102/:108/:113/:120 五面定义 |

### VD-015-016-03 · settings.plugin.item 塌缩（症状：老 keyed 卡 seat 突然没人认领）

| 字段 | 内容 |
|---|---|
| 变化点 | keyed 席位 `settings.plugin.item` 的**认领方**从 13 文件塌缩到 1 处注释，发生于 **0.1.6-alpha.2** |
| 断裂面 | tag 探针 `settings.plugin.item`：0.1.0-rc.8=11 / 0.1.2-rc.1..0.1.6-alpha.1=13 / **0.1.6-alpha.2=1** / 0.1.7-rc.1=1 / 0.2.0-rc.2=1 |
| 运行时症状 | 插件继续 `slots.inject('settings.plugin.item', …)` → 无宿主 renderSlot，卡消失且无报错 |
| 检测点代码 | 见 VD-016-017-04 的 D2 闸（`slots.inject\(\s*('settings\.plugin\.item'…)` 首参匹配） |
| 兜底处方 | ≥0.1.6-alpha.2 改挂 `plugins.bundle.config`/`plugins.row.config`；跨该边界发布须双挂 |
| 证据 | VERIFIED：tag 探针。文档口径记为「0.1.7 移除」（migration §7.2 表计数 12/12/1，本次探针 13/13/1）→ 断代点差一档、计数差属扫描口径，见未裁决清单 #6 |
| 先例仓 | migration:541（试点实证：必须补挂新面）；08:271-283 老线 renderSlot 侧 |

### VD-015-016-04 · volatile 在 0.1.6 全无（症状：设置页改动不热生效）

| 字段 | 内容 |
|---|---|
| 变化点 | `.volatile()` 直到 0.1.7-rc.1 才存在；0.1.5/0.1.6（含两 alpha）vendor 内**零实现** |
| 断裂面 | tag 探针 `prototype.volatile`（vendor）：0.1.0-rc.8…0.1.6-alpha.2=**0** → 0.1.7-rc.1=**1**；AUX `vendor/schemastery/src/index.ts`:480-483 `Schema.prototype.volatile = function volatile() { if (this.meta.volatile) throw new TypeError('volatile schema is already wrapped'); return this.extra('volatile', true) }` |
| 运行时症状 | 无条件链式 `.volatile()` 在 0.1.6 上模块求值期 `TypeError: … .volatile is not a function` → fiber FAILED（migration:147） |
| 检测点代码 | P-vol：`typeof field.volatile === 'function' ? field.volatile.call(field) : field`（migration:542 已实测**可单 bundle 跨 0.1.5~0.2.0**） |
| 兜底处方 | 一律 feature-detect，禁止无条件链式；0.1.6 侧接受「改值需重启」 |
| 证据 | VERIFIED（源码级：探针 + AUX 定义）；「0.1.6 装机调用即抛」半边保留文档原断言，运行时表现 **PENDING**（无装机证据） |
| 先例仓 | 定谳事实 3；09:116（volatile 必须 typeof 探测）；migration:141-145（0/0/18 表）、:151-153 方案 A/B/C |

### VD-015-016-05 · settings.register() 服务方法三代皆不存在（症状：`sctx.settings.register is not a function`）

| 字段 | 内容 |
|---|---|
| 变化点 | 文档/模板中「`settings.register()` 作为服务方法」的写法**从未存在**，三代统一无效 |
| 断裂面 | OLD `settings/settings/src/index.ts`:445 —— 该字符串实为**错误/释放标签模板** `` `settings.register(${JSON.stringify(String(parsedNs))})` ``；:472 才是真方法 `installSection` 定义。tag 探针 `installSection` @0.1.7-rc.1/0.2.0-rc.2=**0**（三代注册面全删） |
| 运行时症状 | 按 compat-guide:29-30「0.1.0/0.1.1 register ✅ 存在」写出的代码在真机上抛 |
| 检测点代码 | 只认三代真面：P-gen1 / P-gen2 / P-gen3，不给 register 留分支 |
| 兜底处方 | 见 D 台账：compat-guide dual-API 表标 SUPERSEDED；模板回改以 migration:321 指出的 `dsh-docs-deliverables/plugin-framework/dsh-plugin-template/src/client/index.ts:155` 为首个改动点 |
| 证据 | VERIFIED：定谳事实 2 + OLD 源码复核 |
| 先例仓 | compat-guide:27-36（误）、migration:29（正） |

### VD-015-016-06 · arrowkey 会话断点删于单提交（症状：老代码的 sessions.open 不见了）

| 字段 | 内容 |
|---|---|
| 变化点 | `sessions.open` / `list.current` 类断点删除发生在 **0.1.6-alpha.1 → alpha.2 单提交 `6830e1460d`** |
| 断裂面 | 09:236（arrowkey 断点定位） |
| 运行时症状 | 依赖旧事件/旧方法的插件在 alpha.2 上静默失效（事件名不在 `declare module Events` 中即无发布方） |
| 检测点代码 | `ctx.eventNames?.includes?.(...)` 不可用；改为「订阅后观察是否真被触发」的探针包法，或读当期 `Events` 声明 |
| 兜底处方 | 事件面迁移逐条列账（migration:437-439：事件 53→56，+3/−0）；不把 0.1.6 当单点 |
| 证据 | PENDING（提交号来自文档口径，未在本次三基线内独立复现 diff） |
| 先例仓 | 09 §arrowkey；migration §7.7 三面 diff |

---

## §5 0.1.6 → 0.1.7

### VD-016-017-01 · installSection 全删 → SettingsForms 声明式（症状：`ctx.settings.installSection is not a function`）

| 字段 | 内容 |
|---|---|
| 变化点 | gen2→gen3：命令式注册全删，改 `ctx.settings`=`SettingsForms` 声明式（Config + 自动页） |
| 断裂面 | AUX `settings/settings/src/index.ts`:222-224 `export class SettingsForms extends Service` / `static inject = ['configEditor','profileContext']`、:231 `super(ownerContext, 'settings')`；tag 探针 `installSection` 16 → **0**、`settingsScope` 40 → **0**、`configForms` 0 → **67** |
| 运行时症状 | 老骨架在 0.1.7 上抛；`SettingsForms` 成员为 configure/prepareDocument/describe/update/replace/mutate（migration:62-67），无 installSection |
| 检测点代码 | P-gen3：`typeof ctx.settings.configure === 'function'`；ns 语义变化见 VD-016-017-05 |
| 兜底处方 | 三代分派单文件；`configure({ auto: false }, fiber)` **只关自动页**，不是「退回老注册」（MAIN `product-analytics/src/index.ts`:38） |
| 证据 | VERIFIED：AUX 源码 + tag 探针 |
| 先例仓 | migration:81-121 四步公式；10 号:24-41 三代骨架代码 |

### VD-016-017-02 · settingsScope 删除 → client 半整块不 apply（症状：UI 全无但插件已启用）

| 字段 | 内容 |
|---|---|
| 变化点 | 服务 `settingsScope` 被移除；仍硬 inject 它的插件其 client bundle **永不 apply** |
| 断裂面 | tag 探针 40 → 0；`check-017-compat.ps1` D11 `:145-148` HARD（`inject` 内含 settingsScope）；migration:444「settingsScope 40/40/0」 |
| 运行时症状 | 无任何报错（cordis 缺服务即不执行），比 fiber FAILED 更难发现 |
| 检测点代码 | 静态：D11 HARD grep；运行时：`ctx.get('settingsScope') !== undefined` 软读 |
| 兜底处方 | 硬 inject → 软读；两腿证据（type-import 宿主包 + `ctx.get` 服务面），见 C 文件 G6 |
| 证据 | VERIFIED |
| 先例仓 | migration:452-457 六仓硬注入行号表、:459 三例软读；11 号 A2 |

### VD-016-017-03 · configForms 新服务面（症状：0.1.7 上找不到绑定入口）

| 字段 | 内容 |
|---|---|
| 变化点 | 新 seam `configForms` 提供 `get(entryId)` / `describe()` / `whileServed`；bind 面成员同名迁移 |
| 断裂面 | AUX `client/ui-settings/src/client/config-form.ts`:241 `export class ConfigForms extends Service`、:266 `super(ctx, 'configForms')`；tag 探针 0 → 67 @0.1.7-rc.1 → 75 @0.2.0-rc.2 |
| 运行时症状 | 老 `ctx.settingsScope.bind(...)` 在 0.1.7 无挂载方 → 静默不执行（D11 CALL 规则 `:155-160` 专捕此写法） |
| 检测点代码 | `const cf = ctx.get('configForms'); if (cf) cf.get(entryId)…` |
| 兜底处方 | 迁移公式 migration:485-489；`describe().form` 三条件（fiber state 2 + 导出 Config + 含 volatile 字段，migration:544） |
| 证据 | VERIFIED：AUX 源码 + 探针 |
| 先例仓 | migration:463-469 configForms 提供方与 API；09:119 configForms 槽 |

### VD-016-017-04 · plugins.item 仅官方卡片头（症状：第三方挂 plugins.item 无效果）

| 字段 | 内容 |
|---|---|
| 变化点 | `plugins.item` 是 **list** 且已被官方设置页占用，只作卡片头；配置内容必须走 `.bundle.config`/`.row.config` |
| 断裂面 | AUX `ui-plugin-manager/src/client/slot-contract.ts`:80-88 `'plugins.item': { kind:'list', … }` + 原文注释「OCCUPIED by the official settings pages… belongs in `plugins.bundle.config` or `plugins.row.config` instead」；:78 `'plugins.bundle.activation': { kind:'keyed', scope:'root', owner: … }` |
| 运行时症状 | 注册成功、页面空白（死代码），或卡片头重复 |
| 检测点代码 | 静态闸 D2 `check-017-compat.ps1:62-73`：`regPat = slots\.inject\(\s*('settings\.plugin\.item'|…|CARD_SEAT)\s*[,)]`（首参限定，:63-64 说明不误计 SETTINGS_SEAT） |
| 兜底处方 | 第三方卡一律 `plugins.row.config`（key=`<pkg name>#<row id>`，AUX :473/:491/:495）或 `plugins.bundle.config`（仅 `view:'page'`，:94） |
| 证据 | VERIFIED：AUX slot-contract + PluginManagerPage 源码 |
| 先例仓 | migration:541 试点实证；10 号:49 |

### VD-016-017-05 · namespace → entryId + settings.yaml 键名重映射（症状：老设置值「丢了」/只生效一次）

| 字段 | 内容 |
|---|---|
| 变化点 | ① bind/Config 键名 `namespace` → `entryId`；② `settings.yaml` 旧 section 键经**一次性导入器**重映射；③ ns 语义变为 active profile entry 的 local id |
| 断裂面 | AUX `settings/settings/src/index.ts`:200-206 `LEGACY_SECTION_ENTRIES`（'ui-developer-tools'→'ui-settings'、'ui-onboarding'→'ui-settings-general'、shell→win32?'pwsh-sandbox':'bash-sandbox'）、:235 `loader.await().then(() => importLegacyDocument())`、:244 `existsSync(path)` 否则 return、:246 `await rename(path, imported)`、:249 `const ns = LEGACY_SECTION_ENTRIES[section] ?? section`、:251 `await this.update(ns, values)`、:253 `logger.warn('settings: section %s of %s was not imported into entry %s')`；migration:492 |
| 运行时症状 | 升级后首启值被搬走（原文件被 rename），第二次不再跑 → 「老值在、新值不生效」或「值丢失」的假象；键名对不上 → 表单空白 |
| 检测点代码 | 读值一律经当期 bind 面（`describe()` 拿 entryId），不要按老 ns 直读 settings.yaml |
| 兜底处方 | 迁移映射表 migration:266-271（已核实键名）；未映射 section 靠 :253 warn 定位；路径 A/B 见 migration:277-287 |
| 证据 | VERIFIED：AUX 源码逐行 + migration:242-244/:266-271 |
| 先例仓 | migration §3 四步公式 :81-121；:201-206 导入器三条硬事实 |

### VD-016-017-06 · volatile 独有 + loader/volatile-update（症状：改值后不热更新）

| 字段 | 内容 |
|---|---|
| 变化点 | 第 3 代独有：Config 字段 `.volatile()` + 事件 `loader/volatile-update` 携带变更 paths |
| 断裂面 | AUX `vendor/schemastery/src/index.ts`:480-483（定义）、:488 `validateVolatileSchema(...)`、:494 `throw new ValidationError('volatile fields require a fixed object path without an enclosing volatile field', { path })`；MAIN `vendor/loader/src/index.ts`:30-34 `'loader/volatile-update'(paths: readonly (readonly string[])[])` @mode emit；MAIN 实产命中：`web-search-deepseek/src/index.ts`:66-77 七字段（:67 `apiKey … role('secret').volatile()`、:68 `role('credential-ref')`、:72-76 baseURL/model/apiVersion/maxTokens/maxUses）、`product-analytics/src/index.ts`:30 `enabled … .volatile()` 与 :37 `ctx.on('loader/volatile-update', …)` |
| 运行时症状 | 0.1.6 及以下：`.volatile()` 不存在（VD-015-016-04）；0.1.7+ 若嵌套 volatile → ValidationError（:494） |
| 检测点代码 | P-vol + 事件名存在性（`loader/volatile-update` 只在 gen3 声明中） |
| 兜底处方 | schemastery 版本约束 `>=3.18.2`、嵌套用 `^3.18.4`（10 号:80 §3.7）；订阅事件而非轮询 |
| 证据 | VERIFIED：定谳事实 3 的三处 MAIN 命中 + AUX vendor 定义 |
| 先例仓 | 09:156（preset-manager volatile 断点）、09:116 |

### VD-016-017-08 · 兼容性闸门诞生：只读 peer（症状：`incompatible with this host`）

| 字段 | 内容 |
|---|---|
| 变化点 | 0.1.7-rc.1 起新增 `evaluatePluginCompatibility`：peer-only + `includePrerelease` + 可精确豁免 |
| 断裂面 | MAIN `packages/boot/app-boot/src/plugin-compatibility.ts`:61-88（AUX 同行号命中）：:68 无 `peerDependencies` → `return undefined`（**零校验**）、:72-73 range 非 string → throw、:75 只匹配 `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*`、:76 `workspace:`/`^`/`~`/`*` → runtimeVersion、:77 `semver.satisfies(runtimeVersion, requirement, { includePrerelease: true })`、:81-86 豁免键 `name@version` + runtime 数组、:96-103 告警文案含 :101 `dsh plugin allow-version`；同文件 AUX `README.md`:52 明文「These checks use peer declarations, not `engines.dsh`」 |
| 运行时症状 | peer 不覆盖当前 runtime → 插件被拒载并打出 incompatible 告警；**不读 engines.dsh、不读 dsh.plugin.json、不读 dependencies** |
| 检测点代码 | 无运行时探针——唯一开关是放宽 peer range；临时豁免用 `dsh plugin allow-version <name>@<ver> <runtime>` |
| 兜底处方 | 见 VD-017-020-04/05（上界 semver、窄枚举拒载）；双清单/engines 漂移只算元数据卫生（P2） |
| 证据 | VERIFIED：定谳事实 1 + 两基线同锚复核；tag 探针 `evaluatePluginCompatibility` 0 @≤0.1.6-alpha.2 → 7 @0.1.7-rc.1，`allow-version` 0 → 4 |
| 先例仓 | migration:415（无 peerDependencies 时早退 → 零校验零告警）、:417（engines.dsh 全宿主零读取方） |

### VD-016-017-09 · locale 宿主读取诞生 + 9 语取代四语（症状：只有英文标题/整个 locale 目录被忽略）

| 字段 | 内容 |
|---|---|
| 变化点 | ① 宿主开始读取插件 `locale/<lang>.json`（`en.json` 为锚）；② 规范从四语升为 **9 语** |
| 断裂面 | MAIN `packages/boot/app-boot/src/package-meta.ts`:148-155 `readPluginMeta`（:151 `${specifier}/locale/en.json`；:152 `englishPath === undefined` → 空 Map，即**缺 en.json 则整个 locale/ 被忽略**）、:101-122 `dictionariesOf`（:104 只收 `.json`、:107 LANGUAGE_ID 校验、:109 重复语言 throw、:111-112 必须同目录、:117-118 `meta.title`/`meta.description`）、:124-133 `localizedText`；tag 探针 `locale/en.json`（boot）0 → 2 |
| 运行时症状 | 缺 en.json → 卡名/描述回落包名；`exports` 未映射 `./locale/*.json` → ESM 解析失败、语言包读不到；家族页缺 inject `'locale'` → "1 entry did not activate"（10 号:64 §3.4） |
| 检测点代码 | 静态闸 D10 `check-017-compat.ps1:125-143`（patch=array / locale meta.title / exports `./locale/*.json`） |
| 兜底处方 | 单次 `locale.register(NS, dictionaries)` 激活全语（_locale_rollout_spec:9-11、:50-63）；TARGET LANGUAGES (9) = zh,en(base)+ja,ko,fr,de,it,ru,es（:20-21）；九语文件见 :68-75 |
| 证据 | VERIFIED：MAIN 源码 + 探针；规范来源 `_locale_rollout_spec.md`（**取代** file-structure:32-33/:71-72 的四语） |
| 先例仓 | 定谳事实 4；11 号 A6 伴生 locale 契约 |

### VD-016-017-10 · 会话格式 V3 → V4（症状：老会话打不开/字段读空）

| 字段 | 内容 |
|---|---|
| 变化点 | session.jsonl 格式 V3→V4，且存在 14 处直读点 |
| 断裂面 | migration:394 W7；`check-017-compat.ps1` D7 `:121-122` `session\.jsonl|SESSION_FORMAT_VERSION|sessionFormatVersion` → expect 0 |
| 运行时症状 | 插件直读磁盘会话文件在新宿主上字段错位/解析失败 |
| 检测点代码 | 不提供跨线探测；处方为**禁止直读**，改用会话服务面 |
| 兜底处方 | D7 静态清零；确需历史数据走宿主导出 |
| 证据 | PENDING（判据与直读点计数来自文档口径，本次未逐处复核 14 个行号） |
| 先例仓 | migration §7.2 跨版本约束表 :341-347 |

### VD-016-017-11 · codeRuntime → ptcRuntime 及三项清理（症状：inject 的服务名查无此物）

| 字段 | 内容 |
|---|---|
| 变化点 | 服务/事件改名与移除：`codeRuntime`→`ptcRuntime`；`patchReload`、`cordis-plugin-hmr`、`agent-team-web-profile` 清零 |
| 断裂面 | migration:437-439（服务 seam 97→115，+20/−2，其中 −2 = `settingsScope`+`codeRuntime`）、:505-508 面 E；`check-017-compat.ps1` D5 `:105-106`、D6 `:109-110`、D8 `:117-118`（均 expect 0） |
| 运行时症状 | 硬 inject 已改名服务 → 与 settingsScope 同型：整段 apply 静默不执行 |
| 检测点代码 | 静态 D5/D6/D8；运行时改软读 `ctx.get('ptcRuntime') ?? ctx.get('codeRuntime')` |
| 兜底处方 | 可选服务一律 `ctx.get(name)`；D11 SOFT 规则 `:150-154` 捕 `ctx.get(` 用法作对照 |
| 证据 | VERIFIED（D5-D8 判据已实现）；改名后服务面的成员等价性 PENDING |
| 先例仓 | 11 号 B1:112-115 / B2:117-120 / B3:122-125 |

---

## §6 0.1.7 → 0.2.0

### VD-017-020-01 · 设置面零 diff（症状：为 0.2.0 另写一套适配）

| 字段 | 内容 |
|---|---|
| 变化点 | 0.2.0-rc.2 的设置面与 0.1.7-rc.2 **逐字节相同**（试点实证） |
| 断裂面 | migration:540（✅2026-10-01 实证，`_artifacts/dual5-shots/verdicts.md`）；tag 探针对照：`installSection` 0↔0、`settingsScope` 0↔0、gate 7↔7、detail 8↔8、rowcfg 10↔10、dpc 2↔2、card 1↔1、loc 2↔2；仅 `configForms` 67→75（消费点增加，无断代） |
| 运行时症状 | 无。为 rc.2 新写分支属**多余适配** |
| 检测点代码 | 不需新探测；沿用 P-gen3/P-vol/P-scope |
| 兜底处方 | 0.1.7 与 0.2.0 共用同一份适配代码；rc.1→rc.2 差异仅在 Desktop profile 插件管理（见 VD-017-020-07） |
| 证据 | VERIFIED（探针）+ FARM（双 5 截图实证） |
| 先例仓 | migration:538-549 未核实项清单 |

### VD-017-020-02 · 自动表单页不成立（症状：导出 Config 却没有设置页）

| 字段 | 内容 |
|---|---|
| 变化点 | 「声明 Config 后表单自动出现」在 0.2.0-rc.2 web UI **不成立**；`autoGenerate`/`configure({auto})` 无消费点 |
| 断裂面 | migration:541（试点实证）；必须补挂 `plugins.bundle.config`/`plugins.row.config`；AUX `PluginManagerPage.tsx`:449/:494 `<section … data-plugin-config>` / `<div … data-plugin-config>` 即挂载位；:446 `plugins.item view:'summary' {only:item.id}`、:450 `plugins.item view:'page' form`、:491/:495 `plugins.row.config`（view summary/page + `{entryKey:key}`）、:482 `plugins.detail.actions`、:496 `plugins.detail.section` |
| 运行时症状 | 只有卡片头、无表单区；用户报「设置页空白」 |
| 检测点代码 | 挂卡后运行时对账 entryKey：`plugins.row.config` 的 key = `<package name>#<row id>`（AUX :473 `rowConfigKey(pkg.name, row.rowId)`） |
| 兜底处方 | **entry id ≠ 包名时（如 tidy-display）`formFor` 永不命中，卡必须自绑 entry id**（migration:544） |
| 证据 | VERIFIED（AUX 源码）+ FARM（dual5 实证） |
| 先例仓 | migration:541/:544；VD-016-017-04 |

### VD-017-020-03 · hooks → use<Tab> 转换三代皆然（症状：props 里拿不到 hooks 对象）

| 字段 | 内容 |
|---|---|
| 变化点 | **变化点=无**（防误判断代）：ui-slots 一直把 `hooks` 源名转成 `use<Name>` prop 并剥掉 `hooks` 键 |
| 断裂面 | MAIN `packages/client/ui-slots/src/renderer.ts`:42-44 `export function standardHookPropName(name: string): string { return \`use${name[0]?.toUpperCase() ?? ''}${name.slice(1)}\` }`；`ui-slots/src/index.ts`:557-560 `PropsSlotHooks<HS>`、:563-564 `SlotInjectFace<I> = I extends { hooks: infer HS } ? Omit<I,'hooks'> & PropsSlotHooks<HS> : I`、:584-591 `InjectFace`（`Omit<I,'hooks'|'keyedHooks'> & …`）。文档所称 `bindInjectHooks` 在 MAIN/AUX `packages/` **全量 0 命中** |
| 运行时症状 | 组件写 `props.tabs.forEach(...)` → undefined；须写 `useTabs()` |
| 检测点代码 | 类型层判据：`SlotInjectFace` / `InjectFace` 的 `Omit<…,'hooks'>`；运行期直接按 `use*` 命名取 prop |
| 兜底处方 | 12 号契约 §机制铁律 :52-56（apply 期注册、裸 register 的 `entry.inject` 在 ≤0.1.5 不解 EMPTY_INJECTED_PROPS、inject 回调收 `(ctx, config)`、children 冲突降级） |
| 证据 | VERIFIED（真实锚点）；**命名** `bindInjectHooks` 无法核验，列未裁决清单 #9 |
| 先例仓 | 11 号 A6:53-56（:55 原述）、12 号:24/:54；10 号:120 §8 族面只在 0.1.7-rc.1+ |

### VD-017-020-04 · `<0.2.0-0` 上界 semver 拒 rc（症状：range 写着对，装不上）

| 字段 | 内容 |
|---|---|
| 变化点 | 上界 `<0.2.0-0` 与 caret+prerelease 写法会**漏掉 rc 线**（宿主 runtime 本身就是 `0.2.0-rc.2`） |
| 断裂面 | INDEX:31-39 §B semver 三结论（caret+rc 漏 0.1.7 线）；09:49-55 §1.2 semver 表；闸门用 `includePrerelease:true` 判定（MAIN plugin-compatibility.ts:77） |
| 运行时症状 | 闸门判 incompatible → 拒载告警（:98），或 farm 上 15rc 全绿但真实线打不中 |
| 检测点代码 | 不适用（纯 range 语义）；用「逐线装载试装」代替推理 |
| 兜底处方 | 显式枚举各线具体 tag（INDEX §A），或放宽为上界含 `-0` 之外的等价写法；临时用 `dsh plugin allow-version`（:101） |
| 证据 | PENDING（本地三基线 node_modules 均无 `semver` 包，无法自证 satisfies 行为；结论仅引文档实测） |
| 先例仓 | INDEX §B；09 §1.2 |

### VD-017-020-05 · 分包窄枚举致老线整体拒载（症状：一个 peer 漏写，老线全插件失效）

| 字段 | 内容 |
|---|---|
| 变化点 | peer 若只枚举新线包，老线宿主在闸门处**整体拒载**（而非局部降级） |
| 断裂面 | INDEX:29（tidy-display 15/15 绿实证）；plugin-compatibility.ts:69-77 逐 peer 校验、:72 range 非 string 直接 throw、:81 无匹配 peer 项则返回 undefined |
| 运行时症状 | 老线上全部插件被拒（用户视角=宿主坏了），无细粒度原因 |
| 检测点代码 | 不适用；靠闸门日志 + `dsh plugin list` |
| 兜底处方 | peers **全枚举**且每项都要有 peerDependenciesMeta 背书（V3，`verify-package.mjs:62-67`）；D4（`:94-102`）确认 peers 是唯一强制字段、engines 仅展示 |
| 证据 | VERIFIED（闸门源码）+ FARM（15/15 实测）；引用 farm 数字时带**假满足警示** |
| 先例仓 | INDEX §A/§G 六修正（:86 tidy-display peers 实为 14 项） |

### VD-017-020-06 · inject 空数组 = 不编组（症状：包已装但 client 从不加载）【两说并存】

| 字段 | 内容 |
|---|---|
| 变化点 | 文档口径：`dsh.client.inject: []` 视为不编组；源码复核：0.2.0 未见「非空才编组」判据 |
| 断裂面 | 支持侧：10 号:169-179 §9、11 号 A5:35-39、`verify-package.mjs` V2 `:61`（inject 非空断言）。反对侧：MAIN `client/modules/src/client/manifest.ts`:161-181（:170 `optionalStringArray`，:177 仅 `!== undefined` 透传，空数组保留）、`index.ts`:841-851（入表只看 `platform==='web'` + `./client` 导出，:851 原样带上 inject）、`compose()`:758-768（**无 inject 非空过滤**）；仅 `test-support/roster.ts:39`、`modules/tests/loader.client.spec.ts:139` 出现 `inject.length > 0` |
| 运行时症状 | 若口径为真：忘写 inject 数组 → client bundle 不加载（无报错）；若口径为假：V2 拦截的是「作者意图漏写」而非运行时行为 |
| 检测点代码 | 运行时不可探测；静态一律用 V2/D10 拦 |
| 兜底处方 | 保留 V2 为**高危（非 runtime 阻断）**闸；发布前 browser-probe 点击穿越确认 bundle 是否真加载 |
| 证据 | PENDING（FARM 实测与源码判据并存，未裁决；见未裁决清单 #3） |
| 先例仓 | 10 号 §9 悬案；11 号 A5 |

### VD-017-020-07 · rc.1 → rc.2 的 Desktop profile 差异（症状：桌面端插件管理行为变了）

| 字段 | 内容 |
|---|---|
| 变化点 | 0.1.7-rc.1 → 0.2.0-rc.2 的**唯一**已记差异集中在 Desktop profile 的插件管理 |
| 断裂面 | migration:540（其余设置面逐字节相同） |
| 运行时症状 | 同一份插件在 rc.1 桌面 profile 与 rc.2 表现不一致（装卸/可见性），Web 面无感 |
| 检测点代码 | 不适用；分端冒烟（web / desktop 两条 UI 路径） |
| 兜底处方 | 桌面端单列冒烟项；不要把桌面端差异写成「跨线 API 断代」 |
| 证据 | FARM（dual5 实证；**假满足警示**适用） |
| 先例仓 | migration:540-541；10 号:131 browser-cdp 分线分版本 |

### VD-017-020-08 · data-plugin-config 非 0.2.0 独有（症状：文档说没有，DOM 里却有）【推翻文档】

| 字段 | 内容 |
|---|---|
| 变化点 | 10 号手册:50 称 `data-plugin-config` 为 0.2.0 独有、0.1.7 没有 —— **被源码推翻** |
| 断裂面 | AUX(0.1.7-rc.2) `PluginManagerPage.tsx`:449 `<section className={css.detailSection} data-plugin-config>`、:494 `<div className={css.detailSections} data-plugin-config>`；tag 探针 `data-plugin-config` 0 @≤0.1.6-alpha.1 → **2** @0.1.6-alpha.2 起（含 0.1.7-rc.1、0.2.0-rc.2） |
| 运行时症状 | 若信文档，会为 0.2.0 另写 DOM 锚点分支；实际 0.1.7 上同一选择器已可用 |
| 检测点代码 | `document.querySelector('[data-plugin-config]') !== null`（DOM 锚点探测，不判线）；08:190-196 DOM data-* 锚点表 |
| 兜底处方 | 以 0.1.6-alpha.2 为真实边界改写锚点可用范围；D 台账把 10 号:50 标 SUPERSEDED |
| 证据 | VERIFIED：AUX 源码行号 + tag 探针双证 |
| 先例仓 | 未裁决清单 #1 |

---

## §7 0.2.0 → 0.2.1（含线内 alpha.1..5 / rc.1 断代；逐段全量细节见 `<ws>/mine-dsh-plugins/dsh-docs-deliverables/source-analysis/v0.2.1-*`）

### VD-020-021-01 · 兼容性闸门换代（症状：0.2.1-alpha.4+ 装了带 `engines.dsh` 的包被拒载 / 读 `peers` 字段拿不到）

| 字段 | 内容 |
|---|---|
| 变化点 | **闸门存在时代切换**：≤0.2.1-alpha.3（含 0.1.7～0.2.0）纯 peer 判定；**≥0.2.1-alpha.4 起 `engines.dsh` 单独裁决**（peers 被忽略），无该键才回落 peer 规则 |
| 断裂面 | `packages/boot/app-boot/src/plugin-compatibility.ts`@a.3→a.4 的 +43/−29：新增 `unmetRequirements()`；`PluginCompatibility.peers`→**`requirements`**（`IncompatiblePlugin` 同步）；`workspace:` 仅 peers 合法（engines.dsh 内判不兼容）；`engines` 非对象/`engines.dsh` 非字符串 → manifest 不可读**拒载**。官方指南 `docs/upgrade-guide/v0.2.1-alpha.3/plugin-engines-dsh/` |
| 运行时症状 | 同一包在 a.3 能装、a.4 被拒（或反之）；拒载提示键名从包名变 `engines.dsh`；读拒载记录的脚本/测试拿 `peers` 得 undefined |
| 检测点代码 | 探测 runtime 版本属合法范围（例外：此处只能读版本号判定）或用探针包：带 `engines.dsh: ">=99"` 的包在 a.4+ 必拒、a.3 必收（engines 被忽略） |
| 兜底处方 | 双保险策略：**要广兼容则删 `engines.dsh`（回 peer 规则）**；若声明则 range 必须覆盖全部目标线版本（`0.2.1-alpha.1 \|\| 0.2.1-alpha.2 \|\| … \|\| 0.2.1-rc.1` 或 `>=0.2.1-alpha.1 <0.2.2-0`）；消费拒载记录的代码同时读 `requirements ?? peers` |
| 证据 | VERIFIED：tag 探针（`git diff dsh-v0.2.1-alpha.3 dsh-v0.2.1-alpha.4 -- plugin-compatibility.ts`）+ 指南原文；a.4→a.5、a.5→rc.1 闸门零 diff |
| 先例仓 | 全部六线 peer 枚举写法需重审（dsh-im-union 类六连枚举包：只要不写 engines.dsh 即不受影响） |

### VD-020-021-02 · 0.2.1-alpha.3 编排面契约换代（症状：JSONL 默认导入炸 / JobId 拼不出来 / 子代理配置被拒）

| 字段 | 内容 |
|---|---|
| 变化点 | 一处集合（a.3 段）：① `dsh-session-persistence-jsonl` 无 default 导出（命名空间插件）；② JobId `<kind>-N`→`<kind>-<16hex>`，删 `executionId`/`JobExecutionId`；③ `dsh-tool-subagent` 拒 `persona`/`toolFilter`，改 `agentPreset`；④ HMR 下 `installBundle` 对已装包报 `already-installed`；⑤ 凭据优先级反转（存储 > env）；⑥ 非页面 Connection 默认 `interactions:'none'`（无 `$events/$on/$stream`） |
| 断裂面 | 升级指南 14 篇（`v0.2.1-alpha.2/`×10 + `v0.2.1-alpha.1/`×3 + `v0.2.0-rc.2/`×1）；`SESSION_FORMAT_VERSION` 恒 4，+2 同版本承认（job-session-lifecycle/user-rpc-principal） |
| 运行时症状 | 默认导入得 undefined；拼 id 404；`persona` 配置键拒收；install 返 `already-installed`；脚本订阅 `$events` 永不到来 |
| 检测点代码 | `import * as NS` 后 `typeof NS.apply === 'function'`；错误码穷尽 switch 补 `already-installed` 分支 |
| 兜底处方 | 逐类处方见 `source-analysis/v0.2.1-alpha.3/plugin-migration-guide.md`（六类必做 + 行为核对表） |
| 证据 | VERIFIED：tag 探针符号级（MAIN `git diff dsh-v0.2.1-alpha.2 dsh-v0.2.1-alpha.3`）+ 指南原文 |
| 先例仓 | cci（prompt 形状）、perm-gate（agents.create 包装面未变）、自研安装自动化脚本 |

### VD-020-021-03 · 0.2.1-alpha.3 客户端契约符号换代（症状：`tsc` 报 import 的具名符号不存在）

| 字段 | 内容 |
|---|---|
| 变化点 | 首批**成批删除的客户端具名导出**（grep 全仓无残影）：`projectUserText`/`UserTextReferences`（→`UserTextRun`/`ReferenceChip`）、`RenderMessageImages`（→`MessageImagesOwnerProps`/`MessageImagesContentInput`）、`OperatorPeer`（→`Peer`+`PeerAdmission`）、`TURN_PROCESS_INDEPENDENT_KINDS`、`TerminalAttachmentId`、`WorkspaceTypertGenerator`；槽 `conversation.message.images` 拆为 `conversation.chat.message.images`+`conversation.chat.user.images`；新槽 `conversation.hero.options`/`conversation.user.text.node`/`workspace.toast`（a.4 +`plugins.tab`，a.5 +`conversation.input.model.label`） |
| 断裂面 | slot-catalog（`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts`）a.2→a.3 +627/−179；旧槽名注入**静默失效**（不报错无渲染） |
| 运行时症状 | 类型面 `tsc` 即炸；槽面旧名注入无效果 |
| 检测点代码 | typecheck 即闸；注入后检查 registry 命中（参考 dsh-msg-adjacency 的 `slot:registered` 探针模式） |
| 兜底处方 | 以 MAIN tag 探针（`git grep <符号> dsh-v0.2.1-alpha.3`）grep 替换；旧槽双注（新名优先、旧名兜底）过渡 |
| 证据 | VERIFIED：符号级 diff + grep 全仓 0 命中双证 |
| 先例仓 | 自渲染用户消息/images 的 client 半插件（tidy-display/brief-sidebar 类） |

### VD-020-021-04 · 0.2.1-alpha.5 账号通知形状放宽（症状：通知元数据读空/UUID 断言炸）

| 字段 | 内容 |
|---|---|
| 变化点 | `AccountBonusNotification`：`campaign/amount/currency/grantedAt` 可选且 `JsonValue` 未校验；`orderId` 任意串；空 `expiresAt`=永不过期；新增可选 `title`。指南 `v0.2.1-alpha.4/account-notification-fields` |
| 兜底处方 | 存在性收窄 + 空 `expiresAt` 当永久；fixture 换非 UUID id + 空过期各一例 |
| 证据 | VERIFIED：指南原文 + 6 个 account commit 锚（`2dcd031a8e` 等） |

### VD-020-021-05 · 0.2.1-rc.1 = a.5 逐面全等 + vendor 正式线（症状：rc.1 与 a.5 行为差异归因）

| 字段 | 内容 |
|---|---|
| 变化点 | 纯版本 bump（355 个 package.json ±355 对称，零代码）；唯一实际变化：**runtime 版本字符串 `0.2.1-rc.1`**（peer/engines 命中判定对象换了）+ vendor 转正式线（cordis 4.0.5 / schemastery 3.18.5 / loader 1.0.6 / hmr 1.0.20 等 9 件，PR #6388） |
| 兜底处方 | `^0.2.1-alpha.1` 形式经 `includePrerelease` 可命中同三元组 rc.1；枚举写法无需追加 rc.1 以外的项 |
| 证据 | VERIFIED：tag 探针（`git diff --name-only a.5 rc.1` 全部为 package.json） |

### VD-020-021-06 · 0.2.1-alpha.2 编排 API 与 provider 面换代（症状：run_in_background 无效 / BundleInfo 断言炸 / {{cwd}} 残留报错 / webRuntime 注入失效）

| 字段 | 内容 |
|---|---|
| 变化点 | 指南级 breaking ×10 集合（官方指南 20 篇）：①子代理激活统一化（委派只返 `{kind:'activation',subagentId}`；`start()/startContinuable()`→`startActivation()`；`backgroundMode`/`run_in_background` 删；`subagent-in-process-driver` 包移除）；②`{{cwd}}` 提示词变量删除与子代理 `cwd` 配置键删（→ `ctx.workingDirectory`）；③`BundleInfo` 新增必填 `official`/`availability`（slot `PluginPackageRef` 同步）；④session-title 三导出删（改 `ctx.sessionTitle.register()` + `executeSessionTitleLlm`）；⑤`webRuntime`→`webStartup` 且拒通配 host；⑥SSH/PTC `launch` 换代（protocol 2）；⑦`TerminalBlockLabels` 新增必需 `commandLine()`；⑧tool presentation 拒 `both`；⑨Python PTC 强制 sandbox；⑩可选包显式 bundle 挂载（装包≠挂载） |
| 断裂面 | 逐提交证据见 `<ws>/mine-dsh-plugins/dsh-docs-deliverables/source-analysis/v0.2.1-alpha.2/`（README/diff/migration 全套）；新缝 +4（workingDirectory/worktrees/translator/cotTranslation）；持久化 +5 同版本承认 |
| 运行时症状 | 旧 prompt 模板残留 `{{cwd}}` 发请求前失败；精确校验 BundleInfo 的测试编译/运行双断；注入 `webRuntime` 的 profile 加载即拒 |
| 检测点代码 | `ctx.get('workingDirectory') !== undefined`（a.2+）；委派返回体 `res.kind === 'activation'` |
| 兜底处方 | 按 `v0.2.1-alpha.2/plugin-migration-guide.md` 十分类逐类过；a.3/a.4/a.5 不回收任何 a.2 处方 |
| 证据 | VERIFIED：source-analysis a.2 目录（tag 探针 + 指南原文） |
| 先例仓 | CCI（prompt 形状）、msg-adjacency（activation 返回体）、任何读过 data.stream/webRuntime 的包 |

### VD-020-021-07 · 0.2.1-alpha.4 宿主 release 刷新语义 + 插件市场进门（症状：升级宿主后插件不更新 / 想要官方市场入口）

| 字段 | 内容 |
|---|---|
| 变化点 | ① client-modules 解析图前先比宿主 release；**来自其它宿主 release 的插件更新不自动应用**，宿主 release 变化时弹重载提示（`a7a40f93d9`/`f52abc04fa`/`7c9e54b3ef`）；② 插件市场族：新缝 `ctx.pluginMarket` + 新槽 `plugins.tab` + 5 新包（Discover 页/索引校验/参考生成器） |
| 断裂面 | 安装原语仍走 plugin manager（a.3 的 `already-installed` 等语义照常）；市场只 fetch/validate 不安装 |
| 运行时症状 | 宿主换代后插件仍旧版且无错（需重载）；自挂市场入口插件与官方页重叠 |
| 检测点代码 | 不适用（版本层行为）；发布说明中告知重载步骤 |
| 兜底处方 | 升级宿主 = 重启/重载两步写进插件 README；市场类插件优先对接 `ctx.pluginMarket` + `plugins.tab` |
| 证据 | VERIFIED：`git log dsh-v0.2.1-alpha.3..dsh-v0.2.1-alpha.4` 锚定 + source-analysis v0.2.1-alpha.4 |
| 先例仓 | dshmarket 类第三方市场页插件 |

---

## 附：症状词 → VD-ID 路由候选表（供 SKILL.md 首屏，症状词做首词）

| 症状词（用户/日志原话形态） | 首选 VD-ID | 备选 |
|---|---|---|
| Failed to load plugins / 载入即抛 | VD-011-012-01 | VD-010-011-02 |
| installSection is not a function | VD-016-017-01 | VD-011-012-01 |
| settings.register is not a function | VD-015-016-05 | — |
| installSettingsSection is not a function | VD-010-011-02 | VD-011-012-01 |
| UI 全无但插件显示已启用 / client 半不执行 | VD-016-017-02 | VD-012-015-04、VD-016-017-11 |
| 设置项没地方填 / 无设置页 | VD-010-011-03 | VD-017-020-02 |
| 设置里找不到卡片 | VD-012-015-03 | VD-016-017-04、VD-015-016-03 |
| 卡片头有、表单空白 | VD-017-020-02 | VD-016-017-04 |
| 老设置值丢失 / 只生效一次 | VD-016-017-05 | — |
| ValidationError: expected string but got [object Object] | VD-012-015-02 | — |
| .volatile is not a function | VD-015-016-04 | VD-016-017-06 |
| 改值不热生效 | VD-016-017-06 | VD-015-016-04 |
| volatile fields require a fixed object path | VD-016-017-06 | — |
| incompatible with this host / 被拒载 | VD-016-017-08 | VD-017-020-04、VD-017-020-05 |
| 老线全部插件同时失效 | VD-017-020-05 | VD-016-017-08 |
| 版本号升了但 bug 还在 | VD-012-015-05 | — |
| 只有英文标题 / 语言包不生效 | VD-016-017-09 | — |
| 1 entry did not activate | VD-016-017-09 | VD-017-020-03 |
| 老会话打不开 / 会话字段读空 | VD-016-017-10 | VD-011-012-02b |
| props.hooks undefined / 拿不到 tabs | VD-017-020-03 | — |
| 包已装但 client 从不加载 | VD-017-020-06 | VD-016-017-02 |
| 找不到 dsh-client-runtime / 包名解析失败 | VD-011-012-02 | VD-011-012-05 |
| 0.2.0 要另写一套适配？ | VD-017-020-01 | VD-017-020-08 |
| 0.1.0 升到 0.1.1 要改什么？ | VD-010-011-01 | — |
| 0.1.2 升到 0.1.5 要改什么？ | VD-012-015-01 | — |
| 按 0.1.6 写 range 打不中 | VD-015-016-01 | VD-017-020-04 |
| 未知席位注册后静默无效果 | VD-015-016-02 | VD-015-016-03、09:106/:218 |
| 桌面端插件管理与 web 不一致 | VD-017-020-07 | — |
| arrowkey / sessions.open 失效 | VD-015-016-06 | — |
| 权限闸门报 not registered | VD-016-017-05 | 10 号:106 `dsh-perm-gate` |
| 0.2.1-alpha.4+ 带 engines.dsh 被拒载 | VD-020-021-01 | VD-016-017-08 |
| 读拒载记录 `peers` 拿不到 / workspace: 在 engines 被拒 | VD-020-021-01 | — |
| JSONL 默认导入炸 / JobId 拼不出 / 子代理配置被拒 | VD-020-021-02 | — |
| 客户端具名符号 import 编译不过 / 旧槽注入静默无渲染 | VD-020-021-03 | — |
| 账号通知元数据读空 / orderId 非 UUID | VD-020-021-04 | — |
| rc.1 与 alpha.5 差异 | VD-020-021-05 | — |
| run_in_background 无效 / BundleInfo 断言炸 / {{cwd}} 残留 / webRuntime 失效 | VD-020-021-06 | — |
| 升级宿主后插件不更新 / 官方插件市场 | VD-020-021-07 | VD-020-021-01 |

---

## 附：卡片总数与等级统计

| 分节 | 卡数 | VERIFIED | FARM | PENDING | UNVERIFIED |
|---|---|---|---|---|---|
| §1 0.1.0→0.1.1 | 3 | 2 | 1 | 0 | 0 |
| §2 0.1.1→0.1.2 | 5 | 5 | 0 | 0 | 0 |
| §3 0.1.2→0.1.5 | 5 | 5 | 0 | 0 | 0 |
| §4 0.1.5→0.1.6 | 6 | 5 | 0 | 1 | 0 |
| §5 0.1.6→0.1.7 | 10 | 9 | 0 | 1 | 0 |
| §6 0.1.7→0.2.0 | 8 | 5 | 1 | 2 | 0 |
| §7 0.2.0→0.2.1（含线内断代） | 7 | 7 | 0 | 0 | 0 |
| **合计** | **44** | **38** | **2** | **4** | **0** |

> 说明：VD-016-017-07（bind 面 `update`→`mutate`/+`dispose`）已并入 VD-016-017-03 的迁移公式条目；VD-011-012-02b 为补号卡。
> 等级取卡内**最高可用级**（同卡内若部分 PENDING 已在字段栏注明，不因局部待证降级）。

---

## 附：未能裁决的矛盾清单（10 条，供后续定谳）

| # | 矛盾 | 两侧证据 | 本台账处置 |
|---|---|---|---|
| 1 | 10 号:50「`data-plugin-config` 为 0.2.0 独有、0.1.7 没有」 vs 源码有 | 文档 10:50 ↔ AUX `PluginManagerPage.tsx:449/:494` + 探针 0.1.6-alpha.2 起=2 | 以源码为准；文档标 SUPERSEDED（VD-017-020-08、D §3） |
| 2 | 「0.1.0/0.1.1 壳无设置页、`settings.*` 槽休眠」无法源码级证 | 10:47-48/§4 ↔ 探针无法判 DOM 渲染（`SettingsPage` 字符串 0 命中不构成判据） | 保留 FARM + 假满足警示（VD-010-011-03、B `host_settings_page`） |
| 3 | `inject: []` = 不编组（两说并存） | 10:169-179 / 11 A5:35-39 / V2 `mjs:8,:61` ↔ MAIN `manifest.ts:161-181` + `index.ts:841-851` + `compose():758-768` 无非空过滤 | 两说并列不裁决；V2 降为高危而非 runtime 阻断（VD-017-020-06、C V2） |
| 4 | `snapshotEvents` 归因 0.15 vs 0.1.2 | version-distribution §2.4:84 ↔ 探针 0.1.2-rc.1 已 167 文件 | 归因改 0.1.1→0.1.2（VD-011-012-02b、D §7 SUPERSEDED） |
| 5 | 「0.1.6」被当单一体 | migration §7.2/§7.7 以 0.1.6-alpha.1 为样本 ↔ 探针：alpha.2 已有 `plugins.row.config`=12、`data-plugin-config`=2 | 线内断代入卡（VD-015-016-01/:02）；引用 0.1.6 结论必须指定 alpha 号 |
| 6 | `settings.plugin.item` 塌缩点：0.1.7（文档） vs 0.1.6-alpha.2（探针）；且计数 12 vs 13 | migration:345（12/12/1） ↔ 探针 13/13/**1** | 以探针为断代点，计数差记为扫描口径差（VD-015-016-03） |
| 7 | `plugins.item` kind 不兼容平移 | 新线 `list`（AUX slot-contract:88） ↔ 老线 `keyed`+key=NS（OLD:164/:167-192） | 定为「不可平移的老线契约」（VD-011-012-03 vs VD-016-017-04） |
| 8 | `.volatile()`「0.1.6 调用即抛」 | 定谳事实 3（保留原断言） ↔ 探针源码级可证无该方法；migration:542 反证 feature-detect 可跨线 | VERIFIED(源码级) + 装机运行时 PENDING；限定「仅无条件链式才成立」（VD-015-016-04） |
| 9 | engines=加载器预检闸门（静默禁用） | INDEX §C:43-44、09 §1.3:59-61、rollout:22、version-dist F1 ↔ 定谳事实 1 + `plugin-compatibility.ts:61-88` + AUX README:52 + migration:415/:417 | D 标 SUPERSEDED、C 降为元数据卫生（不参与 runtime 分级）。**⚠ 2026-10-17 再翻案：≥0.2.1-alpha.4 宿主确实读 `engines.dsh` 且单独裁决（VD-020-021-01）——定谳事实 1 仅对 ≤0.2.1-alpha.3 成立，旧文档的「engines 有用」在新时代部分复活** |
| 10 | 命名 `bindInjectHooks` 源码 0 命中；11 号 A6 存在同日自勘误链 | 11:55、12:54 ↔ MAIN `packages/` 全量 grep 0 命中；真实锚为 renderer.ts:42-44 + index.ts:563-564/:584-591 | 机制 CONFIRMED、命名 UNVERIFIED；契约文本以 12 号 v1.0 为准（VD-017-020-03、D §4/§5） |
