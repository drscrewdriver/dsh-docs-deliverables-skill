# digest-06 · 记忆的落地：持久化 / session-query / compaction

> **来源**：`dsh-study-docs/详解/第06篇-记忆的落地.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示（本篇为全套中漂移第一位）**：旧文档 N5 写着 **`SESSION_FORMAT_VERSION = 0`**；MAIN 实测 **`= 4`**（`packages/core/session/src/types.ts:89`），并新增 `packages/session/session-format` 分组与 **v0→v1→v2→v3→v4 迁移链**；`session-persistence-jsonl` 里大量 `sourceVersion < SESSION_FORMAT_VERSION` 分支（实证 `src/index.ts:457/484/517/547/840/1122/1155`）。旧文"压缩结果只有三段 seq"也已扩展：`CompactionResult` 现含 `shadowedRange` / `shadowedSeqs` / `shadowedTokenCount`。

## 0 WHY（一段）

第 02 篇的会话日志是**内存中**的真相源；"记忆"要真正可用还差三件事：**落盘**（进程重启后还在）、**检索**（从历史里找到东西）、**压缩**（上下文窗口装不下时）。三个场景：长任务跑到一半崩溃，重启必须恢复会话且日志保持平衡（不能有"开了轮不关轮"）；用户问"上次让 agent 查的那份文件路径"，需要跨会话全文检索；长对话逼近窗口上限，需要把旧范围摘要化、替换出窗口，且这个过程**可审计、可回放**。三件事各自成缝，但共享同一地基——持久化**搬运**日志、查询**读**日志、压缩只改写日志的 surface 投影，**从不另起炉灶**。

## 1 WHAT：职责边界

- **拥有**：`session-persistence`（`ctx.sessionPersistence` 抽象契约）、`session-persistence-jsonl`（逐会话 transcript 文件）、SQLite 后端；`session-query`（`ctx.sessionQuery` 只读检索）+ `session-query-sqlite`（全文索引生命周期）；`compaction`（`ctx.compaction` 缝）+ `compaction-basic` 后端。
- **不拥有**：事件词汇本身（→ core/session）、模型调用（摘要经 `ctx.llm.stream()`）、UI 会话浏览（→ `client/ui-trajectory`）、标题与遥测（→ `session-title` / `session-telemetry`）。
- **需求面**：R1 持久可恢复 · R2 **持久化不引入平行事件类型**（"no parallel persisted event type"）· R3 检索有界 · R4 上下文可压缩；N1 复制不阻塞生产者（flush 是显式检查点）· N2 批处理有界 · N3 摘要事件带 provider/model/usage/rawOutput 可重建 · N4 检索只读 · N5 日志格式版本受控。
- **原则**：P1 搬运不翻译 · P2 合成平衡（孤儿边界由合成事件关闭，不改动前后独立事件）· P3 **锁最后释放**（崩溃 = 可检测的孤儿锁）· P4 **摘要替换不删除** · P5 查询只读。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `packages/session/session-persistence/src/index.ts` | `:135` `export abstract class SessionPersistence extends Service`；`:50` `SessionPersistenceSnapshot`；`:62` CreateOptions；`:78` `SessionStorageMetadata`；`:86` `SessionInspection`；`:104` ListOptions | 目录级 | VERIFIED |
| 2 | `packages/session/session-persistence/src/handle.ts` | `:14` `SessionAccess = 'read' \| 'write'`；`:59` `SessionHandle extends AsyncDisposable`；`:17/:23/:34/:40` read/append/flush 选项与结果 | 旧文未单列 | VERIFIED |
| 3 | `packages/session/session-persistence/src/errors.ts` | `:13` NotFound、`:22` AlreadyExists、`:31` AlreadyOwned、`:40` ReadOnly、`:59` **OwnershipLost**、`:68` Closed、`:93` Corruption、`:111` **SessionFormatUnsupportedError**；`:85` `SessionLocation` | 旧文以 `SessionLocation` 为主 | VERIFIED |
| 4 | `packages/session/session-persistence/src/revision.ts` | `:9` `SessionPersistenceRevision`（branded） | 旧文未列 | VERIFIED |
| 5 | `packages/session/session-persistence-jsonl/src/index.ts` | `:36` import `SESSION_FORMAT_VERSION`；`:90` `Config`；`:84` `JsonlCompressionSchema`；`:273` 与 `sessionFormatCatalog.currentVersion` 对齐校验；`:1155` header 版本闸门 | 目录级 | VERIFIED |
| 6 | `packages/session/session-format/src`（+ v0→v1 / v1→v2 / v2→v3 / v3→v4 迁移包） | 分组存在（`Test-Path` 实证） | **0.1.0 无此概念** | N/A@0.1.0 → VERIFIED@0.2.0 |
| 7 | `packages/session-query/session-query/src/types.ts` | `:24` `SessionEventSurface = 'current' \| 'shadowed' \| 'log-only'`；`:27` `SessionRecord` | `14~16` | **DRIFTED**（行号） |
| 8 | `packages/session-query/` 分组 | 实测成员：`session-log-export` `session-query` `session-query-sqlite` `tool-session-query` | 旧文只列定义 + sqlite | VERIFIED（含新增包） |
| 9 | `packages/compaction/compaction/src/types.ts` | `:94` `CompactionResult` | `29~43` | **DRIFTED**（文件内位置 + 字段扩张） |
| 10 | `packages/compaction/compaction/src/index.ts` · `invariant.ts` | `index.ts:32` `CompactionTrigger = 'pressure' \| 'context-overflow'`；`index.ts:106` `'compaction/summary-error'`；`invariant.ts:59` `'compaction/summary' \| 'compaction/prune'` | 旧文只描述三事件 | VERIFIED（事件词汇已扩） |
| 11 | `packages/compaction/` 分组 | 实测成员：`command-compact` `compaction` `compaction-basic` `compaction-image-offload` `compaction-tool-result-pruner` | 旧文只列 basic | N/A@0.1.0（后三者为新增） |

## 2.2 HOW 骨架

### 持久化是搬运工：flush 检查点 + 合成平衡

- `session/event` 是同步通知，持久化复制**不阻塞生产者**；`session/flush` 取消批处理等待、排干到 quiescence，是循环的顺序与错误观察点（D1）。
- 固定批处理窗口只约束"有意的等待"，不约束调度或后端延迟（N2）。
- 崩溃恢复：孤儿 `turn/start` 由后端**合成** `turn/end { reason: { kind: 'interrupted' } }` 关轮，不截断、不改动前后独立事件（D2）。
- 同词汇、可互换后端：JSONL 与 SQLite 实现同一契约，**后端不得发明事件类型**（R2）。

### SessionLocation 是位置提示，不是授权令牌

- `SessionLocation { kind, path }`（`errors.ts:85`）：路径可能尚未物化、可能不含未 flush 的轮次，不可当 authorization token。

### 检索三态：current / shadowed / log-only

- 每个事件在检索时被分类：`current`（在当前模型上下文里）、`shadowed`（被压缩替换的旧范围，仍在日志里可查）、`log-only`（从不进模型可见面，如 compaction 自身的事件）。
- 这个三态是"摘要替换不删除"（P4）在类型层面的落点——R3 的验收就是"不把 shadowed 内容当当前上下文返回"。
- 检索全部只读，永不产生日志副作用（N4）；全文索引生命周期归 `session-query-sqlite` 提供者，定义包与索引实现解耦（D5）。

### 压缩生命周期：锁 → 摘要 → 替换 → 解锁

- `compaction/start` → 摘要 → `compaction/summary` → `user/message` + `surfaceOp: replace` → `compaction/end`，**end 最后落账**，崩溃即留下可检测的孤儿锁（D3 / P3）。
- 替换产物是普通 `user/message`，**不扩展 SurfaceEventType**——模型可见面永远只由 surface 事件构成（D4）。
- summary 事件携带 provider/model/usage/rawOutput 并标 `llmStreamCall: true`，一次请求可从"日志 + 代码"完整重建（N3）。
- 0.2.0 增量：`compaction/prune` 与 `compaction/summary-error` 事件、`CompactionTrigger` 区分压力溢出与上下文溢出、结果记录 shadowed 区间/序号/token 数（全形实证 `packages/extensions/tool-cordis/src/api-catalog.ts:4778`）；新增 `command-compact`、`compaction-image-offload`、`compaction-tool-result-pruner` 三个后端侧插件。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/persistence.md`、`docs/subsystems/session-query.md`、`docs/subsystems/compaction.md`
- `docs/subsystems/session-projection.md`（0.2.0 投影体系）、`docs/subsystems/session.md`
- `docs/persistence-catalog.md`（生成的持久化事件目录）、`docs/subsystems/storage.md`、`docs/subsystems/spill.md`
