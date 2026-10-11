# routing.md · 读者路由表（草案）

**用法**：先按"你要做的事"定位一行 → 读该 digest 建立心智模型（≤8KB）→ 需要权威细节时打开 MAIN 的 `docs/subsystems/*.md` → 要改代码时直接跳到"关键源码"（路径/行号均为本轮 grep 实证，MAIN = `deepseek-harness` @ 0.2.0-rc.2）。
**跨代提醒**：如果你手上是 **0.1.0-rc.5** 的旧代码/旧文档，先查 `anchors.md` 对应篇节确认它有没有漂移；**settings 相关一律走 peer-adapt**（见本文末）。

## A. 装配与生命周期

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| 搞懂插件/服务/事件到底怎么跑起来（`emit\|parallel\|serial\|bail\|waterfall`、`ctx.on` 返回 disposer、fiber 生命周期） | digest-01 | `docs/subsystems/extensions.md`、`docs/architecture.md` | `vendor/cordis/src/events.ts:32`（`DispatchMode`）、`:97`（`on`）；`vendor/cordis/src/context.ts:42`；`vendor/cordis/src/fiber.ts:10/:69/:77/:80` |
| 新增一个插件包 / 决定它进哪个分组 | digest-01 + digest-09 | `docs/capability-seams.md`、`docs/subsystems/scope.md` | `docs/module-graph.md`（生成物）、`scripts/gen-plugin-packages.ts` |
| 让服务能被别人 `ctx.xxx` 注入（Service Definition + Provider + Consumer 三件套） | digest-02 | `docs/capability-seams.md`、`docs/subsystems/core.md` | 形如 `packages/shell/shell/src/index.ts:64` `class ShellExecutor extends Service`；另一例 `packages/api/gateway/src/index.ts:199`；类型契约 `packages/core/tools/src/index.ts:223`（`ToolDefinition`） |
| 订阅 / 发起一个跨组事件，想知道该用 emit 还是 waterfall | digest-01 + digest-02 | `docs/subsystems/invariants.md` | `packages/core/tools/src/index.ts:1604-1606`（waterfall 包装执行）；`packages/core/agent/src/runtime-types.ts:318/:320`（`agent/pre-step`）、`:278/:280`（`agent/status` emit） |
| 查某个事件名的权威定义与 payload 类型 | digest-02 | `docs/subsystems/session.md`、`docs/subsystems/tools.md` | `packages/core/session/src/types.ts:281`（`SessionEventMap`）；`scripts/gen-scoped-events.ts` + `docs/config-catalog.md` 生成链路 |

## B. 主干：会话 / agent 循环 / 工具

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| **注册一个新工具**（名字、描述、参数 schema、执行体） | digest-02 | `docs/subsystems/tools.md`、`docs/tool-catalog.md`（生成物） | `packages/core/tools/src/index.ts:223`（`ToolDefinition`）、`:164`（`tools/execute`）、`:259-262`（超时预算字段不进模型）；范例 `packages/goal/tool-goal/src/index.ts:145/:239/:257` |
| 搞清"模型可见 ⟺ 已记录"与 `deriveMessages` | digest-02 + digest-06 | `docs/subsystems/session.md`、`docs/subsystems/conversation.md` | `packages/core/session/src/index.ts:860`（`deriveMessages`）、`types.ts:89`（`SESSION_FORMAT_VERSION = 4`） |
| 改 agent 循环 / 加一轮前置决策 | digest-02 | `docs/subsystems/agent-team.md`（多代理视角）、`docs/subsystems/core.md` | `packages/core/agent-loop/src/agent.ts:277/:305/:329/:237`；`packages/core/agent/src/index.ts:358`（`setFactory`） |
| 加一段系统提示（可开关、可审计） | digest-02 + digest-08 | `docs/subsystems/system-prompt.md` | `packages/plan/plan-mode/src/index.ts:218`（`plan:policy` 段落）、`:177`（`inject = ['tools','systemPrompt','sessionProjections']`） |
| 加一个 slash 命令 | digest-08 | `docs/subsystems/commands.md` | `packages/plan/plan-mode/src/index.ts`（`/plan` 经 `ctx.commands`）；`docs/subsystems/commands.md` |

