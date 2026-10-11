# anchors.md · load-bearing 断言的检索侧车（context7 形态）

**用途**：把 12 篇解读里"承重"的结论逐条钉到可 grep 的坐标上。格式：
`claim | 旧锚（@v0.1.0-rc.5，源文档所给） | 重锚（@v0.2.0-rc.2，本轮 Grep 实证） | 状态`

**状态四态**：
- **VERIFIED** = MAIN 上 grep 命中且语义一致（行号为实测）。
- **DRIFTED** = 结论仍成立，但路径/行号/符号名已变（给出新坐标）。
- **N-A@0.2.0** = 该事物在 MAIN 不存在（已删/已改名/被机制取代）；括号注明取代者。
- **UNVERIFIED** = 本轮未逐字复验，**不可当事实引用**，只能当线索。

**路径约定**：**旧锚列照抄源文档 @0.1.0 的写法**（含 `packages/shell/src/…` 这类当时的顶层形式、以及 `native/landlock-run/README.md`、`examples/jsonrpc-agent/minimal.py`、`docs/release.md` 等已消失路径），它们在 MAIN 不存在属预期而非笔误；**重锚列一律写成可 `Test-Path` 的 MAIN 完整相对路径**（分组目录不可省，如 `packages/shell/shell/src/…`）。

**基准**：MAIN = `deepseek-harness` @ **0.2.0-rc.2**（316 包 / 55 分组）；AUX = `.harness-017rc2-wt` @ 0.1.7-rc.2。
**总计**：100 条 · VERIFIED 65 / DRIFTED 29 / N-A@0.2.0 5 / UNVERIFIED 1。（其中 4 条属"0.1.0 无此物、0.2.0 新增"，在 VERIFIED 内单独标为 `N-A@0.1.0 → VERIFIED@0.2.0`）

---

## 01 · vendor / Cordis 框架层

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| 事件分发模式是闭集 `emit\|parallel\|serial\|bail\|waterfall` | `vendor/cordis/src/events.ts:32` | `vendor/cordis/src/events.ts:32` `DispatchMode` | VERIFIED |
| `ctx.on()` 返回 disposer（订阅即资源，需释放） | `vendor/cordis/src/events.ts:97` | `vendor/cordis/src/events.ts:97` | VERIFIED |
| `Context` 是依赖解析与生命周期根 | `vendor/cordis/src/context.ts` | `vendor/cordis/src/context.ts:42` `class Context` | VERIFIED |
| fiber 承载插件协程生命周期（setup/start/stop） | `vendor/cordis/src/fiber.ts` | `vendor/cordis/src/fiber.ts:10/:69/:77/:80` | VERIFIED |
| vendor 共 9 个包，全部 rescope 为 `@deepseek-ai/*` | 旧称 cordis/cosmokit/… | 实测目录：`cordis cosmokit group hmr include loader logger-console schemastery timer` | VERIFIED |
| vendored Cordis 版本 = 4.0.0-rc.7 | `vendor/README.md` | `vendor/README.md:3/:5/:11/:17` | VERIFIED |
| Loader / Include 的关键行号 | 旧文给了行号 | 本轮未逐条复验 | UNVERIFIED |

## 02 · core 产品主干（session / agent / tools）

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| 会话格式版本号 | `packages/core/session/src/types.ts:89`（旧值 0） | `packages/core/session/src/types.ts:89` `SESSION_FORMAT_VERSION = 4` | DRIFTED（值 0→4） |
| 会话事件类型总表 | `packages/core/session/src/types.ts:27` | `packages/core/session/src/types.ts:281` `SessionEventMap` | DRIFTED（行号） |
| `deriveMessages()` 从事件流派生模型可见消息 | `packages/core/session/src/index.ts` | `packages/core/session/src/index.ts:860` | VERIFIED |
| `ToolDefinition` 是工具契约根类型 | `packages/core/tools/src/index.ts` | `packages/core/tools/src/index.ts:223` | VERIFIED |
| 工具执行走 `tools/execute` 事件 | `packages/core/tools/src/index.ts:164` | `packages/core/tools/src/index.ts:164` | VERIFIED |
| `tools/pre-execute` / `post-execute` 以 waterfall 包装执行 | 旧文叙述 | `packages/core/tools/src/index.ts:1604-1606` `ctx.waterfall(...)` | VERIFIED |
| `Agent` 是代理声明类型 | `packages/core/agent/src/types.ts:15` | `packages/core/agent/src/types.ts:15` | VERIFIED |
| `agent/status` 是 emit 型事件 | 旧文叙述 | `packages/core/agent/src/runtime-types.ts:280`（emit 落点 `:278`） | VERIFIED |
| `agent/pre-step` 是 waterfall 型事件 | 旧文叙述 | `packages/core/agent/src/runtime-types.ts:320`（`@mode waterfall` `:318`）、`:112` `PreStepDecision` | VERIFIED |
| 循环实现在 agent-loop 内（`turn/start` 等） | `packages/core/agent-loop/src/agent.ts` | `packages/core/agent-loop/src/agent.ts:277/:305/:329/:237`；`packages/core/agent-loop/src/index.ts:369` | VERIFIED |

