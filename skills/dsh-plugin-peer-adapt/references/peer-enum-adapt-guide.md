> 溯源｜09-枚举peer适配指导 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# 枚举 peer（supportedHosts）适配指导 —— 第一批七插件

> 制定日期：2026-10-04 ｜ 范式来源：MichengAI dsh-skills-manager / dsh-agency-agents / dsh-im-connect / dsh-archive-manager（本地参照检出：`../reffer-dsh-plugins/`）
> 适用对象：dsh-date-wrapper、dsh-preset-manager、dsh-paste-dock、dsh-mcp-registry、dsh-input-traffic、dsh-arrowkey-nav、dsh-tidy-display
> 关联文档：`DSH-PLUGIN-COMPATIBILITY-GUIDE.md`、`DSH-PLUGIN-VERSION-DISTRIBUTION-STRATEGY.md`、`../mine-dsh-plugins/host-matrix-rollout.md`

---

## 0. 这套机制是什么、适配的到底是什么

MichengAI 的 `supportedHosts = Object.freeze(["0.1.2-rc.1", ...])` 不是一种 peer 写法技巧，而是一个发布模型：

```
元数据层（hosts.mjs → peerRange → sync-hosts --write → package.json + README）
        ↓ 保证
验证层（CI 把 supportedHosts 展开 matrix，每个 rc 真机装宿主跑回归）
        ↓ 背书
运行时层（能力探测 / 最小契约 / 窄腰分支 / 双字段兼容，让一份代码跨版本活）
```

**三层缺一不可。** 只抄 peer 写法不抄 CI 矩阵，等于把没验证过的版本写进白名单；只抄 CI 不做运行时兜底，矩阵一红就得发版。arrowkey-nav 0.3.3/0.4.0 双线带着 `sessions.open` 缺失发布的事故，缺的正是"每个枚举版本被行为验证过"这一环。

适配的实质动作是：**消灭 `compat/*` 冻结分支，单分支 + 单版本服务全部已验证宿主线；支持集从"行范围"变成"显式清单"，清单由 CI 强制为真。** 现有的 `engines.dsh`（加载器闸门）和 npm dist-tag（用户选版指引）都可以保留，三者不冲突。

---

## 1. 通用注意事项（七插件共享）

### 1.1 版本矩阵基线

五宿主线对应的 rc 清单（与 MichengAI 一致，宿主侧就这些 rc）：

```js
// scripts/hosts.mjs —— 每仓库单一事实来源
export const supportedHosts = Object.freeze([
  "0.1.5-rc.1", "0.1.5-rc.2", "0.1.5-rc.3",
  "0.1.7-rc.1", "0.1.7-rc.2",
  "0.2.0-rc.1", "0.2.0-rc.2",
]);
export const peerRange = supportedHosts.join(" || ");
export const developmentHost = "0.2.0-rc.2";   // devDependencies 全部钉这里
```

- 下限按插件**实际验证过**的线裁剪（date-wrapper/preset-manager 可以往下探到 0.1.2-rc.1，但必须先跑通矩阵再加）；
- 升级流程固定为：`supportedHosts` 加版本 → `node scripts/sync-hosts.mjs --write` → CI 矩阵绿 → 发版；README/README.zh-CN 兼容句由脚本同步，禁止手改。

### 1.2 semver 预发布规则（已用 semver 包实测，三条结论）

| 声明 | 0.1.7-rc.2 | 结论 |
|---|---|---|
| `^0.1.5-rc.1 \|\| ^0.2.0-rc.2` | **不匹配** | caret+rc 只放行同三元组的 rc → **整条 0.1.7 线被静默排除**（paste-dock v0.1.3 现状，必改） |
| `>=0.1.7-rc.1 <0.1.8-0` | 匹配 | `-0` 上界写法健全，不泄漏 `0.1.8-rc.1` |
| `0.1.7-rc.2 \|\| 0.2.0-rc.2` | 匹配 | 精确枚举精确匹配，无暗坑 |

规则根源：预发布版本只能被"带相同 `[major,minor,patch]` 三元组预发布比较器"的范围匹配。**任何跨线的 `^x.y.z-rc.n` OR 都是假声明**——枚举法的直接动机之一就是让这类错误从"隐式事故"变成"显式决定"。

### 1.3 双闸门口径必须一致：`engines.dsh` × `peerDependencies`