## C. shell / 执行世界

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| **执行一条命令**（bash/pwsh、本地/sandbox 四选一） | digest-03 | `docs/subsystems/shell.md` | `packages/shell/shell/src/types.ts:111`（`ShellExecSpec`）、`:61`（`ShellExecRequest`）、`:53`（`ShellExpiryPolicy`）；`packages/shell/shell/src/index.ts:64/:84`；实现 `packages/shell/bash-local/src/index.ts:120`、`packages/shell/bash-sandbox/src/index.ts:85-86`、`packages/shell/pwsh-local/src/index.ts:163`、`packages/shell/pwsh-sandbox/src/index.ts:92` |
| 加/查一个 `DSH_*` 环境变量 | digest-03 | `docs/subsystems/shell.md`、`docs/config-catalog.md` | `packages/shell/shell-env/src/index.ts:3`（`DSH_ENV_PREFIX` 来自 `@deepseek-ai/dsh-shell`）、`:15`（home paths）、`:30/:41/:51` |
| 为什么"没读过的文件不让写" | digest-05 | `docs/subsystems/filesystem.md` | `packages/fs/fs-observation-policy/src/index.ts:82`（`FS_NOT_OBSERVED`）、`:85`、`:119/:122`（`fs/write-intent`、`fs/edit-intent`）；`packages/fs/tool-str-replace-editor/src/index.ts:110/:237`（`ctx.emit('fs/observed', …)`） |
| 输出被截断/溢出到文件（spill） | digest-05 | `docs/subsystems/spill.md` | `packages/shell/shell/src/types.ts`（`CollectedOutput` 形态，该组类型表起点 `:111`）+ `docs/subsystems/spill.md` |
| 起子进程 / 长驻终端 | digest-05 | `docs/subsystems/subprocess.md`、`docs/subsystems/terminal.md` | `packages/subprocess/subprocess/src/types.ts:13/:16/:19/:22/:26/:28` |
| 改沙箱能力 / 加一种 enforcement | digest-05 | `docs/subsystems/sandbox.md`、`docs/subsystems/permission-presets.md` | `packages/sandbox/sandbox/src/index.ts:30/:33/:40/:60/:70/:82/:96`；`packages/sandbox/sandbox/src/escalation.ts:28-30/:41/:104/:186`；原生侧 `native/system`（`native/README.md:5`） |

## D. 记忆（持久化 / 查询 / 压缩）

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| **会话持久化**：换存储后端、改文件布局 | digest-06 | `docs/subsystems/persistence.md`、`docs/subsystems/storage.md`、`docs/persistence-catalog.md`（生成物） | `packages/session/session-persistence/src/index.ts:50/:62/:78/:86/:92/:98/:104/:135`；`packages/session/session-persistence/src/handle.ts:14/:59`；`packages/session/session-persistence/src/errors.ts:13/:22/:31/:40/:59/:68/:85/:93/:111`；`packages/session/session-persistence/src/revision.ts:9`；默认实现 `packages/session/session-persistence-jsonl/src/index.ts:36/:84/:90/:273/:457/:484/:517/:547` |
| 按条件查询历史会话/事件 | digest-06 | `docs/subsystems/session-query.md`、`docs/subsystems/session-reference.md` | `packages/session-query/session-query/src/types.ts:24`（`SessionEventSurface`）、`:27` |
| 加/调压缩（compaction）策略，理解"遮蔽不是删除" | digest-06 | `docs/subsystems/compaction.md` | `packages/compaction/compaction/src/types.ts:94`、`packages/compaction/compaction/src/index.ts:32/:106`、`packages/compaction/compaction/src/invariant.ts:59`；全形 `packages/extensions/tool-cordis/src/api-catalog.ts:4778`（`shadowedRange` / `shadowedSeqs` / `shadowedTokenCount`） |
| 恢复/resume/fork 后状态怎么重建 | digest-06 + digest-08 | `docs/subsystems/session-projection.md` | `packages/plan/plan-mode/src/index.ts:227`（`ctx.sessionProjections.register(...)`）—— 0.2.0 的投影体系取代手写折叠 |
| 会话标题 / 遥测 / token 计量 | digest-06 + digest-04 | `docs/subsystems/session-title.md`、`docs/subsystems/session-telemetry.md`、`docs/subsystems/token-meter.md` | `packages/llm/token-meter/src`（分组实测存在）；`docs/subsystems/token-meter.md` |