## 03 · shell 能力缝

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| `ShellExecSpec` 定义执行规格 | `packages/shell/src/types.ts:24` | `packages/shell/shell/src/types.ts:111` | DRIFTED（行号） |
| `ShellExecutor` 是 Service（能力缝三件套形态） | `packages/shell/src/index.ts` | `packages/shell/shell/src/index.ts:64` `class ShellExecutor extends Service`；`:84` `abstract resolve` | VERIFIED |
| 四种执行器实现：本地/sandbox × bash/pwsh | 旧文列 4 包 | `packages/shell/bash-local/src/index.ts:120`、`packages/shell/bash-sandbox/src/index.ts:85-86`、`packages/shell/pwsh-local/src/index.ts:163`、`packages/shell/pwsh-sandbox/src/index.ts:92` | VERIFIED |
| 托管环境变量前缀 DSH_* 由 shell 定义、env 包消费 | `packages/shell-env/src/index.ts` | `packages/shell/shell-env/src/index.ts:3` 从 `@deepseek-ai/dsh-shell` import `DSH_ENV_PREFIX`；`:15` dsh-home-paths；`:30/:41/:51` | VERIFIED |

## 04 · llm 与 typert

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| `ContentBlockMap` 定义内容块类型表 | `packages/llm/llm/src/types.ts` | `packages/llm/llm/src/types.ts:137` | DRIFTED（行号） |
| `Message` 是模型可见消息根类型 | `packages/llm/llm/src/message.ts` | `packages/llm/llm/src/message.ts:196`（`:110/:167` 相关） | DRIFTED（行号） |
| `LlmAdapter` 是适配器契约 | `packages/llm/llm/src/index.ts` | `packages/llm/llm/src/index.ts:208` | DRIFTED（行号） |
| `LlmRuntime` 同时是 typert 远端服务（两条通道相接） | 旧文未述 | `packages/llm/llm/src/index.ts:342` `class LlmRuntime extends TypertRemoteService` | VERIFIED（0.2.0 新增） |
| typert 三张表：LookupMap / ContextMap / Codec | `packages/typert/protocol/src/types.ts` | `packages/typert/protocol/src/types.ts:36/:39/:270` | VERIFIED |
| wire 只传 endpoint + args（类型靠生成契约两侧还原） | 旧文叙述 | `packages/api/gateway/src/types.ts:11/:48/:70/:84/:138` | VERIFIED |
| 0.2.0 新增多路复用事件流 `/api/remote.mux` | 旧文无 | `packages/api/gateway/src/stream-protocol.ts:7`；`$events` `:10`；`$events/result` `:13`；`packages/api/gateway/src/stream-server.ts:43` `RemoteStreamMuxServer` | N-A@0.1.0 → VERIFIED@0.2.0 |
| `llm-pi-ai` provider 包存在 | `packages/llm/llm-pi-ai` | 包目录实测存在 + `.github/workflows/pi-ai-provider-e2e.yml` | VERIFIED |

## 05 · 执行世界（fs / subprocess / sandbox）

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| fs 能力缝的类型面（读/写/观察） | `packages/fs/src/types.ts` | `packages/fs/fs/src/types.ts:14/:16/:60/:62/:67` | VERIFIED |
| 未被观察过的文件不可写（FS_NOT_OBSERVED） | 旧文叙述 | `packages/fs/fs-observation-policy/src/index.ts:82` `FS_NOT_OBSERVED`；`:85` `FS_NOT_FOUND`；`:62-63/:69-70` | VERIFIED |
| 写意图/编辑意图是独立事件 | 旧文未给行号 | `packages/fs/fs-observation-policy/src/index.ts:119` `'fs/write-intent'`、`:122` `'fs/edit-intent'` | VERIFIED |
| sandbox 模式与 enforcement 分离 | `packages/sandbox/sandbox/src/index.ts` | `packages/sandbox/sandbox/src/index.ts:30/:33/:40/:60/:70/:82/:96` | VERIFIED |
| 沙箱升级（escalation）走审批闭集 | 旧文未述 | `packages/sandbox/sandbox/src/escalation.ts:28-30/:41/:104/:186` | N-A@0.1.0 → VERIFIED@0.2.0 |
| Linux 沙箱原生模块 = `native/landlock-run` | `native/landlock-run/README.md` | **不存在**；改为 `native/system`（`native/README.md:5`：Landlock launcher + POSIX flock binding + `system/docs/release.md`） | **DRIFTED（重组）** |
| 旧文的 `e2b` / `code-runtime` 云执行包 | `packages/…` | MAIN 分组清单无 | N-A@0.2.0 |

