# digest-02 · packages/core/：产品主干（会话 · 工具 · 循环）

> **来源**：`dsh-study-docs/详解/第02篇-core产品主干.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示**：MAIN = **v0.2.0-rc.2**。本组是**漂移最重的区域之一**：`SESSION_FORMAT_VERSION` 已从 `0` 升为 **`4`**（`packages/core/session/src/types.ts:89` 实证），并新增 `session-format` + v0→v1→v2→v3→v4 迁移链与 `session-projection` 投影体系；`SessionEventMap` 起始行由旧锚 `~27` 移至 **`:281`**。旧文档中"plan-mode 手工 foldPlanMode"这类叙述已被投影取代。

## 0 WHY（一段）

一个 Agent 要真正干活需要三个器官：**记忆**（会话）、**手脚**（工具执行）、**大脑**（循环与终止判断），`packages/core/` 就是这三个器官的所在地，也是"每个组合都启动的主干"。三个场景逼出三条需求：断线重连要求模型看到的与断线前**逐 token 一致**（→ 会话必须是追加式事件日志，历史是派生视图而非另存的消息数组）；危险操作要求在执行**之前**拦截、加策略、限超时（→ 工具调用必须有唯一守卫管线）；过程可见要求 GUI/SDK/钩子都能实时看到 thinking→tool→result（→ 循环每一环都要事件化）。第四条需求是元层的：主干虽是心脏，也必须遵守"没有特权内核"——`agent-loop` 只是 `Agent` 契约的默认实现，可整体替换。

## 1 WHAT：职责边界

- **拥有**：`session`（追加式 `SessionEvent` 日志 + store + `deriveMessages()`）、`tools`（`ToolDefinition` 注册表与守卫管线）、`agent`（`Agent` 接口、注册表、`agent/*` 事件）、`agent-loop`（默认循环）、`system-prompt`（提示词 + 工具 schema 组装）、`scope`（scoped 上下文基元）。
- **不拥有**：模型词汇与流式协议（→ `packages/llm/`）、日志落盘后端（→ `packages/session/session-persistence-*`）、具体工具（bash/fs/web 各自能力组）、渲染（→ `packages/client/`）。
- **需求面**：R1 会话可持久重建 · R2 工具可安全执行 · R3 循环可观测 · R4 主干可替换；N1 无损 JSON + seq 连续 · N2 可重放 · N3 事件词汇可声明合并扩展 · N4 关键环可 waterfall 截停 · N5 每次状态迁移镜像为 `agent/status`。
- **原则**：P1 **模型可见 ⟺ 已记录**（新模型可见输入 = 新会话事件）· P2 追加只读 · P3 执行必经守卫（旁路不存在）· P4 事件即契约 · P5 依赖接口不依赖实现。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `packages/core/session/src/types.ts` | `:89` `export const SESSION_FORMAT_VERSION = 4`；`:281` `export interface SessionEventMap`；`:288/297/299/301` `turn/start`·`turn/end`·`step/start`·`step/end`；`:309` `user/message`；`:311` `developer/message`；`:330` `system/message`；`:341` `assistant/message` | `SessionEventMap` ~`:27` | **DRIFTED**（行号 + 格式版本） |
| 2 | `packages/core/session/src/index.ts` | `:860` `deriveMessages(): Message[]` | 同文件 | VERIFIED（符号） |
| 3 | `packages/core/session/src/repair.ts` | `:60/:119` `case 'turn/start'`、`:68` `case 'step/start'`（恢复期 seq 修复） | 旧文未列 | VERIFIED（新增锚） |
| 4 | `packages/core/tools/src/index.ts` | `:223` `export interface ToolDefinition extends ToolSchema`；`:164` `'tools/execute'(...)  @mode waterfall`（声明见 `:162`）；`:1604-1606` 注册表 `ctx.waterfall(carrier,'tools/execute',…)`；`:400` `ToolDispatchExecution` | 同文件 | VERIFIED |
| 5 | `packages/core/tools/src/invariant.ts` | `:101-113` `tools/pre-execute → tools/execute → tools/post-execute` 阶段不变量 | 旧文未列 | VERIFIED（新增锚） |
| 6 | `packages/core/agent/src/types.ts` | `:15` `export interface Agent` | 同 | VERIFIED |
| 7 | `packages/core/agent/src/runtime-types.ts` | `:112` `PreStepDecision`；`:172` `status: AgentStatus`；`:280` `'agent/status'`（`@mode emit` `:278`）；`:320` `'agent/pre-step'`（`@mode waterfall` `:318`） | 旧文归到 `agent/src/types.ts` | **DRIFTED**（文件：types → runtime-types） |
| 8 | `packages/core/agent/src/index.ts` | `:358` `setFactory(factory: AgentFactory): () => void` | 同 | VERIFIED |
| 9 | `packages/core/agent-loop/src/index.ts` | `:369` `ctx.effect(() => ctx.agents.setFactory(this), 'agentLoop.setFactory()')` | 同 | VERIFIED |
| 10 | `packages/core/agent-loop/src/agent.ts` | `:277` emit `'agent/pre-step'`；`:305` `session.append('turn/start')`；`:329` `session.append('step/start')`；`:237` `whenIdle()` | 同 | VERIFIED |
| 11 | `packages/core/system-prompt/src` | 目录存在（`docs/subsystems/system-prompt.md` 为本体文档） | 同 | VERIFIED（路径） |

MAIN `packages/core/` 分组另新增（旧文未涉及）：`session-stats`、`session-turn-outline`、`session-checkpoint-policy`、`session-log-deepseek`、`tool-call-timeout-policy` 等消费方——凡旧文档说"core 六包"处，按 **0.2.0 已扩包** 理解。

## 2.2 HOW 骨架

### 一次 turn 流过六个包（官方结构）

- driver 在 `agent-loop` 认领排队输入 → 在 `session` 开 turn → 经 `system-prompt` 组装请求前缀并从日志派生历史 → 走 llm 缝流式取响应 → 经 `tools` 分加工具调用 → 把每条模型可见事实 append 回日志。
- 六包分工：记忆（session）· 组装（system-prompt）· 执行（tools）· 接口（agent）· 驱动（agent-loop）· 基元（scope）。

### 事件溯源：turn / step 边界即契约

- `turn` = 一次完整交互轮次；`step` = 轮内"一次模型请求 + 它触发的工具执行"，一个 turn 可含多个 step。
- 四个边界事件（`types.ts:288/297/299/301`）payload 即公开协议，任何插件可监听、任何 UI 可渲染。
- `assistant/message`（`:341`）携带 `usage` 与精确流块：模型输出与它的账目同处一条记录，**没有独立的 usage 记录**；取消时把已交付前缀落成该事件并标 `interrupted: true`。
- `user/message`（`:309`）同时承载真人提示、合成 `agent.inject()` 上下文与目标续轮，靠 `source` 区分。

### 守卫管线：工具调用的唯一入口

- `ToolDefinition = ToolSchema + output + execute`：模型永远只见 schema，碰不到 execute 内部。
- 管线五段：预策略 → 单调守卫 → 分发 → 后策略 → 结果校验（`output` 声明的 JSON Schema 每次成功结果都要过）。
- `tools/execute` 是 **waterfall**：监听者不调 `next()` 即截停；wrapper 可替换 `exec.signal` 但**不能移除**它（`:400` 注释 + 注册表融合捕获的 caller signal）。
- 不变量闭环：`tools/pre-execute` → `tools/execute` → `tools/post-execute` 顺序违反即 fail（`invariant.ts:101-113`）。

### Agent 接口是唯一对外表面

- `Agent { id, session, status, ctx, send(), cancel(), whenIdle() }`：暴露 `session` 而不暴露"消息数组"——一切读操作走日志派生。
- `agent/pre-step`（waterfall，返回 `PreStepDecision = {kind:'reject'} | …`）与 `agent/status`（emit，每次迁移都镜像，重复迁移由不变量拒绝）。
- loop 可换：`ctx.agents.setFactory()` 让别的实现注册自己的驱动，消费者只依赖 `agent`。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/core.md`（主干总述）、`docs/subsystems/session.md`、`docs/subsystems/tools.md`
- `docs/subsystems/agent-team.md`、`docs/subsystems/system-prompt.md`、`docs/subsystems/scope.md`
- `docs/subsystems/invariants.md`（守卫/顺序不变量）、`docs/subsystems/session-projection.md`（**0.2.0 新增，取代手写折叠**）
- `docs/capability-seams.md`（缝表权威数据）