## E. 多智能体与后台任务

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| **派一个子代理**（选提供者：ACP/Claude Code/Codex/dsh-sdk/in-process/fork） | digest-07 | `docs/subsystems/subagent.md`、`docs/subsystems/agent-team.md` | `packages/subagent/subagent/src/types.ts:130/:132-135/:145/:344`；`packages/subagent/subagent/src/index.ts:596-608`（`UNSUPPORTED_CAPABILITY`）、`:647-656`；`packages/subagent/subagent/src/child-agent.ts:211-218`；提供者包 `packages/subagent/*`（实测 10 个） |
| 加/改工作流（PTC / 步骤上限） | digest-07 | `docs/subsystems/workflow.md`、`docs/subsystems/ptc-runtime.md` | `packages/workflow/workflow/src/runtime-types.ts:19`（`WorkflowStartRequest`）、`packages/workflow/workflow/src/types.ts:46`（`WorkflowMeta`）；`packages/workflow/workflow-ptc/src/runtime.ts:168-170`、`packages/workflow/workflow-ptc/src/index.ts:108`（并发上限默认 1000）；**旧 `workflow-worker-thread` 已不存在** |
| 后台任务（job）状态机 | digest-07 | `docs/subsystems/jobs.md`、`docs/subsystems/schedule.md` | `packages/jobs/jobs/src/view.ts:19`（`JobStatus`）、`:32`（`JobKindMap`） |

## F. 人机协作与治理

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| **加一个审批闸门**（问人 / 机器回答者） | digest-08 | `docs/subsystems/approval.md`、`docs/subsystems/permission-presets.md` | `packages/interaction/user-approval/src/types.ts:17`（`ApprovalRequestId`）、`:32`（`ApprovalOutcome` 闭集）、`:44`（`approval/asked`）、`:51`（decided 为 log-only）；回答者实现见 `packages/acp/acp/src`（机器回答者）与 `packages/client/ui-approval` |
| 跨轮目标 / 阶段与阻塞原因 | digest-08 | `docs/subsystems/goal.md` | `packages/goal/goal/src/types.ts:20`（`GoalRef` CAS）、`:45`（`GoalPhase`）、`:52`（`GoalBlockReason`）、`:60`、`:72`（`GoalActivation` 新）、`:107/:119`（`GoalProjection*` 新） |
| 计划模式（软引导，不强制） | digest-08 | `docs/subsystems/plan.md` | `packages/plan/plan-mode/src/index.ts:53`（`plan/mode`）、`:67`（`EXIT_PLAN_MODE`）、`:197`、`:218`、`:227` |
| 用户提问 / 反馈 / 附件 | digest-08 + digest-10 | `docs/subsystems/user-questions.md`、`docs/subsystems/feedback.md`、`docs/subsystems/attachment.md` | `packages/client/ui-user-questions`、`ui-attachment`（分组实测存在） |
| 重复调用提醒 / 工具超时 | digest-08 | `docs/subsystems/tools.md`、`docs/subsystems/invariants.md` | `packages/core/tools/src/index.ts:260-261`（`dsh-tool-call-timeout-policy` 作 `tools/execute` 包装器，永不发模型）；包本体 `packages/guard/timeout-policy`、`packages/guard/repeat-tool-reminder` |

