# digest-11 · 协议与 SDK：sdk / acp / hooks / mcp / python——把产品接出去

> **来源**：`dsh-study-docs/详解/第11篇-协议与SDK.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示**：MAIN = **v0.2.0-rc.2**。本篇包结构总体稳定（`sdk/{protocol,client,server}`、`acp/acp`、`hooks/*`、`python/sdk` 均实测存在），三处漂移：① **顶层 `examples/` 不存在**——旧文的 `examples/jsonrpc-agent/minimal.py` 现为 **`python/sdk/examples/minimal.py`**，`examples/mcp-memory` 现为 **`apps/cli/config/examples/mcp-memory`**；② `minimal.py` 参数契约变了：**不再传 `cordis=` / `session_root=`**，改为 `--dsh-home`（或 `DSH_HOME`）+ `--profile sdk-minimal`；③ `mcp` 分组新增 **`mcp-resources`**。

## 0 WHY（一段）

产品要能被**程序**使用，不只是人敲命令。四条对外通道 + 一门语言：① 另一个进程要启动运行时、跑任务、拿结果（TS/Python SDK，**stdio 上的换行分隔 JSON-RPC**）；② IDE 等工具按 Agent Client Protocol 标准驱动 agent（ACP 是**互操作传输层，非展示/人机交互层**）；③ 用户已有的 Claude Code / Codex `hooks.json` 不迁移、直接桥接；④ 接 MCP 记忆服务器而不自造记忆轮子；⑤ Python 一等公民（高层 turns API + 内置运行时）。共同原则：**说标准语言、做薄翻译、不越边界**（SDK 不创建/配置/构建/启动开发者项目）。

## 1 WHAT：职责边界

- **拥有**：`sdk/protocol`（运行时线协议）、`sdk/client`（TS 客户端 API）、`sdk/server`（stdio JSON-RPC 服务端）、`acp/acp`（ACP 服务器）、`hooks/hook-protocol`（共享协议库）+ `hooks-claude-code`/`hooks-codex`（方言桥）、`mcp/mcp-client` + `mcp-resources`、`python/sdk` + `python/sdk-runtime`。
- **不拥有**：项目脚手架（明确排除）、UI/人机交互（digest-10）、记忆实现（第三方 MCP 服务器）、协议之外的任何产品能力（产品核心不知道这些通道存在）。
- **需求面**：R1 运行时可由外部进程驱动 · R2 ACP 互操作 · R3 外部钩子可桥接（含 stdin payload）· R4 MCP 客户端可接记忆 · R5 Python 一等公民；N1 传输简单（子进程管道即通道）· N2 配置显式（**运行时本身总是要求显式配置**）· N3 桥接忠实 · N4 按 MCP 标准协商。
- **原则**：P1 一个扩展面（所有外部协议都是"翻译"）· P2 说行业语言 · P3 司机与车分离 · P4 语言一等公民。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `packages/sdk/client/src/client.ts` | `:39` `TransportClosedError`；`:185` `class HarnessClient` | 目录级 | VERIFIED |
| 2 | `packages/sdk/client/src/types.ts` | `:24` `HarnessClientOptions`；`:70` `RunResult` | 目录级 | VERIFIED |
| 3 | `packages/sdk/{protocol,server}/src` | 两个包目录均存在（三包分工未变，D2） | 同 | VERIFIED |
| 4 | `packages/acp/acp/src/index.ts` | `:60` `static name = 'acp'`；`:62` `inject = ['agents','llm','sessionPersistence','sessions']`；`:75` `AcpConfig`；`:86` `Config` | 目录级 | VERIFIED |
| 5 | `packages/acp/acp/src/session.ts` | `:98` `AcpSession`（`:39` / `:44` 相关类型）；`model-control.ts:32` 模型控制落点 | 目录级 | VERIFIED |
| 6 | `packages/hooks/hook-protocol/src/types.ts` | `:48` `HookDialect = 'claude-code' \| 'codex'`；`:56` `CommandHook`；`:68` `MatcherGroup`；`:79` `MatcherMode`；`:89` `HookOutput` | 目录级 | VERIFIED |
| 7 | `packages/hooks/hook-protocol/src/{merge,events,runner,invariant}.ts` | `merge.ts:12` `MergedDecision = 'allow' \| 'ask' \| 'deny' \| 'none'`；`events.ts:13/:27/:53`；`runner.ts:20` `DEFAULT_HOOK_TIMEOUT_MS = 600_000`；`invariant.ts:11/:13/:121` | 未列 | N/A@0.1.0（细目）→ VERIFIED@0.2.0 |
| 8 | `packages/mcp/mcp-client/src/index.ts` | `:31` `static name = 'mcp-client'`；`:34` `inject = ['tools']`；`:52` `StdioConfig`；`:80` `StreamableHttpConfig`；`connection.ts:29/:41/:49/:57`；`tools.ts:28/:196` | 目录级 | VERIFIED |
| 9 | `packages/mcp/mcp-resources` | 包存在（0.2.0 新增） | 无 | N/A@0.1.0 → VERIFIED@0.2.0 |
| 10 | `python/sdk/src/deepseek_harness/api.py` | `:14` `DeepSeekHarnessConfig`；**`:49` `class DeepSeekHarness`**；`:92` `__enter__`；低层 `python/sdk/src/deepseek_harness/client.py:25` `HarnessConfig`、`:39` `HarnessClient` | 旧文只指 `client.py` | VERIFIED + DRIFTED（类在 api.py） |
| 11 | `python/sdk/examples/minimal.py` | `:10` import；`:34-42` `with DeepSeekHarness(provider, model, max_tokens, cwd, dsh_home, profile)` → `harness.run(...)` | `examples/jsonrpc-agent/minimal.py:30~39` | **DRIFTED**（路径 + 参数契约） |
| 12 | `packages/subagent/subagent-acp` | 包存在（ACP 服务器在 acp 组、ACP **子代理客户端**在 subagent 组） | 同 | VERIFIED |

## 2.2 HOW 骨架

### 进程外驱动（sdk，R1/R5/N1）

- 三包分工：`protocol` 定义线协议、`client` 提供 TS API、`server` 以 **stdio 上的换行分隔 JSON-RPC** 承接进程外客户端（D1）。
- 客户端对象：`HarnessClient`（`client.ts:185`）+ `HarnessClientOptions`（`types.ts:24`），`run()` 返回 `RunResult`（`types.ts:70`）；传输断裂 → `TransportClosedError`（`client.ts:39`）。
- 边界纪律（P3/N2）：调用方自带运行时可执行文件与 `cordis.yml`；本组**不创建/配置/构建/启动开发者项目**；**运行时本身永远要求显式配置**。
- Python 与 TS 同源：`python/sdk` 复用同一 JSON-RPC；`python/sdk-runtime` 提供内置运行时与默认配置（R5）。

### ACP 互操作（acp，R2）

- ACP 服务在**服务器侧**：向按 Agent Client Protocol 编程的客户端（IDE 等）暴露 agent；定位是互操作传输层，不管展示与人机交互。
- 依赖面实证（`index.ts:60/:62`）：`inject = ['agents','llm','sessionPersistence','sessions']`——ACP 直接消费 digest-02/06 的主干与持久化缝，自身无状态。
- 会话对象 `AcpSession`（`session.ts:98`）把 ACP 的 session/prompt 语义映射到 harness 会话；`model-control.ts:32` 负责模型切换。
- 职责对称：**出去**的 ACP 服务器在 `packages/acp`，**进来**的 ACP 子代理提供者在 `packages/subagent/subagent-acp`；ACP 桥还可作为审批的**机器回答者**（digest-08）。

### hooks 桥（R3/N3，方言在桥内、共享行为在协议库）

- 唯一扩展面是 harness 的**类型化拦截点**（waterfall/emit 事件，digest-01/02）；`hook-protocol` 为共享线协议库，`hooks-claude-code`/`hooks-codex` 各管一种方言（D3）——桥只翻译不改语义（`invariant.ts:11/:13/:121`）。
- 协议要素实证：`HookDialect = 'claude-code' | 'codex'`（`types.ts:48`）、`CommandHook`（`:56`）、`MatcherGroup`/`MatcherMode`（`:68/:79`）、`HookOutput`（`:89`）；多钩子合并结果是闭集 `MergedDecision`（`merge.ts:12`）。
- 执行侧：`HookInvocation` / `HookResultRecord`（`events.ts:13/:27`）；钩子命令经 shell 缝执行（digest-03），stdin 传 JSON payload；默认超时 600_000ms（`runner.ts:20`）。

### MCP 与记忆生态（R4/N4）

- `mcp-client` 声明 `inject = ['tools']`（`index.ts:34`）：MCP 服务器的工具被翻译进 harness 工具注册表，与内置工具同一条守卫管线（digest-02/05），故同受审批与沙箱约束。
- 两种传输：`StdioConfig`（`:52`）与 `StreamableHttpConfig`（`:80`）；`connection.ts` 维护握手与重连，`tools.ts` 做发现与调用映射。
- 产品只提供客户端，**不内置记忆实现**；0.2.0 新增 `mcp-resources` 管资源侧。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/mcp.md`、`docs/subsystems/subagent.md`（ACP 提供者一侧）、`docs/subsystems/tools.md`、`docs/capability-seams.md`
- `docs/subsystems/credentials.md`（外部通道的凭据边界）、`python/README.md`、`apps/cli/config/examples/mcp-memory/`
