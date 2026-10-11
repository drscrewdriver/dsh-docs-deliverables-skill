# digest-05 · 执行世界：fs / subprocess / sandbox

> **来源**：`dsh-study-docs/详解/第05篇-执行世界.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示**：MAIN = **v0.2.0-rc.2**。执行世界是**漂移前三**的区域之一：① `native/landlock-run` 已重构为 `native/system` 工作区（`native/README.md:5` 实证：Landlock launcher 与 POSIX flock binding 归 `system/`）；② 旧文所举 `fs-e2b` 提供者在 MAIN `packages/fs` 下不存在（N-A@0.2.0），取而代之的是新增的 `fs-sandbox`；③ sandbox 组新增 **升级审批链** `packages/sandbox/sandbox/src/escalation.ts` 与 `sandbox-windows-acl`、subprocess 组新增 `win32-process`。

## 0 WHY（一段）

shell 缝给了 Agent 一双手，但手要落在**真实世界**上，还需要三个基础设施：文件（读写什么）、进程（怎么启动）、隔离（能碰什么）。三者共享一个核心假设——**同一个"执行世界"**：官方原话 *"Filesystem and subprocess providers share one execution world, so pointing them at a remote sandbox moves Bash, PTY, and LSP with them, with no provider forks."* 三个场景逼出需求：模型可能没读过文件就乱改（→ 先读后写的观察策略）；进程环境里可能残留宿主秘密、输出可能无限大（→ 清洗 + 有界捕获）；同一产品要在裸机/CI/云端三种隔离度下跑且**如实报告完成度**（→ 模式与 enforcement 分离）。"世界共享"是关键决策：它把"换提供者"变成"换世界"，而不是逐能力适配。

## 1 WHAT：职责边界

- **拥有**：`dsh-fs`（`FsTarget` / `FsTargetKey` / `resolve()` / `processPath()`）、`fs-observation-policy`（read-before-write 策略门）、`dsh-subprocess`（`ctx.subprocess`：环境清洗、`CollectedOutput`）、`dsh-sandbox`（`SandboxMode` / `SandboxEnforcement` / argv 包裹）、`sandbox-local` 及平台后端、`sandbox-policy`（默认模式与工作区根）。
- **不拥有**：命令语义与超时策略（→ `packages/shell/`）、PTY 会话（→ `packages/terminal/`）、网络与进程可见性（**不在 `SandboxMode` 词汇内**，sandbox 只管文件效果）、凭据保管（→ `credentials`）。
- **需求面**：R1 文件操作有界可审计 · R2 进程启动统一受控 · R3 隔离可配置且如实报告 · R4 世界可整体切换；N1 `FsTargetKey` branded opaque 禁止解析 · N2 原子文本操作 + stale 版本守卫 · N3 每流报告 `truncated` 与 `spillPath` · N4 先丢弃再合并 · N5 partial 不得被当作 full。
- **原则**：P1 不透明身份 · P2 **策略经事件**（不写死在工具里）· P3 清洗再合并（顺序即安全）· P4 承诺要可验证 · P5 世界共享。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `packages/fs/fs/src/types.ts` | `:16` `FsTargetKey`；`:60` `export interface FsTarget`（`:62` `targetKey`、`:67` `displayPath`）；`:14` "Consumers MUST NOT parse it…" 注释 | `17~42`，引文 `39~40` | **DRIFTED**（行号） |
| 2 | `packages/fs/fs/src/invariant.ts` | `:16-17` fs 不变量安装 | 旧文未列 | VERIFIED |
| 3 | `packages/fs/fs-observation-policy/src/index.ts` | `:62-63` write intent 决策（未见⇒`createIfAbsent`；确认存在⇒`replaceIfVersion`）；`:82` `FS_NOT_OBSERVED`；`:85` `FS_NOT_FOUND`；`:119` `ctx.on('fs/write-intent', …)`；`:122` `ctx.on('fs/edit-intent', …)`（两者都**独占决策槽、不调 next()**） | 旧锚 `src/types.ts` | **DRIFTED**（文件 + 行号） |
| 4 | `packages/fs/fs-observation-policy/src/types.ts` | `:23` `FsObservationActor` | 同文件 | VERIFIED |
| 5 | `packages/subprocess/subprocess/src/types.ts` | `:13` `DSH_ENV_PREFIX`；`:16` `DshEnvironmentKey`（模板字面量约束）；`:19` `DshEnvironment`；`:22` `CollectedOutput`（`:26` `truncated`、`:28` `spillPath`） | `:15` / `17~37` | **DRIFTED**（行号） |
| 6 | `packages/sandbox/sandbox/src/index.ts` | `:30` `SandboxMode = 'read-only' \| 'workspace-write' \| 'danger-full-access'`；`:33` `ConfinedSandboxMode`（新）；`:40` `SandboxExecutionPolicy`；`:60` `SandboxEnforcement = 'full' \| 'partial'`；`:70` `SandboxPolicy`；`:82` `RunnerFailureRule`（新）；`:96` `ConfinedArgv` | `:30` / `:60` | **VERIFIED**（模式与 enforcement 行号未变） |
| 7 | `packages/sandbox/sandbox/src/escalation.ts` | `:28-30` `WIDER_MODES`；`:41` `ESCALATION_TARGETS`；`:104` `EscalationOutcome = 'allowed-once' \| 'rejected' \| 'cancelled' \| 'unavailable'`；`:186` 注释指向 `approval/asked` 留痕 | 旧文无此文件 | **N/A@0.1.0 → VERIFIED@0.2.0**（新增） |
| 8 | `packages/sandbox/sandbox-local/src`、`packages/sandbox/sandbox-windows-acl/src` | 目录存在（后者为 0.2.0 新增包） | `sandbox-local` | VERIFIED（路径） |
| 9 | `native/landlock-run` | **不存在**；MAIN 为 `native/system/`（含 `packages`/`docs`/`scripts`，`native/README.md:5` 说明其拥有 Landlock launcher 与 release 流程 `system/docs/release.md`） | `native/landlock-run` | **DRIFTED**（路径重组） |
| 10 | `packages/fs/fs-sandbox`、`packages/subprocess/win32-process` | 目录存在（0.2.0 新增） | 旧文无 | N/A@0.1.0 |

## 2.2 HOW 骨架

### FsTarget：不透明身份 + 由提供者翻译的跨能力坐标

- `targetKey` 是 branded id：本地后端是 realpath 式字符串，远程后端可能是 URI 或 file id——**消费者禁止解析**，也不得假设它是本地绝对路径（`:14`）。
- `displayPath` 只供模型/UI 展示；子进程要用的真实路径经提供者的 `processPath(target)` 翻译（P1）。
- 好处：换远程后端消费者零改动（N1）。

### 观察策略是一条事件门，不是工具里的 if

- 两个 waterfall 决策点：`fs/write-intent`（决定 `createIfAbsent` 还是 `replaceIfVersion(version)`）与 `fs/edit-intent`（决定编辑的版本守卫）。
- 拒绝码闭集：未见过 ⇒ `FS_NOT_OBSERVED`、确认缺席 ⇒ `FS_NOT_FOUND`、版本过期 ⇒ `FS_STALE_VERSION`。
- 策略门**独占决策槽且不调 `next()`**；不装该插件的部署 = 无约束缝（部署方自选，这就是 P2 的代价与自由）。
- 事件观察侧：`ctx.emit('fs/observed', target, {kind:'absent'|'present', version}, exec)`（实证于 `packages/fs/tool-str-replace-editor/src/index.ts:110/237`）。

### 子进程环境：丢弃 → 显式 → 托管

- `DshEnvironmentKey = \`${typeof DSH_ENV_PREFIX}${string}\``——前缀是**类型级**约束，普通字符串写不进来。
- 顺序即安全：先**丢弃**继承来的 `DSH_*` 名字，再合并调用方显式条目，最后合并托管快照；显式 `undefined` 作 tombstone。
- 结果：当前事实只以显式字符串到达，过期值不会从宿主进程渗透。

### 隔离：模式是请求，enforcement 是报告

- `SandboxMode` 三档词汇只覆盖**文件效果**，不含网络与进程可见性。
- `SandboxEnforcement = 'full' | 'partial'` 必须如实上报；要求绝对边界的消费者显式拒绝 partial（当前的 partial 案例：Windows ACL 后端与旧版 Landlock ABI）。
- `danger-full-access` 是全权消费者的绕过口：直接 spawn 原 argv，不调 `ctx.sandbox`——策略解析一次完成（D5）。
- **0.2.0 新增**：`escalation.ts` 定义"从窄模式向更宽模式升级"的一次性审批链（`WIDER_MODES` / `ESCALATION_TARGETS` / `EscalationOutcome`），拒绝/取消/不可用都是显式结局并落 `approval/asked` 审计事件。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/filesystem.md`、`docs/subsystems/subprocess.md`、`docs/subsystems/sandbox.md`
- `docs/subsystems/terminal.md`、`docs/subsystems/lsp.md`、`docs/subsystems/workspace.md`
- `docs/subsystems/permission-presets.md`（模式 → 预设映射）、`docs/architecture.md`（"one execution world" 原文）
- `native/README.md` + `native/system/README.md`（Landlock launcher 原生模块的新家）