- `engines.dsh` 是**加载器预检闸门**：不满足会被启动预检**静默禁用**（`host-matrix-rollout.md` 已记录）；
- `peerDependencies` 是**包管理器闸门**：host profile 安装插件时由 npm/pnpm 校验（MichengAI CI 用 `--config.auto-install-peers=true`）。
- 两者口径不一致就是事故源：mcp-registry 0.2.0 版 peer 未放行 `dsh-tools 0.2.x`，被 0.2.0 宿主**拒装**（其 README 版本表原文记录）。枚举化时**同一份 `peerRange` 同时写进两处**（engines 接受任何合法 semver 范围串，`||` 枚举可用），由 sync-hosts 脚本一并下发，杜绝两处手改漂移。

### 1.4 `dsh.client.inject` 与挂载期强校验

- client 注入清单在**新宿主是挂载期强校验**：mcp-registry 0.2.1 因未声明 `commands`，0.2.0 宿主**挂载直接报错**。host 侧 `export const inject` 同理。
- 枚举适配后，每个新纳入矩阵的宿主版本都要在 CI 里断言"inject 清单在该版本可满足"，不能只看插件自己的冒烟。

### 1.5 cordis 钉线坑（MichengAI 1.1.2 翻过车）

兼容性矩阵安装里，**`cordis-plugin-group/hmr/include/loader/timer` 必须钉到宿主自己的 Cordis 线**：npm 自动选入的新版 cordis 插件不匹配旧 rc 宿主的 Cordis pin，宿主会在兼容检查连上前就退出。参照实现：`reffer-dsh-plugins/dsh-skills-manager/scripts/compat-dependencies.mjs`。

### 1.6 宿主版本识别：探测优先，读版本次选，禁止用插件自己的依赖判断

三级优先序（对齐 dsh-agency-agents 的实践）：

1. **能力探测（首选）**：`typeof x === 'function'`、provider `capabilities.{persona,toolFilter,depthLimit}`、`typeof field.volatile === 'function'`、方法形状探测。不问"宿主是哪个版本"，问"这个能力在不在"。
2. **读宿主版本号（次选）**：preset-manager 的 `src/host-version.js` 已有双通道实现（Node 解析链 + fs 候选根上溯，fail-soft）。跨仓库推广时补上 agency-agents 的锚点修正：宿主 bin 可能是符号链接，应从 `process.argv[1]` 的 realpath 和 `prefix/lib/node_modules/@deepseek-ai/dsh` 双锚点建 `createRequire`（见 `reffer-dsh-plugins/dsh-agency-agents/src/settings-compat.ts` 的 `hostModuleAnchors`）。
3. **禁止**：用插件自己 node_modules 里的 `@deepseek-ai/*` 判断宿主能力——插件依赖可能更旧/更新，"不能用来判断当前宿主"（agency-agents 原注释）。

无论用哪级，**分支决策集中在一个窄腰文件**（arrowkey-nav 的 `session-nav.ts` 范式）：版本差异代码只许出现在这一处，其余代码对宿主版本无感。

### 1.7 运行时兜底的三个现成范本（就在你们自己的代码里）

| 范本 | 位置 | 模式 |
|---|---|---|
| 双字段兼容 | `dsh-paste-dock/src/typert.host.ts` | codec 同时带 `schema`（0.1.5 线读）和 `create` 工厂（0.1.7-rc.2 typert-loader 必查），两字段由同一工厂产生、不可能漂移 |
| fail-open 守卫 | `dsh-preset-manager/src/commands.js` | `typeof ctx.commands?.register === 'function'` 守卫，服务缺失降级不拖垮 boot |
| scoped 注入防卡死 | `dsh-date-wrapper/src/index.js` 头注释 | 不导出插件级 `inject`，改用 `ctx.inject([...], fn)`——插件级 inject 卡 PENDING 会触发启动审计失败 |

### 1.8 CI 矩阵与行为验证

- 每格矩阵 = 隔离目录装真实 `@deepseek-ai/dsh@<ver>` + 打包好的插件 → 启动宿主 → 跑该插件的冒烟断言 → 结果存 `.compat-results/`；
- DOM/按键类插件加 `--serve` 保留宿主 + Playwright（MichengAI dsh-agency-agents 的 `test:browser` 是现成结构；arrowkey-nav 必须做到**按键级**端到端，见 §5.6）;
- 槽位名类插件可在矩阵内**扫宿主源码断言槽位仍存在**（tidy-display `scripts/check-harness-compat.mjs` 的 registrations 扫描逻辑可以直接改造成逐版本采集）。