## G. 应用层与 GUI

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| 加一个 CLI 子命令 / 改参数语法 | digest-09 | `docs/subsystems/boot.md` | `apps/cli/src/args.ts:10-13/:34/:45/:120/:129/:135/:168/:171`；`apps/cli/src/bin.ts:55-56/:65-66` |
| 加一个 profile / 调 bundle 层叠 / 排查"打印≠启动" | digest-09 | `docs/config-catalog.md`、`docs/subsystems/boot.md` | `packages/boot/app-boot/src/index.ts:430`（`renderConfigDump`）、`:538`（`mountRootInclude`）、`:925`（`auditStartupEntries`，**取代旧 `assertEntries*`**）、`:972`（`boot`）、`:234`（`loadLayeredEnv`）；`apps/cli/src/plugin.ts:4`（模板自举 API）；`packages/boot/app-boot/src/profile.ts:169/:179/:704/:731` |
| 启动失败要恢复终端 / 改清理超时 | digest-09 | `docs/subsystems/boot.md` | `packages/boot/app-boot/src/index.ts:679`（`installFailLoud`）、`:637`（`FAIL_LOUD_RELEASE_TIMEOUT_MS = 2_000`）；`apps/cli/src/process-shutdown.ts` |
| **注册一个功能路由**（/api、bundle、HMR 等） | digest-10 | `docs/subsystems/web-server.md` | `packages/host/webserver/src/index.ts:39`（`WebRouteKind`）、`:42`（`WebRoute`）、`:51`（`WebUpgradeRoute`）、`:125`（`class WebServer extends Service`）、`:198-201`（fallback 二次注册抛错）；SPA 侧 `packages/host/frontend-static/src/index.ts:121/:124-125/:80-82` |
| **往界面加一个区块（slot 注入）** | digest-10 | `docs/subsystems/slots.md`、`docs/subsystems/web-client.md` | `packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:69-70`（`inject: ['slots']` + `ctx.slots.inject(key, () => ctx.slots.register(...))`）；协议本体 `packages/client/ui-slots/src`；**旧 `client/runtime` / `client/web-react` 包已不存在**，改用 `client/store`、`client/resources`、`client/ui-renderer`、`client/web` |
| 改连接/重连行为、订阅事件流 | digest-10 + digest-04 | `docs/subsystems/web-client.md`、`docs/subsystems/llm-streaming.md` | `packages/client/connection/src/client/connection.ts:77`（`ConnectionController`）；`packages/api/gateway/src/stream-protocol.ts:7`（`/api/remote.mux`）、`:10`（`$events`） |
| **新增一个浏览器可调的宿主能力（Remote 端点 / 转发事件）** | digest-10 + digest-04 | `docs/api-gateway.md`（Remote 层权威）、`docs/subsystems/typert.md` | `/api` 载体：`packages/client/connection/src/index.ts:144-158`（prefix 路由）、`src/api-path.ts:7`；端点认领：`packages/api/gateway/src/index.ts:234` `rpc.intercept('/api', …)`；白名单与事件源：`packages/api/remotes/src/remote-events.ts:20`（`API_REMOTE_FORWARDED_EVENTS`）、`src/index.ts:37/:42`（`inject = ['typertGateway']` + `registerRemoteEvents`）；能力归属看 `packages/api/{session,settings,terminal,workspace,job,account}-controller`。**旧 `packages/host/apiproxy` 已拆分，不要按旧路径找** |
| 桌面入口 / index 注入 | digest-10 | `docs/subsystems/web.md`、`docs/subsystems/client-modules.md` | `apps/web/src/main.ts`（`dshDesktopBoot` / `__DSH_BOOT_READY__` / `__DSH_TRANSPORT__`）；`packages/client/web/src/boot.ts:23`（`AppWebEntry`）；`packages/host/webserver/src/injections.ts:12/:15`（`IndexInjection`） |
| 右侧栏 / 终端 / 文件预览 / 浏览器面板 | digest-10 | `docs/subsystems/sidebar-right.md`、`docs/subsystems/terminal.md`、`docs/subsystems/workspace.md` | `packages/client/ui-sidebar*`（`ui-sidebar`、`ui-sidebar-browser`、`ui-sidebar-files`、`ui-sidebar-terminal`、`ui-sidebar-documentpreview`、`ui-sidebar-right`） |
| **注册 i18n 文案 / 加一门语言** | digest-10 + digest-12 | `docs/AGENTS.md`（双语配对纪律）、`docs/subsystems/client-modules.md` | `packages/client/locale`（分组实测存在；行号本轮未复核 → UNVERIFIED）；文档侧三件套形态见 `native/README.md` + `README.zh.md` + `README.i18n.yaml`；生成器 `scripts/gen-translation-brief.ts` |
| 快捷键 / 文件上传 / 产品分析 | digest-10 | `docs/subsystems/client-resources.md`、`docs/subsystems/product-telemetry.md` | `packages/client/shortcuts`、`file-upload`、`product-analytics`（均实测存在） |

