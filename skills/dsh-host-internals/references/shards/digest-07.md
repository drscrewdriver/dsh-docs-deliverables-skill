# digest-07 · 多智能体：subagent / workflow / jobs

> **来源**：`dsh-study-docs/详解/第07篇-多智能体.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示**：MAIN = **v0.2.0-rc.2**。两处结构性漂移：① 旧文把 workflow 引擎落在 **`packages/workflow/workflow-worker-thread/`**，该目录在 MAIN **不存在**（`Test-Path` False）——worker/脚本执行改由 **`packages/workflow/workflow-ptc`** 承担，并新增独立分组 **`packages/ptc-runtime/`**（`ptc-runtime` + `ptc-runtime-node`，见 `docs/subsystems/ptc-runtime.md`）；② `WorkflowStartRequest` 从 `workflow/src/types.ts` 移到 **`workflow/src/runtime-types.ts:19`**，`JobStatus`/`JobKindMap` 从 `jobs/src/types.ts` 移到 **`jobs/src/view.ts:19/:32`**。

## 0 WHY（一段）

第 02 篇的循环驱动**一个** Agent，真实任务常常要"把活分出去"：并行调研（开几个子代理各查一块，主代理汇总）、后台运行（长任务在后台跑，同时继续对话）、编排脚本（主代理写一段 JS，脚本启动一批子代理、收集结果、合并返回）。三个能力组各答一问：**subagent** 把任务委托出去、**workflow** 让模型写脚本批量编排、**jobs** 提供两者共用的后台任务运行时。选型底线是两条安全纪律：**能力不符即大声拒绝**（绝不"接受然后忽略"）与**扇出有界**（脚本无法观察或改写 `maxTotalAgents`）。

## 1 WHAT：职责边界

- **拥有**：`subagent`（`ctx.subagents` 注册表 + `SubagentCapabilities` + `SubagentProvider`）、providers（`subagent-spawn-in-process`、`subagent-fork-in-process`、`subagent-in-process-driver`、`subagent-acp`、`subagent-codex`、`subagent-claude-code`、`subagent-dsh-sdk`）、`tool-subagent` / `tool-subagent-control`；`workflow`（`ctx.workflowEngine`）+ `workflow-ptc` + `tool-workflow` + `tool-ralph`；`jobs` + `jobs-local` + `tool-jobs`。
- **不拥有**：进程隔离（脚本跑在 worker 线程**不是**沙箱进程；子代理隔离由各提供者决定）、定时任务（→ `packages/schedule/`）、同会话目标（→ `packages/goal/`）、工具守卫管线（→ core/tools，两者都注册进 `ctx.tools`）。
- **需求面**：R1 委托可插拔（多提供者按名共存）· R2 能力显式声明 · R3 可继续会话（continuable）· R4 模型可写编排 · R5 后台统一管控；N1 血缘贯通（parent 必填，cwd/lineage/depth 从父会话传递）· N2 扇出有界 · N3 结算以 `user/message` 注入（父代理不轮询）· N4 父子会话各自落盘可独立重放 · N5 能力不符 → 启动前 typed error。
- **原则**：P1 多提供者共存（区别于 bash 单执行器）· P2 **fail loud, no silent degradation** · P3 **方法存在即能力**（`prepareContinuable` + TS 收窄）· P4 数据与代码分离（meta/args 纯 JSON 先校验后求值）· P5 统一后台。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `packages/subagent/subagent/src/types.ts` | `:130` `SubagentCapabilities`（`:132` `outputSchema`、`:133` `depthLimit`、`:134` `toolFilter`、`:135` `persona`）；`:145` `SubagentStartRequest`；`:344` `SubagentProvider` | `18~20`（能力注释） | **DRIFTED**（行号） |
| 2 | `packages/subagent/subagent/src/index.ts` | `:596-608` `UNSUPPORTED_CAPABILITY`（含 "no prepareContinuable capability" 文案）；`:647-656` 能力标志 → 请求选项的映射校验 | 目录级 | VERIFIED |
| 3 | `packages/subagent/subagent/src/continuation.ts` | 文件存在（可继续子代理编排） | 同 | VERIFIED（路径） |
| 4 | `packages/subagent/subagent/src/child-agent.ts` | `:211-218` `deployment:persona-prefix` 注入 + `childCtx.tools.restrict(...)` 实现 persona/toolFilter | 旧文未列 | VERIFIED |
| 5 | `packages/workflow/workflow/src/runtime-types.ts` | `:19` `WorkflowStartRequest` | `workflow/src/types.ts` | **DRIFTED**（文件） |
| 6 | `packages/workflow/workflow/src/types.ts` | `:46` `WorkflowMeta` | 同文件 | VERIFIED |
| 7 | `packages/workflow/workflow-worker-thread/src` | **不存在**（`Test-Path` False） | 旧文主锚 | **N/A@0.2.0** |
| 8 | `packages/workflow/workflow-ptc/src/runtime.ts` · `index.ts` | `runtime.ts:168-170` `maxTotalAgents` 兜底与强制；`index.ts:108` `z.natural().min(1).default(1000)` | 无 | N/A@0.1.0 → VERIFIED@0.2.0 |
| 9 | `packages/ptc-runtime/{ptc-runtime,ptc-runtime-node}` | 分组存在（`docs/subsystems/ptc-runtime.md` 为本体文档） | 无 | N/A@0.1.0 |
| 10 | `packages/jobs/jobs/src/view.ts` | `:19` `JobStatus = 'running' \| 'stopping' \| 'completed' \| 'killed' \| 'failed'`；`:32` `JobKindMap` | `jobs/src/types.ts` | **DRIFTED**（文件） |
| 11 | `packages/subagent/{tool-subagent,tool-subagent-control}`、`packages/jobs/{jobs-local,tool-jobs}`、`packages/workflow/{tool-workflow,tool-ralph}` | 目录全部存在（分组清单实测） | 同 | VERIFIED（路径） |

## 2.2 HOW 骨架

### 委托：按名注册的多提供者注册表

- `ctx.subagents` 允许**多个提供者实现在同一 context 内共存并按名字选择**（官方对照：bash 只允许一个 executor）——所以委托对象是部署形态问题（本机进程 vs 外部产品），接口统一、实现并存。
- 能力是**静态描述符**：`SubagentCapabilities` 四个布尔与请求选项一一对应，服务在 `start()` 之前校验；需要某能力而提供者没有 → typed error（`UNSUPPORTED_CAPABILITY`）。
- **continuable 以方法存在与否表达**：`SubagentProvider.prepareContinuable` 存在即支持可继续子代理，TypeScript 收窄就是发现机制——不需要额外元数据字段。
- persona 与 toolFilter 的落地方式：`deployment:persona-prefix` 事件注入 + `childCtx.tools.restrict()`（`child-agent.ts:211-218`）。

### 编排：模型写的脚本，引擎先校验数据

- 工作流是"a model-written orchestration SCRIPT that starts subagents"——`meta` / `args` 是**纯 JSON 数据**，引擎按 schema 校验 `meta` 并在任何脚本求值**之前**大声拒绝。
- 脚本内 `agent()` 经 `ctx.subagents` 扇出；`parent` 必填，所有孩子归属调用 Agent（N1）。
- 风险有界的三根支柱：不在宿主主线程执行、`vm` 上下文不给文件系统/网络 API、`maxTotalAgents` 由引擎强制且**脚本不可观察/不可改写**（0.2.0 默认 1000，见 `workflow-ptc/src/index.ts:108`）。

### 后台：所有长任务共用一套控制面

- 后台 bash 与后台子代理都注册进 `ctx.jobs`，模型只学一套 `job_kill` / `job_list` / `job_output`。
- `JobKindMap` 是合并可扩展映射（当前 kind：`bash`、`subagent`），注册表把每种 kind 当不透明 id 命名空间；`JobSnapshot.detail` 放提供者特有事实。
- 结算通知经 `agent.inject` 以 `user/message` 注入父代理 inbox——父代理零轮询，醒来即继续。
- 会话分离：父子各自独立日志，可分别重放；跨会话只传结算消息。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/subagent.md`、`docs/subsystems/workflow.md`、`docs/subsystems/jobs.md`
- `docs/subsystems/ptc-runtime.md`（**0.2.0 承接 worker 执行的新子系统**）、`docs/subsystems/agent-team.md`
- `docs/subsystems/commands.md`、`docs/capability-seams.md`（`ctx.subagents` / `ctx.jobs` 缝表）
