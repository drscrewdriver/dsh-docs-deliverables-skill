> 溯源｜settings-registration-migration 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# installSection 迁移专项：为什么用到、怎么改、通解与边界

> 2026-09-25 · 基准宿主 `deepseek-harness` @ `dsh-v0.1.7-rc.1` (`46a7f68b09`)
> 适用仓库：`mine-dsh-plugins` 下全部自有插件。本文只做技术定性与处方，**未改动任何仓库**。

---

## 0. 结论先行

1. **为什么会用到**：DSH 的设置节注册 API 换过三代，插件为覆盖多个宿主版本被迫写「多分支回退」。`installSection` 是第 2 代的唯一入口，第 3 代（0.1.7）把它和第 1 代一起废掉了 —— 所以**多分支同时失效**，不是漏改一支。
2. **怎么改**：0.1.7 起设置节**不再注册**。插件的 Config schema 本身就是设置表单 —— 把要暴露的字段标 `.volatile()`，删掉整个注册块即可。
3. **有没有通解**：有，且对全部插件是同一套四步公式。**但通解有硬边界**：`.volatile()` 是 0.1.7 独有的 schemastery 方法（0.1.6 上调用即抛异常），因此**无法用一份代码同时兼容 0.1.6 与 0.1.7**，必须切版本线发布。这条边界比迁移本身更容易踩。
4. **要动哪些仓库**：**10 个独立仓库**（Tier 1 三个 + Tier 2 六个 + 1 个模板；`dsh-prime-memory` 的 2 个 worktree 已收敛不单列），另 24 个无需处理 —— 总表见 **§7.1**，第 2–9 项的归属见 **§7.6**，执行顺序与工作量见 **§7.3 / §7.4**。
5. **代码改完还不够**：升级前必须做 `settings.yaml` 键名重映射，否则用户的旧设置值会被静默丢进 `.imported` —— 见 **§6**。
6. **设置面不是唯一的面**：`ctx.settingsScope`（客户端半服务）在 0.1.7 **完全删除**，本库 **6 个插件硬注入它 → 整个客户端半永不 apply**；替代是 `ctx.configForms`。三条非设置面的量化 diff 见 **§7.7**。

---

## 1. 为什么会用到 `installSection`

### 1.1 三代 API 演进（宿主侧实证）

| 时代 | 服务/API | 证据 |
|---|---|---|
| 第 1 代 ≤0.1.1-rc.x | 自由函数 `installSettingsSection()` / `settingsNamespace()` | 第 2 代报错文案里仍在引用旧名：`settings.register(${...})`（0.1.5-rc.2 与 0.1.6-alpha.1 的 `packages/settings/settings/src/index.ts:445`） |
| 第 2 代 0.1.2-alpha.2 ~ **0.1.6** | `SettingsProvider.installSection(owner, ns, schema, entry, hooks)` | 0.1.5-rc.2 **:472** 与 0.1.6-alpha.1 **:472** 均有定义；0.1.7-rc.1 **0 命中** |
| 第 3 代 **≥0.1.7-rc.1** | **无命令式注册 API**。`ctx.settings` = `SettingsForms`，只投影 active profile entry 里的 volatile 字段 | 0.1.7-rc.1 `:223` `export class SettingsForms extends Service`；`installSection` 在 `packages/` 与 `docs/` 均 **0 命中** |

> 关键点：`settings.register()` 作为**服务方法**在三代里都不存在（0.1.5/0.1.6 文件里唯一的 `register(` 是错误信息模板）。见 §5 未核实项。

### 1.2 插件侧为什么必须写多分支

`installSection` 是「在宿主设置页开一个属于本插件的配置节」的**唯一下达方式**。它同时承担三件事：

1. 声明 namespace + schema + 默认 entry；
2. 把运行时的配置读取源从「cordis 组合条目」切到「用户设置覆盖层」（`setSource`）；
3. 把变更通知接回插件（`onChange`）。

本仓实证（出现次数为 `rg` 统计）：

| 仓库 | 文件 | 行 | 写法的由来 |
|---|---|---|---|
| `dsh-patch-edit-plus` | `src\index.ts` | 7-10 | 头部注释自述：兼容 0.1.2-rc.1 ~ 0.1.5-rc.2，"only settings registration needs the dual-API fallback (`installSection` first, `register` second)" |
| 同上 | `src\index.ts` | 50-70 | `SettingsFace` 接口把两个方法都声明为可选 |
| 同上 | `src\index.ts` | 77-83 | 注释解释 `setSource` 时序保证（attach/detach 各一次） |
| 同上 | `src\index.ts` | 103-121 | `ctx.inject(['settings'])` 内双分支，均带 `typeof` 守卫 |
| `dsh-prime-memory` | `src\settings.ts` | 249-252 | 注释说明为何 `register` 优先：它返回可 `update` 的 scope，而 `installSection` 只回 hooks |
| 同上 | `src\settings.ts` | 270-273 | 分支 2 注释：仅 `register` 缺失时降级走 `installSection` |
| 同上 | `src\settings.ts` | 311-314 | 分支 3：双 API 皆无 → **恒开降级** |
| `dsh-tidychat`（补充） | `README.md` | 151 | 同口径自述：0.1.0-rc.7/0.1.1 用 `register`，0.1.2+ 用 `installSection` |

**结论**：多分支是**宿主 API 漂移的补丁**，不是设计选择。0.1.7 把 1、2 两代一起删除，补丁整体作废。

---

## 2. 0.1.7-rc.1 的实际服务面

`docs/subsystems/settings.md`（`ctx.settings` — `SettingsForms`，:27）：

| 成员 | 行 | 语义 |
|---|---|---|
| `configure(presentation: { auto?: boolean }, owner?: Fiber): () => void` | :38 | **只登记「本实例的页面策略」**。`auto` 默认 `true`。重复登记抛错 |
| `prepareDocument(): Promise<string>` | :43 | 定位 profile patch 路径 |
| `describe(options?): SettingsDescriptor[]` | :49 | 按 **active profile 里的 entry id** 返回表单与实时值 |
| `update(ns, patch, expectedRevision?)` | :56 | 合并可编辑字段 |
| `replace(ns, section, expectedRevision?)` | （:60+） | 先重置为继承配置，再套用提交值 |
| `mutate(ns, ops, expectedRevision?)` | （:60+） | 按路径改写，保留客户端未回传的 secret |