## H. 对外接口与凭据

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| **从另一个进程驱动运行时**（TS/Python） | digest-11 | `docs/subsystems/typert.md`、`docs/subsystems/boot.md` | `packages/sdk/client/src/client.ts:185`（`HarnessClient`）、`:39`（`TransportClosedError`）；`packages/sdk/client/src/types.ts:24/:70`（`HarnessClientOptions`/`RunResult`）；服务端 `packages/sdk/server/src`；协议 `packages/sdk/protocol` |
| 用 ACP 让 IDE 驱动 agent | digest-11 | `docs/subsystems/subagent.md` | `packages/acp/acp/src/index.ts:60/:62/:75/:86`（含 `inject = ['agents','llm','sessionPersistence','sessions']`）；`packages/acp/acp/src/session.ts:98`（`AcpSession`） |
| 桥接用户已有的 hooks.json | digest-11 | `docs/subsystems/extensions.md`、`docs/subsystems/invariants.md` | `packages/hooks/hook-protocol/src/types.ts:48/:56/:68/:79/:89`；`packages/hooks/hook-protocol/src/merge.ts:12`（`MergedDecision`）；`packages/hooks/hook-protocol/src/runner.ts:20`（600s 默认超时）；方言桥 `packages/hooks/hooks-claude-code` / `packages/hooks/hooks-codex` |
| 接 MCP 服务器（工具/资源） | digest-11 | `docs/subsystems/mcp.md` | `packages/mcp/mcp-client/src/index.ts:31/:34`（`inject = ['tools']`）、`:52`（stdio）、`:80`（streamable http）；`packages/mcp/mcp-client/src/tools.ts:28/:36/:39/:196`；`packages/mcp/mcp-client/src/connection.ts:29/:41/:49/:57`；资源侧 `packages/mcp/mcp-resources`（0.2.0 新） |
| Python 侧最小跑通 | digest-11 | `docs/subsystems/boot.md` | `python/sdk/src/deepseek_harness/api.py:49`（`DeepSeekHarness`）、`python/sdk/src/deepseek_harness/client.py:39`（低层）；`python/sdk/examples/minimal.py:34-42`（**参数已改为 `--dsh-home` + `--profile`**）；运行时包 `python/sdk-runtime` |
| 凭据 / 账号 / API key 放哪 | digest-04 + digest-11 | `docs/subsystems/credentials.md`、`docs/config-catalog.md` | `packages/llm/llm-deepseek-account`、`llm-deepseek-api-key`（分组实测存在）；`docs/subsystems/credentials.md` |
| 接入新模型 provider | digest-04 | `docs/subsystems/typert.md`、`docs/subsystems/token-meter.md` | `packages/llm/llm/src/index.ts:208`（`LlmAdapter`）、`:342`（`LlmRuntime extends TypertRemoteService`）；`packages/llm/llm/src/types.ts:137`（`ContentBlockMap`）；`packages/llm/llm/src/message.ts:196`；provider 范例 `packages/llm/llm-pi-ai`（配套 CI `pi-ai-provider-e2e.yml`） |