---

## 2. UI 功能注入点全景（跨版本敏感点对照）

| 注入通道 | 语法 | 跨版本敏感点 | 本批使用者 |
|---|---|---|---|
| host 服务注入 | `export const inject = [...]` | 0.2.0+ 挂载期强校验，缺服务即报错（mcp-registry 0.2.1 事故）；清单里每个服务都要在矩阵每格断言存在 | 全部 |
| 延迟 scoped 注入 | `ctx.inject(['svc'], fn)` | 服务缺失只让 fn 不执行，不卡 fiber；**能不用插件级 inject 就不用** | date-wrapper |
| client 模块表 | package.json `dsh.client.inject` | **两种风格并存**：包名风格（`@deepseek-ai/dsh-client-ui-slots` → slots 提供方，mcp-registry/input-traffic 在用，官方插件同款）与服务名风格（`['sessions','connection']`，paste-dock/arrowkey 在用）。适配时先在每版本宿主上确认加载器对两种风格的解析不变，**不要在矩阵验证中间顺手改风格** | paste-dock / mcp-registry / input-traffic / arrowkey-nav |
| client bundle 挂载 id | `window.__ModuleLoader__.load({ id, factory:(require)=>{} })` | **id 必须等于 npm 包名**，否则宿主挂不上 client bundle 且整体静默失活（tidy-display 用常量钉死此事，fork.4 回归教训） | 全部 |
| UI 槽位 | `ctx.slots.register({...})` + `ctx.slots.inject('槽位名', ...)` 遮蔽 | 槽位名是宿主**内部契约**（`conversation.input.dock` 等），宿主改名 = 静默失效（遮蔽不报错）。矩阵内加"槽位存在性扫描" | input-traffic（4 槽）/ mcp-registry |
| 命令 | `ctx.commands.register({name, input, handler})` | 服务缺失需 fail-open 守卫 | preset-manager / mcp-registry |
| systemPrompt | `context({name, order, text})` / `section({name, order, text})` | order 号位是稀缺资源（110 sandbox / 115 approval / 120 subagent 已占）；`context` 按文本去重、追加式，跨版本不得改语义 | date-wrapper |
| webServer 路由 | `ctx.webServer.register({kind:'prefix'|'exact', path, handler})` | `webServer` 缺席只影响状态路由不影响核心（mcp-registry README 已明示）；写接口必须 trustedHosts + 客户端标记头 | mcp-registry / tidy-display |
| typert RPC | 包根 `./typert` 导出 → typert-loader → api-gateway | codec 契约 0.1.5（`schema` 字段）vs 0.1.7+（`create` 工厂必查）——用 paste-dock 的双字段范本 | paste-dock |

## 3. 设置关联点位全景

| 机制 | 适用线 | 接入/检测方式 | 本批使用者 |
|---|---|---|---|
| volatile 声明式设置（schemastery `.volatile()` 字段即自动表单） | 0.1.7+ | **必须探测后使用**：`typeof field.volatile === 'function'`（agency-agents `liveSchemaField` 范式）。0.1.5 线的宿主 schemastery 未必带 `.volatile`，直接链式调用会 TypeError | preset-manager（现状直接 `.volatile()` 链式，见其适配卡）/ tidy-display |
| 设置呈现策略 | 0.1.7+ | live 配置 + `ctx.settings.configure({auto:false}, fiber)`（agency-agents 范式：插件不代替宿主判断 volatile，只用宿主自己的 schemastery 标记） | 无（需要时抄） |
| 旧线 installSection | ≤0.1.5（部分旧 RC） | `installSettingsSection` / `settingsNamespace` 兼容桥（agency-agents `settings-compat.ts`：0.1.2-alpha.2 起接受裸字符串 ns、删除了 legacy 导出） | 无（如需下探 0.1.2 线再抄） |
| configForms 槽位（client 设置页表单） | client | `dsh.client.inject: ['@deepseek-ai/dsh-client-ui-settings']` + client `inject:['configForms']` | mcp-registry / input-traffic |
| `settings.general.item` 槽位 | client | 遮蔽注入，随宿主设置页版本变化 | input-traffic |
| patch 行配置 | 全线 | `apply(ctx, config)` 直收，无设置服务依赖 | date-wrapper |
| 设置缺失兜底 | 全线 | fail-open 默认值对象（`DEFAULT_SETTINGS`），volatile 值解引（`readVolatileValue`） | preset-manager |

