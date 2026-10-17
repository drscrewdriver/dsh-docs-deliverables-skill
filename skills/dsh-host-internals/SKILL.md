---
name: dsh-host-internals
description: DSH（DeepSeek Harness）宿主内部架构查阅——12 篇模块解读的 digest 分片 + 源码锚点侧车（file:line@0.2.0-rc.2）+ 读者路由表。凡需要理解宿主某子系统如何工作（Cordis 框架/core 主干/shell 能力缝/llm-typert/执行世界-沙箱/记忆/多智能体/协作治理/cli-boot/GUI 前后端/协议 SDK/工程体系）或「我要给插件加 X 能力该碰哪个面」时用。写插件的操作规范 → dsh-plugin-dev；版本断裂面/适配 → dsh-plugin-peer-adapt，本技能只讲原理与定位。
---

# DSH 宿主架构查阅（dsh-host-internals）

> **代际声明**：原文 12 篇（`dsh-study-docs\详解`）基于宿主快照 0.1.0-rc.5；本技能的 digest 已按 MAIN=`deepseek-harness`@0.2.0-rc.2（辅证 AUX=.harness-017rc2-wt@0.1.7-rc.2）逐锚 grep 重验，anchors 侧车 100 条（VERIFIED 65 / DRIFTED 29 / N-A@0.2.0 5 / UNVERIFIED 1）。**跳转失败或行号对不上时先查 `references/anchors.md` 的漂移标注，勿拿 0.1.0 行号硬贴新源码。**
> 用法：**①下表演找「要加/查什么 → 读 digest-NN」→ ②读该 digest 的文件导航表 → ③需一手权威时读 MAIN 仓库内 `docs\subsystems\*.md` 原文（digest 延伸阅读已换成这些指针）**。

## 读者路由表（浓缩版；68 行全表在 `references/routing.md`）

| 要给插件加/查… | digest | MAIN 一手文档 | 关键源码起点 |
|---|---|---|---|
| 服务/事件/依赖注入机制（cordis 语义） | 01 | docs/subsystems/cordis*.md | vendor/cordis/src/{service,events,fiber}.ts |
| 会话主干/消息流/投影 | 02 | docs/subsystems/core.md、session.md | packages/core/*、session/*（format v4，投影注册案） |
| shell/工具执行能力缝 | 03 | docs/subsystems/shell.md、tool-execution-pipeline.md | packages/shell/*、capability-seams.md |
| llm 调用/typert 流式 RPC | 04 | docs/subsystems/typert.md | packages/llm/*、typert/*（codec create 工厂面） |
| 沙箱/权限/执行世界 | 05 | docs/subsystems/sandbox 相关 | packages/sandbox/*、native/system（原 landlock-run 已迁） |
| 记忆/prime-memory 落地面 | 06 | docs/subsystems/memory 相关 | packages/memory/*、session-projection |
| 多智能体/subagent | 07 | docs/subsystems/subagent.md | packages/subagent/*（goal：GoalActivation/Projection） |
| 人机协作/审批治理 | 08 | docs/subsystems/approval 相关 | packages/approval/* |
| cli/boot/装配与 profile | 09 | docs/subsystems/boot 相关 | packages/boot/*（app-boot/plugin-manager；**闸门判定面在 plugin-compatibility.ts**） |
| GUI 前后端/slots/组件挂载 | 10 | docs/subsystems/web.md、web-styling.md | packages/client/{store,resources,web,ui-renderer}（原 client/runtime、web-react 已重组；apiproxy→client/connection+packages/api/*9 包） |
| 协议/SDK/Remote 端点 | 11 | docs/subsystems/api-gateway.md | client/connection/src/index.ts、api/{gateway,remotes}/* |
| 工程体系/构建/测试/发布 | 12 | docs/development.md、testing.md | Makefile、vitest.*.config.ts、scripts/* |
| **设置表单面** | → 不在此技能 | — | **0.1.7+ 换代最剧：installSection 已删 → SettingsForms+volatile。直接查 dsh-plugin-peer-adapt VD-016-017-* 与 settings-registration-migration** |

## 漂移警示区（0.1.0-rc.5 → 0.2.0-rc.2 实测三大块）

0. **⚠ 0.2.1 线二次漂移（2026-10-17 登记）**：本技能 anchors 侧车基准仍钉 0.2.0-rc.2；**≥0.2.1-alpha.2 碰包路径的结论需先在新基线重探**——能力包大搬迁（hooks/webhook/skill-badge/tool-ralph/tool-session-query/tool-terminal → `packages/experimental/`）+ bundle 打包制（a.2）、子代理 activation 统一（`startActivation()`，in-process-driver 移除）、working-directory 能力缝（`{{cwd}}` 删除）、客户端契约符号换代（projectUserText/RenderMessageImages/OperatorPeer，a.3）、闸门 engines.dsh 时代（a.4）——探针基用 MAIN=`<ws>/deepseek-harness`（含 dsh-v0.2.1-alpha.1..5/rc.1 全 tag，`git show|grep <tag>` 即探）；断裂面详单 → dsh-plugin-peer-adapt §7 / `mine-dsh-plugins/dsh-docs-deliverables/source-analysis/v0.2.1-*`。

1. **GUI 客户端分层重组**（digest-10 头部标注）：slot 贡献契约改 `inject:['slots'] + ctx.slots.inject`；`ui-*` 包 39→54。
2. **会话格式与投影**（digest-02/06/08）：`SESSION_FORMAT_VERSION` 0→4；手写 fold 已废，走 `ctx.sessionProjections.register`。
3. **设置面 + 工程拓扑**（digest-07/12）：`examples/` 删、`native/landlock-run`→`native/system`、`workflow-worker-thread`→`workflow-ptc`、agent-presets 迁 packages/preset。

## 参考分片

- `references/shards/digest-01..12.md` — 每篇 ≤8KB（WHY/WHAT/HOW+校正后导航表；EXAMPLE/FAQ 已砍）
- `references/anchors.md` — 100 条 load-bearing 断言重锚表（context7 式检索坐标：claim|旧锚@0.1.0|新锚@0.2.0|状态）
- `references/routing.md` — 全量路由表 68 行
- 原文全篇（未摘要）：`<ws>/dsh-study-docs/详解/`（冻结底稿；`<ws>`=知识库所在工作区根）

## 边界（不重述）

插件怎么写/家族节/9 语/判定语义 → `dsh-plugin-dev`；跨版本断裂面 → `dsh-plugin-peer-adapt`；宿主一方 authoring → `cordis-plugin-development`；farm 运行 → `dsh-host-farm`。

## Maintenance

anchors.md 是唯一复核面：宿主升线后重跑其中 grep，状态列刷新即可，digest 仅在结构性变化时重剪。UNVERIFIED 条目（现 1 条：client/locale 包）不可当事实引用。