## 06 · 记忆的落地（persistence / query / compaction）

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| `sessionPersistence` 是能力缝（Service 面） | `packages/session-persistence/src/index.ts` | `packages/session/session-persistence/src/index.ts:50/:62/:78/:86/:92/:98/:104/:135` | VERIFIED |
| 持久化错误族是显式类型（并发/缺失/损坏等） | 旧文未给行号 | `packages/session/session-persistence/src/errors.ts:13/:22/:31/:40/:59/:68/:85/:93/:111` | VERIFIED |
| JSONL 是默认实现 | `packages/session-persistence-jsonl` | `packages/session/session-persistence-jsonl/src/index.ts:36/:84/:90/:273/:457/:484/:517/:547/:840/:1122/:1155`；`packages/session/session-persistence-jsonl/src/generation.ts:58/:71/:99/:106/:112/:122/:130/:146/:162/:171` | VERIFIED |
| 事件面（surface）有独立类型 | 旧文未给行号 | `packages/session-query/session-query/src/types.ts:24` `SessionEventSurface`、`:27` | VERIFIED |
| compaction 有显式结果结构 | 旧文叙述 | `packages/compaction/compaction/src/types.ts:94`；`packages/compaction/compaction/src/index.ts:32/:106`；`packages/compaction/compaction/src/invariant.ts:59`；全形见 `packages/extensions/tool-cordis/src/api-catalog.ts:4778`（`{compactionId, sourceCommandId?, startSeq, summarySeq, endSeq, summary, shadowedRange, shadowedSeqs, shadowedTokenCount}`） | VERIFIED |
| 压缩是"遮蔽"而非删除（日志 append-only） | 旧文叙述 | `shadowedRange` / `shadowedSeqs` 字段实证（同上 `packages/extensions/tool-cordis/src/api-catalog.ts:4778`） | VERIFIED |
| 会话格式存在迁移链 v0→v4 | 旧文未述 | `scripts/gen-session-format-catalog.ts` + `package.json:185` `verify-session-format-catalog`；`SESSION_FORMAT_VERSION = 4` | N-A@0.1.0 → VERIFIED@0.2.0 |

## 07 · 多智能体（subagent / workflow / jobs）

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| subagent 类型面（请求/能力/结果） | `packages/subagent/src/types.ts` | `packages/subagent/subagent/src/types.ts:130/:132-135/:145/:344` | VERIFIED |
| 不支持的能力显式报错 | 旧文叙述 | `packages/subagent/subagent/src/index.ts:596-608` `UNSUPPORTED_CAPABILITY`；`:647-656` | VERIFIED |
| 提供者族：ACP / Claude Code / Codex / dsh-sdk / in-process / fork | 旧文列部分 | `packages/subagent` 实测 10 包含 `subagent-acp`、`subagent-claude-code`、`subagent-codex`、`subagent-dsh-sdk`、`subagent-fork-in-process`、`subagent-in-process-driver`、`subagent-spawn-in-process`、`tool-subagent`、`tool-subagent-control` | VERIFIED |
| `WorkflowStartRequest` 是工作流入口 | `packages/workflow/src/runtime-types.ts` | `packages/workflow/workflow/src/runtime-types.ts:19` | VERIFIED |
| 工作流运行时是 worker-thread 包 | `packages/workflow/workflow-worker-thread` | **不存在**；改为 `packages/workflow/workflow-ptc`（`packages/workflow/workflow-ptc/src/runtime.ts:168-170`、`packages/workflow/workflow-ptc/src/index.ts:108` `z.natural().min(1).default(1000)`）+ 独立 `packages/ptc-runtime` | **DRIFTED（重组）** |
| Job 状态与种类是闭集 | `packages/jobs/src/view.ts` | `packages/jobs/jobs/src/view.ts:19` `JobStatus`、`:32` `JobKindMap` | VERIFIED |