---

## 4. 逐插件适配卡

> 每张卡五段：现状快照 → 版本敏感面 → 适配动作 → 矩阵验证清单 → 风险。
> 建议落地顺序即卡片顺序（4.1→4.7），前四张是"声明收敛"，后三张带代码/工具改造。

### 4.1 dsh-date-wrapper —— 全批试点（最干净）

**现状**：v0.2.0；peer 仅 `@deepseek-ai/cordis ^4.0.2`（optional）；`inject` 不导出；`src/index.js` + `format.js` 两个文件。

**版本敏感面**
- `systemPrompt.context({name:'date-wrapper:date', order:116, text})`：API 面极小，但 `order` 号位是全局稀缺资源（110/115/120 已被 sandbox/approval/subagent 占用，116 是本插件自选）。宿主新版本若引入占用 115~120 的新上下文，**不会报错，只会渲染顺序错乱**——这是本插件唯一的"静默失效"通道。
- `RuntimeContextProjection.project()` 按文本去重、追加式快照：宿主语义，插件不得依赖"同文本不落事件"以外的行为。

**适配动作**
1. 建 `scripts/hosts.mjs`（可下探 `0.1.2-rc.1`，先跑矩阵再加）；
2. sync-hosts 同步 package.json + README；
3. 无设置点位、无 client half，卡内其余为空。

**矩阵验证清单（每格）**
- 启动后快照消息含 `YYYY-MM-DD zone weekday` 文本；
- grep 宿主日志无 order 冲突/上下文重名报错；
- 人为把系统日期跨天（或 mock），确认只追加一条新快照。

**风险**：几乎为零。它适合当**流程试点**——把 hosts.mjs/sync-hosts/CI 矩阵的模板在它身上跑通，模板直接复制给后续六家。

### 4.2 dsh-preset-manager —— 版本识别参考实现 + volatile 探测缺口

**现状**：v0.4.0；peer 仅 cordis；`engines.dsh >=0.1.1-rc.1`（全线意图）；`inject = []`（全 fail-open）；已有 `src/host-version.js` 双通道宿主版本探测。

**版本敏感面**
- **volatile 断点（本卡最重要发现）**：`Config` 直接链式调用 `z.boolean().default(...).volatile().description(...)`。宿主 schemastery 自 0.1.7+ 才带 `.volatile()`（tidy-display `config.ts` 注释原文"0.1.7+"）；在无 volatile 的宿主线上，这段声明会 **TypeError 拖垮装载**。当前 engines 声明 0.1.1+ 却没有对应的运行时兜底——正是"声明面与行为面脱节"的活例子。
- `ctx.commands?.register` typeof 守卫（commands 服务缺失降级）——已经是正确姿势，保持。
- `host-version.js` fail-soft 返回 undefined 回退 main 分支——语义要保留，但它服务于"运行时分支选择"，与 peer 枚举（"装得上"）分层，不互相替代。

**适配动作**
1. volatile 探测式降级（抄 agency-agents `liveSchemaField` + `hostSchemastery`：从宿主安装位置解析 schemastery → 探测 `volatile` 存在才标记 live 字段，否则普通字段 + `readVolatileValue` 已有的解引兜底）；
2. host-version.js 补 agency-agents 的 bin 符号链接/prefix 双锚点修正，然后**提升为共享工具**（本批其余插件都可能用）；
3. hosts.mjs 枚举（先 0.1.5~0.2.0，0.1.2 线验证后再加）。

**矩阵验证清单（每格）**
- 装载无报错；volatile 可用线：设置页出现 4 个 volatile 开关并实时生效；
- volatile 不可用线（如 0.1.5-rc.x，以矩阵实测为准）：确认探测降级生效、启动扫描照常；
- `/preset-doctor scan` 输出结构化报告；
- host-version.js 读出的版本号与该格宿主一致。

**风险**：低。最大工作量在 volatile 探测改造，一天内。

### 4.3 dsh-paste-dock —— 先修 peer 漏线 bug，typert 双字段是全批范本