## I. 工程与发布

| 你要做的事 | 读 | MAIN 一手文档 | 关键源码（实锚） |
|---|---|---|---|
| 提交前该跑哪些检查 | digest-12 | `AGENTS.md`、`.agents/skills/dsh-pre-push-checks/SKILL.md` | `package.json:82`（`check:all`）、`:193`（`doc-sync`）；`scripts/run-gates.ts` |
| 文档写多长、放哪一层 | digest-12 | `docs/AGENTS.md` | `scripts/doc-budgets.manifest.json`；`package.json:129`（`verify-doc-budgets`） |
| 改了工具 schema / 配置项导致目录过期 | digest-12 | `docs/tool-catalog.md`、`docs/config-catalog.md`、`docs/persistence-catalog.md` | `package.json:167/:177/:185/:190/:191`（各 `verify-*`）；生成器 `scripts/gen-*.ts`（实测 26 个） |
| 加一条快照回归测试（无 API key） | digest-12 | `docs/AGENTS.md`、`docs/subsystems/llm-streaming.md` | `package.json:67`（`test:snapshot` → `vitest.snapshot.config.ts`）；`DSH_SNAPSHOT=record\|refresh\|replay`；示例位 `apps/cli/config/examples/`（**顶层 `examples/` 已不存在**） |
| 写/归档一条 Agent Note | digest-12 | `.agents/notes/README.md` | `:12/:13/:14`（四态）、`:19`（禁 `INDEX.md`）、`:38-42`（冻结归档 + `scripts/verify-archived-agent-notes.ts`）、`:56`（`verify-agent-note-format`） |
| 改原生模块 / 发布它 | digest-05 + digest-12 | `native/README.md`、`native/system/docs/release.md` | `native/system/*`；`.github/workflows/node-addon-system.yml`、`node-addon-system-release.yml`；`package.json:57`（`test:coverage` 前置 `build:native-system`） |

## J. 跨代适配（peer-adapt）

| 症状 / 场景 | 先查 | 处置 |
|---|---|---|
| 旧代码调 `installSection(...)` / `settingsNamespace` 编译不过 | anchors.md「附：settings 面」 | **0.1.0 事实，0.1.7+ 已变**：MAIN `packages/settings` grep 0 命中。改为 `SettingsForms`（`packages/settings/settings/src/index.ts:223`，AUX 同行号 `:223/:266`）+ descriptor（`:20/:34/:41/:45/:81`）+ volatile Config 投影 |
| 旧代码手写 `foldPlanMode(events)` 恢复 plan 状态 | digest-08 | 改为注册会话投影（`packages/plan/plan-mode/src/index.ts:227`）；`foldPlanMode` 仅剩测试残留（`packages/plan/plan-mode/tests/plan-mode.spec.ts:78`） |
| 旧代码 `boot()` 后调 `assertEntriesLoaded` / `assertEntriesActivated` | digest-09 | 改为 `auditStartupEntries`（`packages/boot/app-boot/src/index.ts:925`） |
| 旧代码 `ctx.slots.register(...)` 直接注册 | digest-10 | 需 `inject: ['slots']` + `ctx.slots.inject(key, () => ctx.slots.register(...))`（`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:69-70`） |
| 引用 `client/runtime`、`client/web-react`、`workflow-worker-thread`、`native/landlock-run`、`examples/`、`apps/cli/config/agent-presets` | anchors.md 对应篇节 | 六处路径在 MAIN 均不存在，按 digest-05/07/09/10/11/12 头部警示的新落点替换 |
| 会话文件读不出（版本号不符） | digest-02 + digest-06 | `SESSION_FORMAT_VERSION` 0 → **4**；读 `docs/subsystems/persistence.md` 与 `docs/persistence-catalog.md`，迁移链由 `scripts/gen-session-format-catalog.ts` 生成校验 |