三条语义变化，是迁移时必须理解的部分：

1. **namespace 不再是插件自定的字符串**，而是「active profile 中该 entry 的 local id」（`settings.md:9`）。插件不能也不该再声明 namespace。
2. **服务定位变了**：0.1.7 的 settings 是「把 active profile entry 的 volatile Config 字段投影成表单」（`settings.md:5`），而不是「接受插件注册一个 section」。
3. **`configure()` 的唯一用途是「关掉自动页」**（自带自定义页时才用），不是「开一个页」。开页是自动的。

---

## 3. 通解：四步公式（全插件同一套）

> 一句话：**设置节从「命令式注册」变为「声明式契约」—— Config schema 即表单。**

### 步骤 1 —— 把要暴露的字段标 `.volatile()`

```ts
import type { Context, Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export interface Config {
  allowCodexPatch: Volatile<boolean>          // 类型侧：普通 T 包一层 Volatile
}

export const Config = Schema.object({
  allowCodexPatch: Schema.boolean().default(false).volatile(),  // schema 侧：链尾加 .volatile()
})
```

### 步骤 2 —— 运行时读值改 `.get()`

```ts
const resolved = { allowCodexPatch: config.allowCodexPatch.get() }
```

- 一次操作内要一致快照 → 操作开始时取一次，跨 `await` 可用；
- **不要**把取出的值留到后续操作复用（`docs/cordis-tutorial/05-config.md:91`）。

### 步骤 3 —— 变更通知改事件

```ts
ctx.on('loader/volatile-update', (paths) => { rejudge() })
```

替代原先 `installSection` 的 `onChange` hook。官方插件范例：`packages/llm/llm-deepseek/src/index.ts:135`、`packages/llm/llm-pi-ai/src/index.ts:310`、`packages/experimental/speech-to-text/src/index.ts:50`。

### 步骤 4 —— 删掉整个注册块

删除 `ctx.inject(['settings'], ...)` 及其内全部 `installSection` / `register` 分支，连同只为它存在的类型与状态（`SettingsFace` 接口、`setSource`/`readSource` thunk、`SettingsScope` 桥接对象、恒开降级分支）。

**仅当插件自带自定义页、需要抑制自动生成的表单页时**，才保留一个最小调用：

```ts
ctx.inject(['settings'], (sctx) => sctx.effect(() => sctx.settings.configure({ auto: false }, ctx.fiber)))
```

### 判定表：把历史多分支收敛成线性

| 目标宿主 | 正确姿势 |
|---|---|
| ≤0.1.1-rc.x | `settings.register(ns, schema, { base })` |
| 0.1.2 ~ 0.1.6 | `settings.installSection(owner, ns, schema, entry, hooks)` |
| **≥0.1.7-rc.1** | **无需任何调用**；Config `.volatile()` 自动成表 |

注意这不是「再加一个分支」—— 0.1.7 起**没有命令式注册面可加**。想加分支也加不了，唯一方向是声明式。

---

## 4. 通解的硬边界（比迁移本身更容易踩）

### 4.1 `.volatile()` 是 0.1.7 独有 → 不能一份代码兼容 0.1.6 与 0.1.7

`vendor/schemastery` 跨 tag 实证：

| tag | `volatile` 命中 |
|---|---|
| `dsh-v0.1.5-rc.2` | **0** |
| `dsh-v0.1.6-alpha.1` | **0** |
| `dsh-v0.1.7-rc.1` | **18**（含实现 `:480 Schema.prototype.volatile`、类型 `:165`、README `:393`） |

后果：在 0.1.6 宿主上，`Schema.boolean().volatile()` 在**模块求值期**就抛 `TypeError`（方法不存在）→ Config 构造失败 → **fiber 直接 FAILED，插件加载失败**。这比原来的「设置入口静默消失」更糟。

**因此兼容策略必须是版本线，不能是运行时分支：**

- 方案 A（推荐）：`main` 只支持 0.1.7+（声明式）；旧线留在维护分支 / 旧 dist-tag（如 `dsh-0.1.5`，`dsh-prime-memory` 的 `publishConfig` 已在用这个 tag 命名法）。
- 方案 B：运行时读宿主版本再选 schema —— **不可行**，schema 在模块顶层构造，早于任何运行时判断。
- 方案 C：延迟构造 schema —— 只在 `apply()` 内按版本构造。技术上可行，但会把 schema 从静态导出降级为运行期产物，破坏 `describe()` 与类型导出，不推荐。

### 4.2 声明位置的硬红线

来自 `docs/cordis-tutorial/05-config.md:93-95` 与 `vendor/schemastery/src/index.ts:481-496`：

- 只支持**固定对象路径**声明，或**整个对象/数组**标 volatile；
- **拒绝**：数组内独立引用、字典内的引用、union / intersect 分支内的引用、lazy schema、transform 内、以及「另一个 volatile 值内部」→ 抛 `ValidationError: volatile fields require a fixed object path without an enclosing volatile field`（:494）；
- 重复包裹抛 `TypeError: volatile schema is already wrapped`（:481）；
- 值域：对象/数组是递归冻结的纯数据快照；**函数、类实例、循环引用被拒**；
- 配置文件里存的是普通值；`simplify()` 负责解包引用。

### 4.3 变更传播语义（决定插件能不能少写代码）

- **只有 volatile 字段变** → 不 remount 插件；Loader 逐引用提交新值 + 发**一次** `loader/volatile-update`（附带变更路径数组）；
- **普通字段也变了**（含表达式结果变化）→ 走原有 update 流程（remount），旧引用**不变也不通知**；
- **等值不通知**；
- **无效候选** → 记日志，运行中的引用**保持不变**（不会静默写入脏值）。

