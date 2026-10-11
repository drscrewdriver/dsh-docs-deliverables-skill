# digest-08 · 人机协作与治理：approval / goal / plan / guard

> **来源**：`dsh-study-docs/详解/第08篇-人机协作与治理.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示**：MAIN = **v0.2.0-rc.2**。三处漂移：① 审批词汇从 `user-approval/src/index.ts`（旧锚 `14~29`）移到 **`src/types.ts:17/:32/:44`**；② **旧文核心机制"`foldPlanMode(events)` 纯折叠"在 MAIN 生产代码已不存在**（仅剩 `plan-mode/tests/plan-mode.spec.ts:78`），plan 状态改由**会话投影**承载（`plan-mode/src/index.ts:177` 的 `inject = ['tools','systemPrompt','sessionProjections']` + `:227` `ctx.sessionProjections.register(planProjectionDefinition)`）；③ goal 新增 `GoalActivation`（`:72`）与 `GoalProjection` / `GoalProjectionState`（`:107/:119`）。凡旧文"手工折叠恢复"一律按 0.2.0 投影体系重读（`docs/subsystems/session-projection.md`）。

## 0 WHY（一段）

Agent 不能永远自主。四个治理/协作场景：模型要把文件写到工作区外（需把沙箱升级为 danger-full-access）——必须问人，拒就拒；一个目标要跨多轮推进——系统要记住目标、轮次、进度；复杂任务先出计划、人批准后再执行；模型重复调用同一工具或一次调用超时——系统要有提醒与强制。四件事共享同一条底线：**状态即日志、闸门即闭集**——审批、目标、计划全部以会话事件持久化（重放即恢复），guard 作为可组合的卫生插件；而**软引导（plan）与强制（sandbox/approval）互不读写**，职责分离。

## 1 WHAT：职责边界

- **拥有**：`interaction/user-approval`（审批缝、`ApprovalRequestId`、审计事件对、回答者链）、`goal`（`GoalRef` CAS + `tool-goal` + goal-round-driver）、`plan/plan-mode`（`plan/mode` 事件 + `plan:policy` 提示段 + `exit_plan_mode` 工具 + `/plan` 命令）、`guard`（重复调用提醒、工具超时策略）。
- **不拥有**：执行限制（→ sandbox 模式 + approval 政策）、跨会话委托（→ subagent）、内容审查（→ fs 策略）、审批/目标 UI（→ `client/ui-plan`、`ui-goal`）。
- **需求面**：R1 审批可问可拒（**闭集 + fail-closed**）· R2 审批可审计（`asked`/`decided` 成对）· R3 目标可持久（事件溯源 + CAS）· R4 计划是软引导（**不强制任何行为**）· R5 循环卫生；N1 任何异常路径都不放行 · N2 全部可重放 · N3 `setApprovalPolicy` 是唯一写路径 · N4 goal 更新按 revision 比较并交换 · N5 三者互不读写。
- **原则**：P1 闸门失败关闭 · P2 状态即日志 · P3 单写路径 · P4 职责分离 · P5 卫生要显式。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `packages/interaction/user-approval/src/types.ts` | `:14` 注释"Pairs one `approval/asked` audit event with its `approval/decided`"；`:17` `ApprovalRequestId`；`:32` `ApprovalOutcome = 'allowed-once' \| 'rejected' \| 'cancelled' \| 'unavailable'`；`:44` `'approval/asked'` 事件声明；`:51` decided = log-only 审计 | `src/index.ts:14~29`（引文 `:21`） | **DRIFTED**（文件） |
| 2 | `packages/goal/goal/src/types.ts` | `:17` `GoalId`；`:20` `GoalRef { id, revision }`；`:45` `GoalPhase`；`:52` `GoalBlockReason`；`:60` `GoalSnapshot`；`:72` `GoalActivation = 'armed' \| 'disarmed'`（新）；`:107` `GoalProjection`；`:119` `GoalProjectionState`（新） | `11~19` | **DRIFTED**（行号 + 新增概念） |
| 3 | `packages/plan/plan-mode/src/index.ts` | `:12` 注释"从 `agent/pre-step` 决定是否 append `plan/mode`"；`:53` `'plan/mode': { active: boolean }`；`:67` `EXIT_PLAN_MODE = 'exit_plan_mode'`；`:176` `class PlanModeController extends Service`；`:177` `static inject = ['tools','systemPrompt','sessionProjections']`；`:218` 提示段 `name: 'plan:policy'`；`:227` `ctx.sessionProjections.register(planProjectionDefinition)`；`:197` `ctx.on('agent/pre-step', …)` | `foldPlanMode` 在 index.ts | **DRIFTED**（折叠 → 投影） |
| 4 | `packages/plan/plan-mode/tests/plan-mode.spec.ts` | `:78` `foldPlanMode` 唯一残留引用（生产路径已不用） | — | UNVERIFIED（生产语义） |
| 5 | `packages/core/tools/src/index.ts` | `:260-261` 超时预算字段注释：由 `@deepseek-ai/dsh-tool-call-timeout-policy` 作为 `tools/execute` 包装器强制，且**永不发给模型** | 旧文锚 `packages/guard/timeout-policy` | VERIFIED（旧锚指向包不同） |
| 6 | `packages/goal/tool-goal/src/index.ts` | `:145` / `:239` / `:257` `create_goal` / `get_goal` / `update_goal` 三工具落点 | 目录级 | VERIFIED |
| 7 | `packages/sandbox/sandbox/src/escalation.ts` | `:104` `EscalationOutcome` 与审批闭集同名四值；`:186` 注释说明理由文本存进 `approval/asked` | 旧文未列 | N/A@0.1.0 → VERIFIED@0.2.0 |

## 2.2 HOW 骨架

### 审批：闭集结果，闸门故障 = 关闭

- 四个结果：`allowed-once`（只授予被问的这一次动作）/ `rejected`（显式拒绝）/ `cancelled`（请求被撤回）/ `unavailable`（回答者缺失或异常）。官方纪律：*"A missing, non-owning, throwing, or non-conforming answerer becomes `unavailable` rather than opening the gate."*——**除 `allowed-once` 外一律失败关闭**。
- 审计可关联：每次请求成对产生 `approval/asked` / `approval/decided`，由 branded `ApprovalRequestId` 配对；decided 为 log-only（不进模型可见面）。
- 回答者链可插：UI 提供人类回答者，ACP 桥为自动化 agent 提供机器回答者；`setApprovalPolicy` 是唯一写路径，重放可重建覆盖（N3）。
- 0.2.0 新增消费方：沙箱**升级审批**复用同一闭集（`escalation.ts`），拒绝原因落 `approval/asked` 留痕。

### 目标：事件溯源 + CAS

- `GoalRef { id, revision }` 是"目标 + 精确修订版"；每次可持久变更 revision 递增，并发轮次后提交者因 revision 不匹配被拒（N4）。
- `GoalPhase` 四阶段（active/paused/blocked/complete），`GoalBlockReason` 为**机器可路由**原因码；`GoalSnapshot` 是权威投影。
- 0.2.0 增量：`GoalActivation`（armed/disarmed）把“是否继续推进”与“处于哪个阶段”解耦；`GoalProjection` / `GoalProjectionState` 把目标状态并入会话投影体系。
- 边界重申：goal 是**同会话**目标；跨会话委托属于 subagent。

### 计划：软引导，靠投影恢复

- `plan/mode` 是 log-only、整值替换的会话事件（`{ active: boolean }`）；激活时系统提示里多一段 `plan:policy`（`:218`），关闭后消失。
- **不强制任何行为**：官方原话 *"Plan mode is soft guidance. Sandbox mode and approval policy enforce restrictions independently."*
- 恢复机制的代际变化：旧快照用 `foldPlanMode(events)` 现场折叠；MAIN 改为 `PlanModeController` 注入 `sessionProjections` 并注册 `planProjectionDefinition`（`:177/:227`），`agent/pre-step` 只在需要时 append 事件（`:12/:197`）——恢复语义从"各自折叠"收敛为"统一投影"。
- 对外控制面：`exit_plan_mode` 工具（`:67`）与 `/plan` 命令（经 `ctx.commands`）；UI 通过 `session/event` 观察翻转。

### 卫生：提醒与超时是两个可摘插件

- 重复工具调用提醒是 advisory（写进模型可见面但不阻断）；工具超时是 `tools/execute` 的 waterfall 包装器，靠工具声明 cooperative timeout 预算。两者独立、可组合可摘除（D5）；超时策略在 0.2.0 以 `dsh-tool-call-timeout-policy` 被 core 引用，**永不作为参数暴露给模型**。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/approval.md`、`docs/subsystems/goal.md`、`docs/subsystems/plan.md`
- `docs/subsystems/session-projection.md`（取代手写折叠）、`docs/subsystems/permission-presets.md`、`docs/subsystems/user-questions.md`、`docs/subsystems/commands.md`、`docs/subsystems/invariants.md`