## 08 · 人机协作与治理

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| 审批结果闭集 | `packages/interaction/user-approval/src/index.ts:14~29` | `packages/interaction/user-approval/src/types.ts:32` `ApprovalOutcome = 'allowed-once'\|'rejected'\|'cancelled'\|'unavailable'` | DRIFTED（文件） |
| `ApprovalRequestId` 是 branded 配对键 | 旧文引 `:21` | `packages/interaction/user-approval/src/types.ts:17` | DRIFTED |
| 目标引用带 revision（CAS） | `packages/goal/goal/src/types.ts:11~19` | `packages/goal/goal/src/types.ts:20` `GoalRef { id, revision }`（`:17` `GoalId`） | DRIFTED（行号） |
| 目标四阶段 + 机器可路由阻塞码 | 同文件 | `packages/goal/goal/src/types.ts:45` `GoalPhase`、`:52` `GoalBlockReason`、`:60` `GoalSnapshot` | VERIFIED |
| plan 状态由会话投影承载（不再手写折叠） | `packages/plan/plan-mode` 的 `foldPlanMode(events)` | `packages/plan/plan-mode/src/index.ts:177` `static inject = ['tools','systemPrompt','sessionProjections']`、`:227` `ctx.sessionProjections.register(planProjectionDefinition)`；`foldPlanMode` 仅剩 `packages/plan/plan-mode/tests/plan-mode.spec.ts:78` | **DRIFTED（机制）** |
| `plan/mode` 是整值替换的 log-only 事件 | 旧文叙述 | `packages/plan/plan-mode/src/index.ts:53` `'plan/mode': { active: boolean }`；`:197` `ctx.on('agent/pre-step', …)`；`:12` 注释 | VERIFIED |
| 工具超时由 guard 包强制且永不发模型 | `packages/guard/timeout-policy` | `packages/core/tools/src/index.ts:260-261`（`@deepseek-ai/dsh-tool-call-timeout-policy` 作为 `tools/execute` 包装器）；包本体 `packages/guard/timeout-policy` 仍在 | VERIFIED |
| 三个 goal 工具 | `packages/goal/tool-goal` | `packages/goal/tool-goal/src/index.ts:145/:239/:257` | VERIFIED |
| `GoalActivation` / `GoalProjection` 新概念 | 无 | `packages/goal/goal/src/types.ts:72/:107/:119` | N-A@0.1.0 → VERIFIED@0.2.0 |

## 09 · 应用层 cli 与 boot

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| 参数族 `--profile` / `--patch` / `--dump-config` | `apps/cli/src/args.ts` | `apps/cli/src/args.ts:10-13`（解析落点 `:34/:45/:120/:129/:135/:168/:171`） | VERIFIED |
| bin 按模式动态 import | `apps/cli/src/bin.ts:27~50` | `apps/cli/src/bin.ts:55-56`（`case 'dump-config'` → `await import('./dump-config.ts')`）、`:65-66` | DRIFTED（行号） |
| dump 与启动共用 include 算法 | `app-boot/README.md:22` | `packages/boot/app-boot/src/index.ts:430` `renderConfigDump` | VERIFIED |
| 根 include 挂载点 | 旧文未给行号 | `packages/boot/app-boot/src/index.ts:538` `mountRootInclude`；`:972` `boot` | VERIFIED |
| 启动条目校验函数 `assertEntriesLoaded`/`assertEntriesActivated` | `app-boot/README.md:12~15` | **grep 0 命中**；改为 `packages/boot/app-boot/src/index.ts:925` `auditStartupEntries` | **DRIFTED（符号名）** |
| 失败大声安装点与清理超时 | 旧文未给行号 | `packages/boot/app-boot/src/index.ts:679` `installFailLoud`；`:637` `FAIL_LOUD_RELEASE_TIMEOUT_MS = 2_000` | VERIFIED |
| profile 模板自举 API | 旧文未给行号 | `apps/cli/src/plugin.ts:4`（`DEFAULT_PROFILE_BUNDLES`/`initProfile`/`PROFILE_TEMPLATES`/`readProfileCompatibility`/`resolveProfileDir`）；`packages/boot/app-boot/src/profile.ts:169/:179/:704/:731` | VERIFIED |
| 内置 agent 预设目录 | `apps/cli/config/agent-presets` | **不存在**（`apps/cli/config` 现只有 `examples/`）；改为 `packages/preset/agent-presets`（+ `agent-preset`、`agent-preset-registry`、`persona`） | **DRIFTED（路径）** |