意义：插件不再需要自己维护「解析值 → 重新注册」的桥；`rejudge` 类逻辑只要挂到事件上即可。

---

## 5. 逐仓处方

### 5.1 `dsh-patch-edit-plus`（命中：`src\index.ts` ×5，`lib\index.js` ×4，`lib\types\index.d.ts` ×1）

| 动作 | 位置 |
|---|---|
| 删双 API 说明注释 | `src\index.ts:7-10` |
| 删 `SettingsScopeFace` / `SettingsFace` 接口 | `src\index.ts:50-70` |
| 删/改 `readSource` 与 `disposer` 的重挂机制（改由 `.get()` + 事件驱动） | `src\index.ts:76-89` |
| **删整个 `ctx.inject(['settings'], …)` 双分支块** | `src\index.ts:103-121` |
| `allowCodexPatch` 加 `.volatile()` | `src\config.ts`（`Config` 定义处） |
| `rejudge` 内改读 `config.allowCodexPatch.get()`；事件替代 `onChange` | `rejudge` 定义处 |
| 保留首挂调用（`:94-101` 的 `ctx.effect` 内 `rejudge()`） | 不动 |
| **重建 `lib/`** | 否则 `lib\index.js`、`lib\types\index.d.ts` 里的死调用继续随包发布 |

### 5.2 `dsh-prime-memory` / `-conflict-3axis` / `-hall-octagon`（命中：`src\settings.ts` ×10，`dist\settings.js` ×9）

> **✅ 已完成（2026-09-25，compat/0.1.7 @ f819b75）**：下表六项全部落地，实施与本文处方有一处偏差——
> `.volatile()` 不是逐字段加，而是**整个 live 节一次标注**（宿主明确支持「整个对象 volatile」，
> 且免受 union/嵌套约束；键集 20 个不变）。dist 已重建，全量 909 用例绿。
> 数据补足见 §7.1 注记（旧 section 顶层扁平键 → 自动导入必拒，走 §6.3 路径 B 手工写入 `live.*`）。

| 动作 | 位置 |
|---|---|
| **删三分支整段**（`register` 分支 + `installSection` 桥接 + 恒开降级 warn） | `src\settings.ts:249-314` |
| 删桥接对象 `SettingsScope<MemoryLiveSettings>`（含 `update → Promise.reject`） | `src\settings.ts:277-286` |
| `liveSettingsSchema()` 内逐字段加 `.volatile()` | `src\settings.ts:256` 引用的 schema 定义处 |
| `inner.get()` 的读取路径改走 `config.<field>.get()` | `wireScope` / 消费点 |
| **重建 `dist/`** | 否则 `dist\settings.js` 里的死调用继续随包发布 |
| 3 份检出（2 个 worktree）同源，在主工作树改一处再 merge 两条分支 | — |

### 5.3 补充 `@bananasoldier01/dsh-tidychat`（命中：`src\index.ts` ×4，`lib\index.js` ×1）

| 动作 | 位置 |
|---|---|
| **删整个 `ctx.inject(['settings'], …)` 双分支块** | `src\index.ts:67-77` |
| 删注释中的版本对照表 | `src\index.ts:62-66` |
| 需要暴露的字段加 `.volatile()` | `Config` 定义处（`:50-57` 一带） |
| **重建 `lib/`** | 否则 `lib\index.js` 死调用继续随包发布 |

---

## 6. 数据补足：升级前必须做的 `settings.yaml` 键名重映射

### 6.1 为什么代码改完还不够

宿主对旧 `$DSH_HOME/settings.yaml` 的一次性导入器**不认第三方 namespace**：

```ts
// packages/settings/settings/src/index.ts:201-206
const LEGACY_SECTION_ENTRIES: Record<string, string> = {
  'ui-developer-tools': 'ui-settings',
  'ui-onboarding': 'ui-settings-general',
  shell: process.platform === 'win32' ? 'pwsh-sandbox' : 'bash-sandbox',
}

// :248-255
for (const [section, values] of Object.entries(sections ?? {})) {
  const ns = LEGACY_SECTION_ENTRIES[section] ?? section   // ← 其余全部恒等回退
  try { await this.update(ns, values) }
  catch (error) { logger.warn('settings: section %s of %s was not imported into entry %s', …) }
}
```

三条硬事实：

1. **没有映射表兜底**：只有 3 个官方条目有映射，其余一律 `?? section` —— 即「section 键 == entry id」。
2. **失败只留一行 warn**：`update()` 校验**完整 Config**，不匹配就整段被拒，值只留在改名后的 `settings.yaml.imported` 里，**不会合并、不会部分导入**。
3. **只跑一次**：`rename(path, imported)` 在第一次写入前执行（:245-246），此后永不重跑。

> 关键区别：旧 `installSection` 的 namespace 是**插件自定字符串**；0.1.7 的 namespace 是**profile 里 entry 的 local id**。两者不等 → 用户的设置值变成孤儿。

### 6.2 本机实测（2026-09-25）

