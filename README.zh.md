# dsh-docs-deliverables-skill（中文）

MIT ｜ 零运行时依赖 ｜ bundle 插件

把 **DSH 插件开发知识库**以 agent 技能形态交付的 DSH bundle 插件：四个技能（插件开发规范 / 覆盖六条 0.1.x–0.2.0 宿主线的跨版本适配台账 / 发版与 awesome 投稿纪律 / 宿主架构解读），经官方 `ctx.skills` provider 注册表供给模型；`skills/` 目录本身也可直接拷进任意 `.agents/skills`。

包内每条技术结论都对 `deepseek-harness@0.2.0-rc.2`（主基准）与 `0.1.7-rc.2`（辅基准）做过源码核验，带 VERIFIED / FARM / PENDING / UNVERIFIED 三态标签、`file:line@版本` 锚点，以及宿主升级后重跑 grep 的维护闸（`maintenance/skill-anchor-map.yaml`）。**无任何机器绝对路径**——引用一律工作区相对（`<ws>` 占位）。

## 安装（作为 DSH 插件）

```sh
dsh plugin --profile web add github:<owner>/dsh-docs-deliverables-skill
```

bundle 行挂载 `src/index.js`，向 `skills/` 注册 bundled SkillProvider。若某 profile 未挂技能注册表，插件静默空转（`ctx.get('skills')` 软守卫）。

## 安装（不经插件宿主）

把 `skills/` 下四个目录拷入 `<项目>/.agents/skills/`（项目级）或 `~/.agents/skills/`（用户级）。布局即宿主原生发现格式（`<技能名>/SKILL.md`），Qoder/Trae 系 agent 读同一约定。

## 技能一览

| 技能 | 一句话 |
|---|---|
| `dsh-plugin-dev` | 文件结构、双半架构、家族节契约、9 语本地化、判定语义 |
| `dsh-plugin-peer-adapt` | 症状路由表 → 六线 38 张变化卡、D/V/G 门禁、我方 32 仓适配判例 |
| `dsh-plugin-release` | awesome 投稿流程、npm registry/dist-tag 纪律、stale-build 三层防线 |
| `dsh-host-internals` | 12 篇宿主子系统解读摘要 + 100 条 @0.2.0 重锚源码指针 |

## 开发

```sh
npm run verify   # 布局 + kebab-case + 绝对路径可移植闸（prepack 自动跑）
```

## 状态与边界

- 内容是编纂时点（2026-10-11）的快照，**不是**在线文档服务；按需库文档请看 `dsh-context7` / `dsh-mcp-context7`。
- 逐线运行时矩阵（各 host profile 是否挂载 `ctx.skills`）为 PENDING：`registerProvider` 已用 `git grep` 在全部六线 tag 源码级证实，尚未逐线装机验证。
- npm 发布前：补 `repository` 字段；publish 与 view 都钉 `--registry=https://registry.npmjs.org`（镜像污染教训）。

## 许可

MIT