## 10 · GUI 前后端

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| webserver 是纯 `node:http` 载体（Service） | `packages/host/webserver/src/index.ts` | `packages/host/webserver/src/index.ts:125` `class WebServer extends Service` | VERIFIED |
| 默认 loopback，`0.0.0.0` 是显式暴露 | 旧文 `Config` | `packages/host/webserver/src/index.ts:59` `Config`、`:61` `host: '127.0.0.1' \| '0.0.0.0'` | VERIFIED |
| fallback 席位唯一，二次注册抛错 | 旧文叙述 | `packages/host/webserver/src/index.ts:198-201` | VERIFIED |
| index 注入是结构化对象 | `client/modules` 的 `tapIndex` | `packages/host/webserver/src/injections.ts:12/:15` `IndexInjection` | **DRIFTED（机制）** |
| 连接/重连状态机持有者 | `packages/client/runtime/src` | `packages/client/connection/src/client/connection.ts:77` `ConnectionController` | **DRIFTED（包）** |
| `/api` RPC 桥的宿主注册 | `packages/host/apiproxy` | **该目录不存在**；`packages/client/connection/src/index.ts:144-158` 注册 `/api` prefix 路由（`src/api-path.ts:7` `API_PATH = '/api'`），端点认领在 `packages/api/gateway/src/index.ts:234` `rpc.intercept('/api', …)`；能力面拆入 `packages/api` 分组 9 包（`remotes`、`gateway`、`{session,settings,terminal,workspace,job,account}-controller`、`workspace-files`；包名前缀 `@deepseek-ai/dsh-api-*`，分组表 `packages/api/README.md:27-36`）；包名残留见 `packages/host/open-in-app/README.md:32` | **DRIFTED（包拆分）** |
| 浏览器入口对象 | `AppWebEntry`（client-web） | `packages/client/web/src/boot.ts:23` | DRIFTED |
| 三层里的 runtime / web-react 两个包 | `client/runtime` + `client/web-react` | **两者均不存在**；承接者为 `client/store`、`client/resources`、`client/ui-renderer`、`client/web` | **N-A@0.2.0** |
| slot 贡献需 `ctx.slots.inject` 包裹 | 旧文只述 `slots.register` | `packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:69-70` | **DRIFTED（契约）** |
| UI 插件数量 | "39 个 `ui-*`" | 实测 `packages/client` 下 **54 个 `ui-*`**（含 ~15 个 `ui-settings-*`） | DRIFTED（计数） |

## 11 · 协议与 SDK

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| TS 客户端主体 | `packages/sdk/client/src` | `packages/sdk/client/src/client.ts:185` `class HarnessClient`；`packages/sdk/client/src/types.ts:24` `HarnessClientOptions`、`:70` `RunResult` | VERIFIED |
| ACP 服务的依赖面 | `packages/acp/acp/src` | `packages/acp/acp/src/index.ts:60` `static name = 'acp'`、`:62` `inject = ['agents','llm','sessionPersistence','sessions']`、`:75` `AcpConfig`、`:86` `Config` | VERIFIED |
| hook 方言闭集 `'claude-code'\|'codex'` | `packages/hooks/hook-protocol` | `packages/hooks/hook-protocol/src/types.ts:48` `HookDialect`（`:56` `CommandHook`、`:68` `MatcherGroup`、`:79` `MatcherMode`、`:89` `HookOutput`） | VERIFIED |
| 钩子合并决策是闭集 | 旧文未给行号 | `packages/hooks/hook-protocol/src/merge.ts:12` `MergedDecision = 'allow'\|'ask'\|'deny'\|'none'` | VERIFIED |
| 钩子默认超时 600s | 旧文未述 | `packages/hooks/hook-protocol/src/runner.ts:20` `DEFAULT_HOOK_TIMEOUT_MS = 600_000` | VERIFIED |
| MCP 工具注入 `tools` 注册表 | `packages/mcp/mcp-client` | `packages/mcp/mcp-client/src/index.ts:31` `static name = 'mcp-client'`、`:34` `inject = ['tools']`；`packages/mcp/mcp-client/src/tools.ts:28/:36/:39/:196` | VERIFIED |
| MCP 双传输（stdio / streamable http） | 旧文未给行号 | `packages/mcp/mcp-client/src/index.ts:52` `StdioConfig`、`:80` `StreamableHttpConfig`；`packages/mcp/mcp-client/src/connection.ts:29/:41/:49/:57/:97/:103` | VERIFIED |
| Python 高层入口类 `DeepSeekHarness` | `python/sdk/src/deepseek_harness/client.py` | `python/sdk/src/deepseek_harness/api.py:49`（低层 `python/sdk/src/deepseek_harness/client.py:39` `HarnessClient`、`:25` `HarnessConfig`、`:539` `NotificationSubscription`） | DRIFTED（文件） |
| Python 最小样板 | `examples/jsonrpc-agent/minimal.py:30~39`（含 `cordis=str(CONFIG.resolve())`） | `python/sdk/examples/minimal.py:34-42` —— **不再传 `cordis=`/`session_root=`**，改为 `--dsh-home` + `--profile sdk-minimal` | **DRIFTED（契约）** |