- `$DSH_HOME/settings.yaml` **仍为原名、8183 字节、无 `.imported` 兄弟文件** → **导入器尚未跑过**。
- 当前安装版本 `%APPDATA%\dsh-launcher\dsh-runtime\versions\`（原机器绝对路径已泛化为用户目录变量）下只有 **`0.1.5-rc.2`** → 确认仍在 0.1.7 之前。
- 从「profile 直接依赖的 `dsh.bundle.patch` + 官方 `dsh-base` / `dsh-web-app` patch + `cordis.patch.yml`」共解析出 **186 个 entry id**，逐一比对 30 个 section 键。

**结论：30 个 section 中 14 个恰好同名（会正常导入），`ui-onboarding` 有官方映射，其余 15 个需要处理。**

| 分类 | section 键 |
|---|---|
| ✅ 同名，导入正常（14） | `agent-presets`、`ui-conversation`、`agent-default-model`、`pet`、`tidychat`、`ui-theme`、`llm-pi-ai`、`session-guard`、`ui-chat`、`dsh-memory`、`dsh-perm-gate`、`llm-deepseek`、`permission`、`dsh-browser-cdp` |
| ✅ 有官方映射 | `ui-onboarding` → `ui-settings-general` |
| ⚠️ **确认需改键名** | `patch-edit-plus`、`thinking-levels`、`bash-terminal` |
| ❌ **孤儿（无对应 entry）** | `dsh-perm-gate-rules`、`llm-openai-completions`（该插件已不在 profile 的 bundles 列表里） |
| ❓ 待确认（插件 entry id 未逐一核实） | `aionui-panel`、`switch-search`、`dsh-desktop`、`dsh-desktop-notifications`、`ui-custom`、`free-search`、`codex`、`dsh-better-sidebar`、`context-compression`、`subagent-model-selection` |

**已核实的键名映射**（依据 = 对应包 `package.json` 的 `dsh.bundle.patch` 指向文件中声明的 `id:`）：

| 旧 section 键 | 应改为 entry id | 依据 |
|---|---|---|
| `patch-edit-plus` | `dsh-patch-edit-plus` | `dsh-patch-edit-plus/cordis.patch.yml` → `id: dsh-patch-edit-plus` |
| `thinking-levels` | `dsh-thinking-levels` | `dsh-thinking-levels/cordis.patch.yml` → `id: dsh-thinking-levels` |
| `bash-terminal` | `tool-bash-terminal` | `dsh-bash-terminal-ts/cordis.patch.yml` → `id: tool-bash-terminal` |
| `context-compression` | `context-compression-improved-bundle`（待确认是 bundle 行还是 estimator 行承载 Config） | `dsh-context-compression-improved/packages/selector/cordis.patch.yml` → 两个 id |

> `dsh-memory`、`tidychat`、`session-guard`、`dsh-browser-cdp` 之所以能对上，是因为这些插件**恰好用 entry id 当了自己的 settings namespace** —— 属于巧合，不是设计。

### 6.3 两条补足路径

**路径 A（推荐，本机当前适用）：升级到 0.1.7 之前，把 section 键名改成真实 entry id。**
- 只做键名重命名，**不动任何值** → 零值转写风险、零 schema 校验风险（键名不是 schema 字段）。
- 之后升级，宿主自己的导入器会把它搬进 active profile 的 patch，走的是官方路径。
- 前置条件：`settings.yaml` 尚未被改名（本机成立）。若已存在 `settings.yaml.imported`，路径 A 失效。

**路径 B（导入器已跑过 / 想事后修）：手工把值写进 active profile 的 `cordis.patch.yml`。**
- 目标形态：section 值 → 对应 entry 的 `config:` 块（例：本机 `profiles/web/cordis.patch.yml` 已有 `- id: session-query-sqlite / config: {...}` 的写法可参照）。
- 值必须是新 schema 的合法输入：字段名需与新 Config 的 `.volatile()` 字段路径一致；**一个字段不合法会导致整段写入被拒**。
- 孤儿 section（`dsh-perm-gate-rules`、`llm-openai-completions`）需人工裁决：丢弃，或并入当前仍存在的 entry。

**为什么不能由插件自己补**：导入器在「Settings 启动、Loader 结算完所有 entry」之后由**宿主**执行一次，且文件随即被改名；插件既不该知道 profile 布局，也无法保证早于该时点运行。

---

## 7. 总体执行计划

### 7.1 需要迁移的仓库总表

判定口径：`src/` + `lib/` + `dist/` 全量 grep，排除 `node_modules` / `_wt-*`。★ = 补充项（`@bananasoldier01` 作用域）。

**Tier 1 — `installSection` 删除（host 侧，3 个独立仓库）**

| # | 仓库 | 改动位置 | 命中 | 必须重建 |
|---|---|---|---|---|
| 1 | `dsh-patch-edit-plus` | `src\index.ts` :7-10、:50-70、:76-89、:103-121 + `src\config.ts` 加 `.volatile()` | src ×5 / lib ×5 | `lib/` |
| 2 | `dsh-prime-memory` | `src\settings.ts` :249-314 | src ×10 / dist ×9 | `dist/` |
| 3 ★ | `dsh-tidychat` | `src\index.ts` :62-77 | src ×4 / lib ×1 | `lib/` |

> **`.git` 收敛（已核实，2026-09-25 更新）**：`dsh-prime-memory-conflict-3axis`（分支 `conflict-3axis`）与 `dsh-prime-memory-hall-octagon`（分支 `hall-select-display`）**不是独立仓库**，而是 `dsh-prime-memory` 的 `git worktree`（`.git` 为文件，指向 `dsh-prime-memory/.git/worktrees/*`）。主工作树分支演进：`file-layer-hardening`（文件层加固，已并入 `main` 与 `compat/0.1.5`）→ **`compat/0.1.7`（0.1.7 适配线，本表 Tier 1 #2 已在此线完成，commit f819b75）**。
> **做法：在 `dsh-prime-memory` 主工作树改一次，再 merge 到其余分支** —— 不重复实现、不重复重建。
>
> **✅ Tier 1 #2（dsh-prime-memory）host 侧已落地**（compat/0.1.7 @ f819b75）：三分支注册块整删；`liveSettingsSchema` 迁入 `config.ts` 并整节 `.volatile()`（键集 20 个不变，contract-keys 测试守卫）；写路径 `ctx.settings.update('dsh-memory', {live})` → configEditor → loader volatile-only 提交；`suppressAutoSettingsForm` 关掉自动表单页（自带 settings.section 自定义页）。验证：typecheck 三配置 + 全量 909/909 绿。
> **⚠️ 数据补足注意**：新开关节在 entry config 的 `live.*` 路径下，旧 `settings.yaml` 的 `dsh-memory` section 是**顶层扁平键**（且 `conflictFreeze: true` 布尔与新 Config 同名对象节冲突）→ 宿主导入器会**整段拒收**该 section（值落入 `.imported`）。按 §6.3 路径 B 手工迁移：把旧值写进 profile patch 的 `- id: dsh-memory / config: { live: {…} }`。本机旧值仅 8 键（distillChain / distillMode / embedRemote* ×3 / memoryMutate / conflictFreeze / enabled）。

**Tier 2 — `settings.plugin.item` 槽删除（client 侧，6 仓库 + 1 模板）**

| # | 仓库 | 注册点 | 备注 |
|---|---|---|---|
| 6 | `dsh-browser-cdp` | `src\client\index.ts:1642` | 直接注入 |
| 7 | `dsh-session-guard` | `src\client\index.ts:57` | 直接注入 |
| 8 | `dsh-thinking-levels` | `src\client\index.ts:55` | 直接注入 |
| 9 | `dsh-session-steward` | `src\client\index.ts:174` | 直接注入 |
| 10 | `dsh-search-index` | `src\client\index.ts:715` 常量 + `:846`/`:853` 探测注册 | 已自带降级 warn（`:862`「宿主未声明 …卡片不会出现」）→ 0.1.7 上必然触发 |
| 11 ★ | `dsh-tidychat` | `src\client\index.ts:1813` | 与 Tier 1 第 5 项同仓，**合并一次做** |
| 12 | `dsh-docs-deliverables/plugin-framework/dsh-plugin-template` | `src\client\index.ts:155` | **模板：必须最先改**，否则新插件继续踩 |

**不动（席位在 0.1.7 保留，已核实）**

| 仓库 | 席位 | 位置 |
|---|---|---|
| `dsh-perm-gate` | `settings.plugins.tab` | `src\client\index.ts:114` |
| `dsh-context-compression-improved` | `settings.section` | `packages\selector\src\client\index.ts:133` |
| `dsh-prime-memory` ×3 的 client 半 | `settings.section` | `client\src\entry.tsx:42,59`（只有其 host 侧需改，见 Tier 1） |

**无需处理**：其余 24 个自有仓库 `src/` `lib/` `dist/` 三处 `installSection` 全为 0。

**Tier 4 — `settingsScope` 服务删除（客户端半，6 个独立仓库）**：见 **§7.7**，这是比 Tier 2 影响面更大的一面 —— 硬注入的插件**整个客户端半永不 apply**。

**Tier 3 — 数据补足（按机器，不按仓库）**：见 §6，`$DSH_HOME/settings.yaml` 的 section 键名重映射。

### 7.2 跨版本约束（决定能不能「一份代码两用」）

**Tier 1 与 Tier 2 的替代 API 都是 0.1.7 独有** —— 因此两个 Tier 都**不能**用一份代码同时兼容 0.1.6 与 0.1.7：

| API / 席位 | 0.1.5-rc.2 | 0.1.6-alpha.1 | 0.1.7-rc.1 |
|---|---|---|---|
| `schemastery.volatile()`（Tier 1 替代） | 0 | 0 | **18** |
| `plugins.detail.*`（Tier 2 替代） | 0 文件 | 0 文件 | **7 文件** |
| `settings.plugin.item`（被删） | 12 文件 | 12 文件 | 1（仅历史注释） |
| `settings.section`（保留） | 有 | 有 | **有** |
| `settings.plugins.tab`（保留） | 有 | 有 | **有** |

结论：**迁移必须与版本线切分绑定**。`main` 面向 0.1.7+ 走新 API，旧线留在维护分支 / 旧 dist-tag。

### 7.3 执行顺序与依赖

1. **模板先行**（第 12 项）——不先改，后续每个新插件都会重新引入同一缺陷。
2. **Tier 1 与 Tier 2 相互独立，可并行**；两者内部也各自独立。
3. **`dsh-prime-memory` 的 3 份检出（2 个 worktree）** —— 在主工作树改一份，再 merge 到 `conflict-3axis` 与 `hall-select-display` 两条分支，避免三份漂移（历史上三者 `src\settings.ts` 行号已出现 `249-314` 与 `250-313` 的分叉）。
4. **`dsh-tidychat` 横跨 Tier 1 + Tier 2** —— 合并为一次改动、一次重建。
5. **每次改完必须重建产物**（`lib/` 或 `dist/`）——产物里的死调用会随 npm 包发布出去，只改 `src/` 等于没改。
6. **Tier 3 必须排在升级到 0.1.7 之前**，且必须早于「让 0.1.7 首次启动」——导入器只跑一次（§6.1）。

### 7.4 工作量估算

| 阶段 | 内容 | 仓库数 | 估算 |
|---|---|---|---|
| 0 | 改模板（第 12 项） | 1 | 20 min |
| 1 | Tier 1 第 1–2 项（两个独立代码库） | 2 | 60–80 min |
| 2 | Tier 1 第 3 项 + Tier 2 的 `dsh-tidychat`（合并一次） | 1 | 30 min |
| 3 | Tier 2 第 6–10 项 | 5 | 90–120 min |
| 4 | Tier 3 键名重映射 + 备份（§6） | — | 15 min |
| 5 | 新增工作流 W4 / W7 / W10（§7.6 / §7.7） | 6 + 1 + 6 | 115–165 min |
| 6 | 升级后验证（§8 清单） | 全部 | 30 min |
| | **合计** | **16 独立仓库**（含三面重叠的 5 个） | **≈ 6.5–8 h** |

### 7.5 完成判据

- [ ] 第 1–12 项每项：`rg -c installSection` 与 `rg -c 'settings\.plugin\.item'` 在 `src/` `lib/` `dist/` 全为 0
- [ ] 每个改动仓库的产物已重建，且构建产物内的席位字符串已是新形态
- [ ] 模板已改，新生成的插件骨架不含 `settings.plugin.item`
- [ ] Tier 3 的 15 个待处理 section 键已裁决（改键 / 丢弃 / 并入）
- [ ] 版本线已切分：旧线不再收到含 `.volatile()` 的构建

---

### 7.6 十项变化其余各项的归属与工作流（第 2–9 项）

第 1 项 = Tier 1（§7.1），第 10 项 = 可选增量（§7.6 末），下表补齐第 2–9 项的最终归属。

| 项 | 变化 | 本库 / 本机实测 | 动作 |
|---|---|---|---|
| 2 | `settings.plugin.item` 席位移除 | ❌ 6 独立仓库 + 1 模板（§7.1 Tier 2） | **已是 Tier 2**，迁移目标三选一见下 |
| 3 | `$DSH_HOME/settings.yaml` 移除 | ⚠️ 本机文件仍在原名（导入器未跑）；本库 RUNTIME 4 处 + SCRIPT 18 处 | **已是 Tier 3（§6）**，另加文案/脚本收尾，见下 |
| 4 | `peerDependencies` 强制校验 | ❌ **6 个仓库 peers 为空** | **新增工作流 W4**（优先级同 Tier 1） |
| 5 | `dsh.profile.patchReload` 移除 | ✅ 0 命中 | 无动作，保持回归门禁 D5 |
| 6 | HMR 包改名 | ✅ 0 命中 | 无动作，保持回归门禁 D6 |
| 7 | 会话格式 V3 → V4 | ❌ `dsh-session-steward` 14 处直读 `session.jsonl` | **新增工作流 W7** |
| 8 | `agent-team-web-profile` 删除 | ✅ 本库 0 命中；本机 profile bundles 亦不含（已核实） | 无动作，保持回归门禁 D8 |
| 9 | DeepSeek Messages-only | ⚠️ 本库 4 处命中**均为 URL/CDP protocol（假阳性）**；本机 `settings.yaml` 与各 profile 配置 `^\s*protocol\s*:` **0 命中**（已核实） | 无动作，保持回归门禁 D9 |

**W2 —— 席位移除的三种迁移目标**（按插件实际需求选一，勿混用）

| 需求 | 0.1.7 做法 | 备注 |
|---|---|---|
| 只需「可配置」 | 删注册，Config 字段加 `.volatile()` | 自动成表，**首选** |
| 需要在「插件」页内加**与「插件配置」平级**的标签页 | 保留 `settings.plugins.tab`（0.1.7 保留） | `dsh-perm-gate:114` 即此类，不动 |
| 需要在**别人的**页面里挂内容 | `plugins.detail.actions` / `.badge` / `.section` | **0.1.7 独有**（0/0/7 文件）→ 与 `.volatile()` 同样要求切版本线 |

**W3 —— `settings.yaml` 的代码侧收尾**（Tier 3 之外的零头）

- `dsh-perm-gate\src\client\locales.ts`（:148 / :301 / :454 / :607）与 `dsh-prime-memory\src\stats.ts`（:1035，3 份检出）是**文案/注释提到 `settings.yaml`** → 0.1.7 后措辞失真，低危但应顺手更正。
- `dsh-prime-memory\scripts\census-conflicts.mjs:89` 真读 `~/.dsh/settings.yaml` → 升级后该 **dev 脚本必然失败**（不随包发布，独立修）。
- 部署/安装脚本若依赖 `$DSH_HOME/settings.yaml`，改为写 active profile 的 `cordis.patch.yml`。

**W4 —— 补齐 `peerDependencies`（新增，优先级同 Tier 1）**

- 命中：`dsh-date-wrapper`、`dsh-live-token-stats`、`dsh-perm-gate`、`dsh-synapse`、`JevLoop` —— 5 个仓库 **peers 为空**（`dsh-transition-webui` 非插件项目，2026-09-26 移出本清单，不再补 peers）。
- 机制：`evaluatePluginCompatibility`（`packages/boot/app-boot/src/plugin-compatibility.ts:61-88`）在**没有 `peerDependencies` 时于 :68 早退** → 装到 0.1.7 上**零校验、零告警**，坏插件静默加载。这是本清单里面积最大的「静默失败」来源。
- 动作：为每个仓库补上其实际使用的 `@deepseek-ai/dsh-*` 条目（范围写法参照 §7.2 与已合规仓库，如 `dsh-brief-sidebar` 的 `>=0.1.5-rc.1 <0.2.0-0`）。
- 注意：**不能只写 `engines.dsh`** —— 该字段全宿主零读取方（仅声明式）。6 个仓库当前都只有 `engines.dsh`，等于没有门禁。
- 验证：补完后在 0.1.5-rc.2 上应能正常加载（新 peers 不破坏旧宿主），在 0.1.7-rc.1 上应被正确识别。

**W7 —— 会话格式 V3 → V4（新增）**

- 唯一命中：`dsh-session-steward` 14 处（`src\host\history\purge.ts:16` 等直读 `session.jsonl`）。它是会话诊断插件，直读会话日志属于职责内行为 → 必须显式适配，不能只改判据。
- 动作：改经 session-query / 会话 API 读取；或明确声明只支持 V4。
- **硬约束**：V3 读取器**拒绝** V4，官方**不支持降级**（`docs/persistence-changes/2026-09-16-session-format-v4.md`）。
- 验证：用一份 V3 会话与一份 V4 会话各跑一次 purge / history 路径。

**第 10 项（可选增量）** —— 本库两项均未采用（`dsh.bundle.patch` 无数组形式；无 `locale/` 目录与 `exports['./locale/*.json']`），需要时再上。

> 全部判据的可执行版本：`_tools\check-017-compat.ps1`（D1–D10 对应上表各项），详见 `README.md` §3。

### 7.7 非设置面的适配面（宿主半 / 客户端半）

**结论：设置面不是唯一的面。** 按「宿主服务 seam / 客户端席位账本 / 宿主会话事件」三条面各做一次跨版本集合 diff（`dsh-v0.1.5-rc.2` → `dsh-v0.1.7-rc.1`）：

| 面 | 0.1.5-rc.2 | 0.1.7-rc.1 | 增 | **删** |
|---|---|---|---|---|
| 客户端席位账本（`'{slot}': { kind: … }` 声明） | 81 | 103 | +23 | **−1**：`settings.plugin.item` |
| 宿主服务 seam（`super(ctx, '<name>')`） | 97 | 115 | +20 | **−2**：`settingsScope`、`codeRuntime` |
| 宿主会话事件类型（`known-event-types.ts`） | 53 | 56 | +3 | **0**（纯增量） |
| 设置服务 API（同 §1.1） | `installSection` | `SettingsForms` | — | 2 个方法面 |

#### 面 A —— `ctx.settingsScope` 服务被删除（**本轮最大遗漏，优先级同 Tier 1**）

**实证**：`git grep -c 'settingsScope' <tag> -- packages` → 0.1.5-rc.2 = **40 文件**、0.1.6-alpha.1 = **40 文件**、0.1.7-rc.1 = **0 文件**。

**为什么比 Tier 2 更严重**：`export const inject = [... , 'settingsScope']` 是 cordis 的**依赖门禁**。服务名被删后依赖永不满足 → 该插件的 **client 半 `apply` 永不执行** → 侧栏徽标、面板、卡片**整块消失**（不只是设置卡片）。

**命中（本库 `src/` 硬注入，6 个独立仓库）**：

| 插件 | `inject` 声明位置 | `bind()` 调用 |
|---|---|---|
| `dsh-input-traffic` | `src\client\index.ts:78` | :92 |
| `dsh-perm-gate` | `src\client\index.ts:71` | :123 |
| `dsh-session-guard` | `src\client\index.ts:20` | :63 |
| `dsh-thinking-levels` | `src\client\index.ts:36` | :66、:72、:92、:93 |
| `dsh-context-compression-improved` | `packages\selector\src\client\index.ts:41` | :74 |
| `dsh-bash-terminal-ts` | `src\client.tsx:58` | :148 |

**已做对（软读，可优雅降级，无需改）**：`dsh-tidychat`（`src\client\index.ts:526` `ctx.get('webUiSettings') ?? ctx.get('settingsScope')`）、`dsh-search-index`（:762 `ctx.get('settingsScope')`）、`dsh-session-steward`（:162 `ctx.get('settingsScope')`）—— **`ctx.get(name)` 是「可选服务」的正确读法**（参见 `packages/AGENTS.md`：可选服务用 `ctx.get`，`ctx.<name>` 只给已声明的注入）。

#### 面 B —— 替代 API：`ctx.configForms`（客户端半）

新服务由 `packages/client/ui-settings/src/client/config-form.ts:241`（`export class ConfigForms extends Service`，`:266 super(ctx, 'configForms')`）提供，是**客户端半**的服务。

| 提供方 API | 说明 |
|---|---|
| `get<T>(entryId: string): ConfigForm<T>` | 取某个 profile entry 的表单句柄 |
| `describe(): SettingsDescribeFace` | 共享 describe 镜像 |
| `whileServed(namespaces, register)` | 仅在宿主服务该 namespace 期间存在（官方页用 `plugins.item` 注册即走它） |

`ConfigForm<T>` 的成员与旧 `SettingsScope` **几乎同名**：

| 旧 `settingsScope.bind({ namespace })` | 新 `configForms.get(entryId)` |
|---|---|
| `getSnapshot()` | `getSnapshot()` ✅ |
| `subscribe(fn)` | `subscribe(fn)` ✅ |
| `set(field, value)` | `set(field, value): Promise<boolean>` ✅ |
| `unset(field)` | `unset(field): Promise<boolean>` ✅ |
| `update(...)` | `mutate(ops, expectedRevision?)` ⚠️ 改名 |
| — | 新增 `dispose()` |

**迁移公式（两处改动）**：

```diff
- export const inject = ['slots', 'locale', 'settingsScope']
+ export const inject = ['slots', 'locale', 'configForms']

- const scope = ctx.settingsScope.bind<C>({ namespace: PLUGIN_NS })
+ const form  = ctx.configForms.get<C>(ENTRY_ID)
```

> ⚠️ **`namespace` → `entryId`**：与 §6 是同一个坑的客户端半 —— 新键是 **active profile 里 entry 的 local id**（如 `dsh-perm-gate`），不是插件自定 namespace（如 `permissive`/`patch-edit-plus`）。官方 entry 的 namespace（`thinking-levels` 绑的 `llm-pi-ai`、`llm-deepseek`）本身即 entry id，不受影响。

#### 面 C —— 客户端席位账本：+23 / −1

**唯一删除**：`settings.plugin.item`（= Tier 2）。
**新增 23**（可选用，不强制）：`plugins.detail.actions` / `.badge` / `.section`、`plugins.item`、`plugins.bundle.config` / `.activation`、`plugins.row.config`、`settings.launcher`、`conversation.header` / `.header.leading`、`conversation.input.activity` / `.permission`、`deliverables.file.actions`、`deliverables.review.file.actions`、`renderer.factory.chain` / `.child`、`shell.leading`、`sidebar.chat.conversation`、`sidebar.right.tab.document.action` / `.actions` / `.unpreviewable`、`sidebar.toggle.badge`、`sidebar.workspaces.session.row.action`
→ **对既有插件是兼容的**（只增不减），但 Tier 2 的替代目标就在这批里（§7.6 W2）。

#### 面 D —— 宿主会话事件类型：+3 / −0

新增 `developer/message`（全新事件）、`image/offload`、`workspace/changes`；**无删除**。
→ 消费会话事件的插件不会因「事件类型消失」失败；但 **V4 改的是载荷形状**（见 §7.6 W7 与 `docs/persistence-changes/2026-09-16-session-format-v4.md`）。

#### 面 E —— `ctx.codeRuntime` 改名/删除（本库无影响）

`codeRuntime` 在 0.1.7 服务清单消失，同时新增 `ptcRuntime`（PTC 执行缝改名）。
本库 `src/` **零命中**（仅 `dsh-docs-deliverables/**` 的历史分析与社区目录条目提及）→ **无动作**。

#### 新增工作流 W10 —— `settingsScope` → `configForms`（6 仓库）

- 逐仓：改 `inject` 数组 + `bind({namespace})` → `get(entryId)` + `update` → `mutate`；重建客户端包。
- 顺序：与 Tier 2 同一批文件（`src\client\index.ts`）—— **建议与 Tier 2 合并为一次改动**，避免同一文件改两遍。
- `dsh-bash-terminal-ts` 的 host 半另有 `ctx.settings.register(`（`src\index.ts:678`）—— 与 Tier 1 同源问题，**必须一起处理**（该仓库同时命中 Tier 1 面与 W10）。
- 验证：客户端半 `apply` 确实执行（槽位注册数 > 0），而非 `inject` 挂起。

---

## 8. 验证清单

- [ ] 全库 `rg -c 'installSection' <repo>\src <repo>\lib <repo>\dist` 全部为 0（含**构建产物**）
- [ ] 全库 `rg -c 'settings\.register\(' <repo>\src` 为 0
- [ ] 目标字段已加 `.volatile()`，且**不嵌套**在另一个 volatile 值内、不在 union/intersect/lazy/transform 分支内
- [ ] `Volatile<T>` 类型与 schema 输出一致（`Schema.boolean().default(false).volatile()` → `Volatile<boolean>`）
- [ ] 宿主起 0.1.7 后：设置页**自动出现**该插件的表单页（无需任何注册代码）
- [ ] 改一个 volatile 字段保存 → 插件**不 remount**，收到一次 `loader/volatile-update`
- [ ] 改一个无效值 → 日志报错、运行中引用**不变**
- [ ] 重启宿主后值仍在（落在 active profile 的 patch 里）
- [ ] 若插件自带自定义页：`configure({ auto: false })` 已生效且**只登记一次**（重复登记抛错）
- [ ] **升级前**：`$DSH_HOME/settings.yaml` 中本插件的 section 键已改为真实 entry id（见 §6.3 路径 A）
- [ ] **升级后**：确认没有 `settings: section … was not imported into entry …` 的 warn；`settings.yaml.imported` 里不再残留本该导入的 section
- [ ] 孤儿 section（无对应 entry）已人工裁决：丢弃或并入现行 entry

---

## 9. 未核实项

- `settings.register()` 的真实来源：0.1.5-rc.2 / 0.1.6-alpha.1 的 settings 服务**没有该方法**（唯一 `register(` 在错误信息模板里）。`dsh-prime-memory` 注释自称「register 全版本存在」与宿主源码**不符**；其分支 1 在两代宿主上可能一直是死代码（实际由分支 2 生效）。**未逐版本装机验证**。
- **✅ 2026-10-01 试点实证补记(0.2.0-rc.2,scratch profile `web-dual5`,5 插件双面验证 10/10 pass,证据 `_artifacts/dual5-shots/verdicts.md`)**:
  1. **0.2.0-rc.2 设置面与 0.1.7-rc.2 一致**:`dsh-settings`(宿主 SettingsForms)与 `dsh-client-ui-settings`(configForms 客户端服务)两线 lib **逐字节相同**;席位 ID 集合 diff 为空;rc.1→rc.2 差异仅在 Desktop profile 插件管理。→ 本文全部结论跨 0.1.7/0.2.0 两线适用。
  2. **§8「宿主起 0.1.7 后设置页自动出现该插件的表单页」在 0.2.0-rc.2 web UI 上不成立**:Plugins 页渲染配置卡要求插件客户端注册 `plugins.bundle.config`(key=包名,bundle 页描述与组件列表之间)或 `plugins.row.config`(key=`包名#rowId`,行上出现「配置」按钮);`plugins.row.config` 官方 occupants 为空,无通用表单卡,`ConfigPageForm` props(`{view,form}`)由页面递入、渲染归插件。`autoGenerate`/`configure({auto})` 在 rc.2 UI 无消费点。**Tier 2 迁移只删注册 + 标 volatile 不够,必须补挂新席位**(W2 表「只需可配置→自动成表」一行需按此修正)。
  3. **§4.1 硬边界修正**:`.volatile()` 用 dsh-context 的 feature-detect 惯例(`typeof field.volatile === 'function' ? field.volatile.call(field) : field`)可单 bundle 跨 0.1.5~0.2.0,「0.1.6 上调用即抛、必须切版本线」只对无条件调用成立。
  4. **pnpm 12(PNPM_HOME 自管)注意**:ignored-builds 为致命错且设置键已改名 `allowBuilds`(map 形态);`onlyBuiltDependencies` 与 package.json `pnpm` 字段均失效。宿主运行期间 `pnpm add` 可能因 better-sqlite3 文件锁(os error 5)失败——先停宿主再装。
  5. dsh-settings `describe()` 的 form 条件(实证):entry 运行中(fiber state 2)+ 模块导出 Config(schema)+ schema 含 volatile 字段;ns = **entry.options.id**,与客户端 `configForms.get(entryId)` 同键;**entry id ≠ 包名时**(如 tidy-display),Plugins 页按包名 dispatch 的 `formFor` 永不命中,卡必须自绑 entry id。
- 各仓库 `.volatile()` 落地后 `describe()` 输出的字段集合是否等价于原 `installSection` 注册的 schema —— **未做等价性比对**。
- `dist/` / `lib/` 与 `src/` 是否同版本 —— **未做产物新鲜度比对**。
- 0.1.7 的 `configure({ auto: false })` 在「自带自定义页 + 仍需表单数据」场景下的完整交互 —— **未实测**。
- §6.2 表中标注「待确认」的 10 个 section 键（`aionui-panel`、`switch-search`、`dsh-desktop`、`dsh-desktop-notifications`、`ui-custom`、`free-search`、`codex`、`dsh-better-sidebar`、`context-compression`、`subagent-model-selection`）—— 其插件 entry id **未逐一核实**，可能存在假阴性（entry id 与 section 键不同但我未解析到）。
- `context-compression` 究竟由 `context-compression-improved-bundle` 还是 `…-estimator-catalog` 行承载 Config schema —— **未确认**。