**现状**：v0.1.3；peer `dsh-tools` + `dsh-typert-protocol` 写的是 `^0.1.5-rc.1 || ^0.2.0-rc.2`——**实测不匹配 0.1.7-rc.1/rc.2，整条 0.1.7 线被静默排除**（§1.2 表）；host `inject=['tools']`；client `dsh.client.inject:['sessions','connection']`（服务名风格）；`typert.host.ts` 挂 `pasteStore/savePaste` RPC。

**版本敏感面**
- typert codec 契约分叉：0.1.5 读 `schema` 字段，0.1.7-rc.2 typert-loader **必查 `create()` 工厂**（缺了直接 "has no create() factory"）。现文件已用双字段兼容（同一工厂产生，不可能漂移）——**这是全批运行时兜底的教科书范本，适配时原样保留并在注释里维持两线依据**。
- client 服务缺失降级路径：`sessions/connection` 不可用时大粘贴回退 raw text（client/index.ts:104 日志）。矩阵要验证降级而不是只验证全功能。
- `dsh.client.inject` 服务名风格：每版本确认加载器仍解析服务名（不要顺手改成包名风格，两风格都有效但混用风险自担）。

**适配动作**
1. **修 peer**：改 hosts.mjs 枚举 `["0.1.5-rc.1","0.1.5-rc.2","0.1.5-rc.3","0.1.7-rc.1","0.1.7-rc.2","0.2.0-rc.1","0.2.0-rc.2"]`，0.1.7 两格补矩阵验证后放行；
2. 无设置点位；README 版本表由 sync-hosts 同步。

**矩阵验证清单（每格）**
- 大文本粘贴 → `savePaste` RPC 全链路落盘（1 MiB 内）；
- 断开 sessions 服务（或用无会话环境）确认 raw text 降级路径；
- grep 网关日志无 typert-loader codec 报错。

**风险**：低。typert 契约已兼容，纯声明收敛 + 0.1.7 补验。

### 4.4 dsh-mcp-registry —— engines/peer 口径统一 + inject 强校验案例库

**现状**：v0.2.9；`engines.dsh >=0.2.0-0`（单线）但 peer `dsh-tools` 已是双线范围（`>=0.1.7-rc.1 <0.1.8-0 || >=0.2.0-rc.1 <0.3.0-0`）——**两闸门口径不一致**；host `inject=['tools','commands']`；client `inject=['slots','configForms']`，`dsh.client.inject` 为包名风格（ui-slots→slots、ui-settings→configForms）；`surface/http.ts` 状态路由（webServer 缺席只影响它）。

**版本敏感面**
- 仓库自带两起口径事故记录（README 版本表）：0.2.0 版 peer 未放行 `dsh-tools 0.2.x` 被 0.2.0 宿主**拒装**；0.2.1 版 host inject 缺 `commands` 在 0.2.0 宿主**挂载报错**。这两条就是 §1.3/§1.4 的实证，适配说明可直接引用。
- slots/configForms 两个 client 注入的提供方（ui-slots / ui-settings）跨版本 API 面需要矩阵断言。

**适配动作**
1. 决断目标形态：单版本服务双线（推荐）——engines 改为与 peer 同源的枚举串，`dsh-0.1.7` dist-tag 指向同一版本；
2. sync-hosts 生成两处口径，禁止手改；
3. README 版本表收敛为"每宿主线 → 同一版本"。

**矩阵验证清单（每格，双线共 5~7 格）**
- 0.1.7 线：**现在 engines 不放行，先确认矩阵安装脚本绕过引擎预检的方式**（隔离安装时以 peer 为准），然后验证 MCP 注册/调用链路 + slots/configForms 挂载；
- 0.2.0 线：现状已真机验证过（README 0.2.2 行），矩阵固化它；
- 每格 grep 挂载日志确认 inject 五项（tools/commands + slots/configForms）全满足。

**风险**：中低。唯一不确定项是 0.1.7 线上 commands 服务行为是否与 0.2.0 一致——这正是矩阵要回答的。

### 4.5 dsh-input-traffic —— 槽位名矩阵化（遮蔽失效是静默的）

**现状**：v0.5.5；7 个 peer 全部锁 `>=0.1.7-rc.1 <0.1.8-0`（全 optional）；client `inject=['slots','locale','sessions','conversation','configForms']`；遮蔽注入 4 个槽位：`conversation.input.dock`、`conversation.input.right`、`dsh-family.tab`、`settings.general.item`；`dsh.client.inject:['@deepseek-ai/dsh-client-locale','@deepseek-ai/dsh-client-ui-conversation']`。

