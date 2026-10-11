# digest-03 · packages/shell/：能力缝——给 Agent 一双手

> **来源**：`dsh-study-docs/详解/第03篇-shell能力缝.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示**：MAIN = **v0.2.0-rc.2**。缝的**形状**跨代稳定（定义/提供者/消费者三件套不变），但**成员表已变**：`ShellExecRequest` 由旧锚 `:24` 移至 **`:61`** 并新增 `onExpiry: ShellExpiryPolicy`（`:53`）；分组新增 `pwsh-sandbox`、`tool-bash-persistent`、`tool-pwsh-persistent`；`DSH_ENV_PREFIX` 的定义权已从 `shell-env` 移交 `@deepseek-ai/dsh-shell`（`subprocess/src/types.ts:13` 定义、`shell-env/src/index.ts:3` 反向 import）。旧文以 E2B 远程执行器举例——`packages/e2b` 在 MAIN 的 packages 下**已不存在**（N-A@0.2.0）。

## 0 WHY（一段）

core 只提供"工具注册表"骨架，骨架不干活；`packages/shell/` 是最典型也最危险的那个干活组件——让 Agent 真的能在机器上执行命令。三个场景逼出设计：编码任务要"跑一下测试看看结果"（必须拿到 stdout 才能继续）；同一产品要在本地裸机、CI 容器、远程沙箱三种环境跑（**同一套接口、三种实现**）；模型可能执行任何命令（必须限超时、限输出、控环境变量、可套沙箱）。因此能力以"缝"的形态存在：一个接口定义 + 多个可替换实现 + 若干消费者，配置换一行、执行环境整体切换；模型面对的永远是 schema 化工具而不是裸 spawn，否则"执行工具"就等于"让模型任意执行代码"。

## 1 WHAT：职责边界

- **拥有**：`dsh-shell`（`ctx.shell` 接口：`ShellExecRequest` / `ShellExecSpec` / `ShellExecutor`）、providers（`bash-local`、`bash-sandbox`、`pwsh-local`、`pwsh-sandbox`）、consumers（`tool-bash`、`tool-pwsh`、`tool-bash-persistent`、`tool-pwsh-persistent`）、`shell-env`（`DSH_*` 托管环境注册表）。
- **不拥有**：持久 PTY 会话（→ `packages/terminal/`，`ctx.terminals`）、spawn/kill/stdio 机制（→ `packages/subprocess/`，`ctx.subprocess`）、沙箱本身（→ `packages/sandbox/`，`ctx.sandbox`）、凭据管理（→ `packages/credentials/`）。
- **需求面**：R1 能力可插拔 · R2 模型安全调用 · R3 执行可管控（超时/输出上限/环境白名单/stdin/取消）· R4 生态可扩展；N1 进程组可杀 · N2 输出有界 · N3 `DSH_*` 宿主托管不可伪造 · N4 request→spec 必经 `resolve()` · N5 每次执行有 callId 与事件对可审计。
- **原则**：P1 **能力缝三件套**（Service Definition + Provider + Consumer，缺一不算缝）· P2 explicit > implicit · P3 模型只见 schema · P4 托管环境命名空间先清洗再合并 · P5 执行即事件（`tool/call` → `tool/result`）。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `packages/shell/shell/src/types.ts` | `:53` `ShellExpiryPolicy = 'kill' \| 'none'`；`:61` `ShellExecRequest`（`:64 workdir?`、`:66 timeoutMs?`、`:68 onExpiry?`、`:75 stdoutMaxBytes?`、`:77 signal?`、`:85 stdin?`、`:93 env?`、`:101 dshEnv?`、`:103 sandboxPolicy?`）；`:111` `ShellExecSpec`（`resolve()` 补全后的必填形态） | `ShellExecRequest` `:24` 起；片段 `17~26` | **DRIFTED**（行号 + 新增 `onExpiry`） |
| 2 | `packages/shell/shell/src/index.ts` | `:64` `export abstract class ShellExecutor extends Service`；`:84` `abstract resolve(...)` | 同文件 | VERIFIED |
| 3 | `packages/shell/bash-local/src/index.ts` | `:120` provider 注册落点 | 目录级 | VERIFIED（符号级） |
| 4 | `packages/shell/bash-sandbox/src/index.ts` | `:85-86` 消费 `ctx.sandboxPolicy.resolve()` 后包裹 argv | 目录级 | VERIFIED |
| 5 | `packages/shell/pwsh-local/src/index.ts` · `packages/shell/pwsh-sandbox/src/index.ts` | `:163` / `:92`（`pwsh-sandbox` 为 **0.2.0 新增包**） | 旧文只列 pwsh-local | DRIFTED（新增包） |
| 6 | `packages/shell/tool-bash/src` | 目录存在；schema 与 `run_in_background → ctx.jobs` 的行为描述见 `docs/tool-catalog.md` | 同 | VERIFIED（路径） |
| 7 | `packages/shell/shell-env/src/index.ts` | `:3` `import { DSH_ENV_PREFIX } from '@deepseek-ai/dsh-shell'`；`:15` `@deepseek-ai/dsh-home-paths`（**新包**）；`:30` `Config`；`:41` `BashEnvVariable`；`:51` `BashEnvContributor` | 目录级 | VERIFIED（含所有权漂移） |
| 8 | `docs/capability-seams.md` | 文件存在；旧锚"第 448 行 `ctx.shell` 缝表行"在 MAIN 未复核 | `:448` | UNVERIFIED（行号） |

## 2.2 HOW 骨架

### 缝的三件套

- 定义层 `dsh-shell` 只声明接口与两种形状：`ShellExecRequest`（字段可选，模型/插件面）与 `ShellExecSpec`（补全后必填，执行器只吃它）。
- 提供者层：`bash-local` 直接 spawn；`bash-sandbox` 把命令交给沙箱包裹后 spawn——差异全部封在 `run()` 内部，消费者感知不到。
- 消费者层：`tool-bash` / `tool-pwsh` 把能力翻译成 schema 化工具注册进 `ctx.tools`；`hooks-claude-code` / `hooks-codex` 桥也消费同一条缝（写 hook 命令的 JSON payload 到 stdin）。

### request → resolve → spec 的显式边界

- `ShellExecutor` 只有两个方法：`resolve(request): ShellExecSpec` 与 `run(spec, signal)`。
- `workdir` / `timeoutMs` 由实现方 config 兜底并**封顶**；执行器内部禁止偷偷默认（N4）。
- `onExpiry`（0.2.0 新增）：`'kill'` 到点杀进程并判 `timedOut`（默认）；`'none'` 完全不装定时器，只留 caller signal 与 `ShellProcess.kill`——想"再等一会儿"的调用方用 `none` 跑命令、自己约束等待。

### DSH_\* 托管环境命名空间

- `env`（普通项）先合并，`dshEnv`（宿主管辖的 `DSH_*` 事实）**最后合并** → 任何调用方 env 项都无法 displacing 托管值。
- 执行器**先丢弃**环境里继承来的 `DSH_*` 再合并本快照 → 一个当前不可得的事实不会从宿主进程继承到过期值（N3 的双向保证）。
- 前缀常量的家在 `@deepseek-ai/dsh-shell`；`shell-env` 只做注册表与贡献者协议（`BashEnvVariable` / `BashEnvContributor`）。

### 有界输出与后台化

- `stdoutMaxBytes` 供受信进程内消费者解析完整 stdout（上限有界）；**面向模型的 bash 工具不暴露该参数**。
- `run_in_background` 注册进通用 `ctx.jobs` 运行时，用 `job_*` 工具收集/停止（决策 D4）；`enableRunInBackground`（默认 true）关掉时**参数整体消失**。
- 三者分工：一次性命令走 `ctx.shell`，持续会话走 `ctx.terminals`，裸进程走 `ctx.subprocess`。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/shell.md`（缝定义原文）、`docs/subsystems/terminal.md`、`docs/subsystems/subprocess.md`
- `docs/capability-seams.md`（生成的权威缝表）、`docs/tool-catalog.md`（bash/pwsh 工具目录条目）
- `docs/subsystems/spill.md`（超限输出落盘）、`docs/subsystems/jobs.md`（后台任务运行时）