## 12 · 工程体系

| claim | 旧锚 | 重锚 @0.2.0-rc.2 | 状态 |
|---|---|---|---|
| `check:all` = `tsx scripts/run-gates.ts check-all` | `package.json:48` | `package.json:82` | DRIFTED（行号） |
| `doc-sync` 聚合文档闸门 | `package.json:127` | `package.json:193` | DRIFTED（行号） |
| `verify-tool-catalog` = `gen-tool-catalog.ts --check` | `package.json:113` | `package.json:167` | DRIFTED（行号） |
| 预算闸门 `verify-doc-budgets` | `package.json` | `package.json:129`；`scripts/doc-budgets.manifest.json` 存在 | VERIFIED |
| 生成器规模 | 旧文未计数 | `scripts/gen-*.ts` **26 个**、`scripts/verify-*.ts` **70 个** | VERIFIED（本轮计数） |
| workflow 数量 | 15 个 | 实测 **20 个** `.github/workflows/*.yml` | DRIFTED（计数） |
| Agent Notes 数量 | 1087 篇 | 实测 **2444 个 `.md`** | DRIFTED（计数） |
| 笔记四态归档策略 | `.agents/notes/README.md` | `:12` proposed / `:13` implemented（事实随代码同步）/ `:14` rejected / `:38-42` 冻结归档 + `scripts/verify-archived-agent-notes.ts` / `:56` `verify-agent-note-format` / `:19` 禁止 `INDEX.md` | VERIFIED |
| 6 个可运行 examples 组合 | `examples/`（顶层） | **目录不存在**；拆为 `apps/cli/config/examples/{github-review,mcp-memory}`、`python/sdk/examples/`，新增 `benchmarks/`（7 项） | **N-A@0.2.0** |
| 原生沙箱模块独立发布 | `native/landlock-run` + 独立 workflow | `native/system`（`native/README.md:5`）；`.github/workflows/node-addon-system.yml` + `node-addon-system-release.yml`；`test:coverage` 前置 `build:native-system`（`package.json:57`） | DRIFTED（路径） |

---

## 附：settings 面（跨篇最高优先级漂移，涉及 digest-02/03/06/08/09/10）

| claim | 旧锚 @0.1.0-rc.5 | 重锚 | 状态 |
|---|---|---|---|
| 旧注册 API `installSection(...)` | `packages/settings/**` | MAIN `packages/settings` **grep 0 命中** | **N-A@0.2.0** |
| 旧命名空间 API `settingsNamespace` | `packages/settings/**` | MAIN `packages/settings` **grep 0 命中** | **N-A@0.2.0** |
| 现行形态：`SettingsForms` 服务 | 无 | MAIN `packages/settings/settings/src/index.ts:223` `export class SettingsForms extends Service`；`:431` `export default SettingsForms` | VERIFIED |
| 现行 descriptor / path op / 冲突错误 | 无 | `settings/src/index.ts:20` `SettingsDescriptor`、`:34` `SettingsDescribeOptions`、`:41` `settings: SettingsForms`、`:45` `SettingsConflictError`、`:81` `SettingsPathOp` | VERIFIED |
| volatile Config 投影（跨代实锚同线） | 旧文述注册式 | AUX `.harness-017rc2-wt/packages/settings/settings/src/index.ts:223/:266` 与 MAIN `:223` 同行号 | VERIFIED（peer-adapt 锚） |

> **写代码时的处置**：凡详解里出现"settings 注册 API"的句子，一律视为 **0.1.0 事实、0.1.7+ 已变**，改读 **peer-adapt**（0.1.7/0.2.0 适配说明），不要照抄 `installSection` / `settingsNamespace`。