**版本敏感面**
- **槽位名是宿主内部契约**：遮蔽（shadowing）语义下宿主改名/移槽**不报错、直接静默失效**。这是本插件跨版本的头号风险，比 peer 范围重要得多。
- `conversation`/`sessions` client 服务面：0.1.7↔0.2.0 间无 arrowkey 级删除记录，但矩阵前先按 arrowkey 根因分析的核对表过一遍（`list.getSnapshot()` 形状等）。
- peer 全 optional 现状：枚举后建议宿主相关 7 项转**必需**（optional 的唯一理由是"非 DSH 宿主也能装"，若不存在此需求就去掉——optional 会让漏线从"拒装"退化成"静默缺服务"）。

**适配动作**
1. hosts.mjs 三线枚举（0.1.5 线需先验证 4 个槽位在该线是否存在——大概率 `dsh-family.tab` 是 0.1.7+ 新槽）；
2. **把槽位存在性扫描纳入矩阵**：改造 tidy-display `check-harness-compat.mjs` 的 rg+AST registrations 扫描为共享脚本，矩阵内对每版本宿主源码断言 4 个槽位名存在；
3. peer 转必需 + 枚举。

**矩阵验证清单（每格）**
- 槽位扫描通过（4 名全在）；
- 浏览器验收：输入区 dock/right 元素渲染、`dsh-family.tab` 出现、设置页 general item 出现（`--serve` + Playwright）；
- settings.general.item 开关联动输入区行为生效。

**风险**：中。槽位若在 0.1.5 线缺失，需要运行时条件注册（`ctx.slots.inject` 包 typeof 守卫），禁止矩阵里跳过该线。

### 4.6 dsh-arrowkey-nav —— 修复落地后最优先枚举化（事故教训持有者）

**现状**：v0.3.2（0.1.5 线 main；0.3.3/0.4.0 为 0.1.7/0.2.0 compat 线，**已知双线带同一断点**：`sessions.open` 不存在 + `list.current` 已删，删于 dsh-v0.1.6-alpha.1→alpha.2 单提交 `6830e1460d`）；peer 3 项全 optional；engines `>=0.1.5-alpha.1 <0.1.6-0`；host apply 为空，全部行为在 client（`inject=['sessions','workspaces','uiWorkspace','locale']`）。

**版本敏感面（按根因分析文档口径）**
- API 断点 ×2：切换执行 `sessions.open(id)`（3 处）→ `uiWorkspace.openSession(id)`；当前会话推导 `list.getSnapshot().current` → `Object.values(byId).find(s => (s.retainedBy?.mainView ?? 0) > 0)`（复刻宿主 `tree.ts:38-41`）。修复对 0.1.7/0.2.0 是同一份代码。
- DOM 面（0.1.7/0.2.0 已核对健在）：`[data-slot="sidebar.workspaces"]`→`[role=tree]` 滚动容器；`div[role=treeitem][aria-expanded]` 分组头 / `[aria-selected]` 行；行标题 class 含 `_title`；`[data-composer-input]`。
- 弱化项（有兜底）：0.2.0 行文本本地化（"Untitled"/"New Session"）使含未命名行的 DOM 顺序匹配失配 → 已回退控制器顺序。
- `uiWorkspace.connectWorkspace(id)` 返回 Promise<SessionId>，两线一致。

