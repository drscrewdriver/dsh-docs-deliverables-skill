# digest-01 · vendor/：可拆卸的运行时底座（Cordis 框架层）

> **来源**：`dsh-study-docs/详解/第01篇-vendor-Cordis框架层.md`
> **快照声明**：源文档与旧快照锁定 **v0.1.0-rc.5**（49 个包分组 / 219 个 npm 包）。
> **⚠️ 代际警示**：本 digest 路径与行号已按 **MAIN = v0.2.0-rc.2** 重锚（grep 实证）。框架层是跨代最稳定的一片——`vendor/cordis/src/events.ts` 的 `DispatchMode`/`on()` 行号在 0.2.0 与 0.1.0-rc.5 **完全一致**。标 `UNVERIFIED` 的行号未在 MAIN grep 命中，不可当事实引用。

## 0 WHY（一段）

dsh 是同一个代码库要同时支撑 **headless / web / acp / sdk** 四种产品形态的 Agent 运行时，四者对组件的"不需要"清单各不相同。不做可拆卸只有两种结局：各形态维护一份拷贝（四份 bug 四份修），或单体内核堆满形态开关（组件数 × 形态数组合爆炸、换模型适配器要动主干）。所以**可拆卸不是加分项，是四种形态共存的前提**；而承载它的候选里只有"进程内插件框架"同时满足轻量组合 + 运行中热替换 + 类型安全，其唯一硬伤（框架本身成为新的风险源）由 **vendoring（框架内置）** 对冲——这解释了 `vendor/` 目录为什么存在：插件框架与框架内置是一对不可拆分的组合拳。

## 1 WHAT：职责边界

- **拥有**：Context（服务注册表 + 类型化事件总线）、fiber（插件身份与生命周期）、Loader（配置行 → 插件实例）、Include（补丁叠层 + `!!js` 表达式）、schemastery（配置 schema 校验）、timer/group/logger-console/cosmokit。
- **不拥有**：进程外隔离（→ `packages/sandbox/`）、跨语言插件、UI 框架、任何具体业务功能（→ `packages/` 各能力组）、框架自动升级（vendored 永远手动同步）。
- **需求面**：R1 可拆卸 · R2 可替换 · R3 可组合 · R4 可扩展 · R5 可回滚；N1 配置可打印审计（`--dump-config`）· N2 卸载不泄漏资源 · N3 兼容受控（manifest 锁 commit）· N4 挂载开销可忽略 · N5 配置错误启动即大声失败。
- **原则**：P1 没有特权内核（模型适配器/工具注册表/会话日志/agent 循环都是平级插件）· P2 注册即副作用（一律返回 disposer）· P3 服务按 key 发现（从不 import 实现类）· P4 组合优于配置 · P5 类型化事件 · P6 失败要大声。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚（0.1.0-rc.5） | 状态 |
|---|---|---|---|---|
| 1 | `vendor/README.md` | `:3` vendored 说明、`:5` 全量 rescope 到 `@deepseek-ai` scope、`:11` 上游 workspace、`:17` manifest 表首行 `cordis/` = `@deepseek-ai/cordis` 4.0.0-rc.7 | 同路径 | VERIFIED |
| 2 | `vendor/cordis/src/context.ts` | `:42` `export class Context`；`:10` `interface Context extends Pick<Fiber,'effect'>` | 同 | VERIFIED |
| 3 | `vendor/cordis/src/events.ts` | `:32` `DispatchMode = 'emit'|'parallel'|'serial'|'bail'|'waterfall'`；`:86/:88` `waterfall` 重载；`:97` `on<K extends keyof Events>(name, listener, options?): () => boolean`；`:112` `EventOptions` | 32 / 86 / 97 | VERIFIED（**行号未变**） |
| 4 | `vendor/cordis/src/fiber.ts` | `:69` 释放资源的 effect 返回器、`:77/:80` generator effect 逐个登记 disposer | 同 | VERIFIED（语义锚） |
| 5 | `vendor/loader/src/index.ts` | 目录存在，行号未逐条复核 | 同 | UNVERIFIED |
| 6 | `vendor/include/src/index.ts` | 目录存在（补丁叠层 + `!!js`），行号未逐条复核 | 同 | UNVERIFIED |
| 7 | `vendor/schemastery/` | 目录存在 | 同 | VERIFIED（路径） |

MAIN 实测 `vendor/` 子目录 = 9 个：`cordis cosmokit group hmr include loader logger-console schemastery timer`（与旧快照的"9 包"计数一致）。

## 2.2 HOW 骨架

### 分层：配置 → 装配 → 运行 → 插件

- 配置层"要什么"：`cordis.yml` + bundle/profile/用户三层补丁叠叠乐。
- 装配层"怎么装"：Loader 逐行创建 **fiber**，Include 合并补丁与 `!!js` 表达式。
- 运行层"怎么协作"：Context 服务注册表 + 事件总线；`ctx.on()` 监听、`ctx.effect()` 注册可撤销副作用、服务按 key 挂载（`ctx.tools` / `ctx.llm` / `ctx.sessions`）。
- 插件层"有什么"：session / tools / llm / shell … 全部平级，可摘可换。

### 五种分发对应五种协作形态

- `emit` 广播不等结果；`parallel` 并行并等全部完成；`serial` 按注册顺序串行、结果逐级传递。
- `waterfall`（`events.ts:86`）与 serial 同类但监听者可**改写**传给下一个的值，也可**不调 `next()`** 直接截停——策略/拦截类插件的挂载点。
- `bail` 一票否决即停。事件语义是公开契约：新事件必须声明 `@mode`。

### 注册即副作用（`events.ts:97`）

- `on()` 是泛型方法：`name` 必须是已声明的事件名（编译期检查）。
- **返回值就是撤销器**（`() => boolean`）：框架层保证任何注册都可逆，卸载时逐个调用完成回滚。
- 这是 HMR 与热插拔的根基，也是全仓库强制纪律。

### 一配置行 = 一插件

- `id` 是配置树内唯一标识（补丁按 id 定位）；`name` 是要加载的 npm 包；`config` 由 schemastery 校验。
- 同一位置换包名即切换实现（模型适配器、执行器、持久化后端皆如此）——R2 的直接演示。

### vendoring 与 rescope 的代价

- D1 vendoring：源码复制进仓库，manifest 锁定版本与 commit，本地修改逐项记录。代价：上游升级需手动同步。
- D2 rescope：`@cordisjs/*` → `@deepseek-ai/*`，packages 以 **peerDependency** 引用 → 全系统单框架实例、发布不占上游包名。代价：同步后要重放改名脚本。
- 守护：CI 闸门 `verify-vendored-links` 检查 vendored 包走工作区链接、registry 无同名副本（旧文提到该项，MAIN 中脚本名未逐条复核 → UNVERIFIED）。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/architecture.md`（"Every part of the product is a plugin…" 的官方出处）
- `docs/subsystems/extensions.md`、`docs/subsystems/invariants.md`、`docs/subsystems/scope.md`
- `docs/subsystems/boot.md`（Loader/Include 叠层的运行时消费方）
- `vendor/README.md`（manifest 与本地修改日志本体）