**适配动作（前置：修复落地）**
1. 修复收敛进 `session-nav.ts` 窄腰（版本差异只许在这一处）；
2. **废除 compat/* 双线分支，单 main 枚举三线** `["0.1.5-rc.1..3","0.1.7-rc.1/2","0.2.0-rc.1/2"]`（0.1.5 线上 `sessions.open/current` 尚在，窄腰需按能力探测分派：`typeof uiWorkspace.openSession === 'function'` 优先、否则旧路径）；
3. peer 转必需 + 枚举；engines 同源同步；
4. dist-tag 矩阵表收敛为单版本。

**矩阵验证清单（每格，必须按键级）**
- `--serve` + Playwright：ArrowUp/Down 在树内移动选中（断言 `aria-selected` 行变化），ArrowLeft/Right 进出 workspace（断言 `data-composer-input` 所在会话变化）；
- blank 会话复用（cwd==path）不产生空会话尾巴；
- 含未命名行的分组顺序回退路径可用；
- console 无 `keydown failed`。

**风险**：中高，但这是全批**收益最高**的一张卡——矩阵化直接防住 0.3.3/0.4.0 式带伤发布复发。修复分析（`dsh-arrowkey-nav-0.1.7-0.2.0-失效根因分析.md`）已给出全部技术依据。

### 4.7 dsh-tidy-display —— 枚举缓行，先把哈希门禁迁进 CI 矩阵

**现状**：v0.1.2；13 peers 全锁 `>=0.1.7-rc.1 <0.1.8`；host `inject=['webServer']`（skills.list 可选守卫）；**哈希门禁**：`scripts/check-harness-compat.mjs` 对 18+ 个宿主源文件做 sha256 基线（`compat/harness-rc2.json`）+ rg/AST 扫槽位注册表，锁死 0.1.7-rc.2；客户端是深度 markdown 渲染 fork（Reader/Blocks/DiffPanel…，槽位面 `conversation.chat.*` / `tool.call.*` / `conversation.message.*`）；name 必须等于 npm 包名（fork.4 教训，常量钉死）。

**版本敏感面**
- 哈希门禁本质是**声明面 diff 的极端形态**：宿主任何被 hash 的文件变动都会红，包括无 API 影响的改动——它回答"宿主改没改"，不回答"插件还能不能用"。
- 13 个 peer 中相当比例可能只是类型引用，真实运行时消费者要逐个核实后才能谈枚举（否则枚举清单本身是假声明）。
- schemastery volatile（0.1.7+）在 `config.ts` 有分叉注释，此线内安全。

**适配动作（分阶段，诚实地说本卡短期不做 peer 枚举）**
1. **第一步（本批内完成）**：把哈希门禁从"构建期本地单基线"改造成"CI 矩阵内逐版本采集宿主指纹"——基线目录 `compat/<host-version>.json`，矩阵每格生成/比对自己那份；registrations 扫描同时作为共享槽位扫描器供 input-traffic 使用。这不动发布模型，但让"锁版本"升级为"知版本"。
2. **第二步**：peer 逐个核实真实消费面，裁掉类型-only 项；
3. **第三步（长期）**：markdown fork 面收敛后，才考虑枚举多线。在 rollout 文档的"活跃项目推广状态"里维持 ❌/缓 标注。

**矩阵验证清单（第一步范围，每格）**
- 宿主指纹采集 + 与该版本基线 diff 报告（红绿都存档到 `.compat-results/`）；
- 槽位注册表扫描输出（供 4.5 共享）；
- webServer 状态路由 + skills.list 可选降级。

**风险**：改造本身低风险；**不要**被"顺手把 peer 也枚举了"诱惑——13 peers 未核实消费面前枚举等于造假声明。

---

## 5. 建议落地顺序与批次验收基线

| 批次 | 插件 | 性质 | 出口标准 |
|---|---|---|---|
| P0 流程试点 | date-wrapper | 模板跑通 | hosts.mjs/sync-hosts/CI 矩阵模板定型，矩阵全绿 |
| P1 声明收敛 | preset-manager、paste-dock、mcp-registry | volatile 探测补齐 / 0.1.7 漏线修复 / 口径统一 | 各自矩阵全绿；paste-dock 的 0.1.7 补验结论入档 |
| P2 槽位矩阵 | input-traffic | 共享槽位扫描器落地 | 三线矩阵绿 + 浏览器验收截图入 `.compat-results/` |
| P3 修复后枚举 | arrowkey-nav | 修复落地为前置 | 按键级端到端三线全绿；compat 分支删除 |
| P4 工具迁移 | tidy-display | 哈希门禁 → 逐版本指纹 | 矩阵内指纹 diff 报告自动化；peer 枚举明确延期并记录 |

**全批共享产物**（放在 `mine-dsh-plugins/_tools/` 或独立共享包）：
1. `hosts.mjs` 模板（§1.1）；
2. `sync-hosts.mjs`（同步 package.json peers + engines + 双语 README 兼容句）；
3. `host-version.js` 增强版（双锚点）；
4. `scan-slot-registrations.mjs`（自 tidy-display 门禁抽出）；
5. CI workflow 模板（matrix = supportedHosts 展开，windows-latest，`cordis-plugin-*` 钉宿主 Cordis 线，产物上传 `.compat-results/`）。

**每格矩阵的通用断言**（所有插件共用）：装载无挂载错误日志 → inject 清单逐项存在 → 插件功能冒烟（见各卡）→ README 兼容句与版本一致。
