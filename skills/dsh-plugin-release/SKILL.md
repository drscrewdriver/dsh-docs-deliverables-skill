---
name: dsh-plugin-release
description: DSH 插件发布与投稿全流程——awesome-dsh-plugin 投稿（YAML 条目/CAT_IDS/PR≤3 条硬规/fork 同步纪律/README 重生成 CI 闸）、npm 发布纪律（registry 钉死/dist-tag/prepack-stale-build 三层防线/V1-V6 包门禁）、日期推导事故教训（git 历史≠数据库）。凡涉及「投稿插件」「发版」「publish」「dist-tag」「打包后没生效」时用。跨版本适配门禁 → dsh-plugin-peer-adapt；装机/冒烟命令 → dsh-host-farm。
---

# DSH 插件发布与投稿（dsh-plugin-release）

> 用法：本页速查 + 事故对照 → 深查 `references/` 分片。发布闸=用户 2FA（人工确认），技能只备料不代发。

## 1. awesome-dsh-plugin 投稿 5 步（全细节 `references/awesome-submission-full.md`，PR #2658/#2660 实证）

1. **前置**：仓库公开 + README/文档达标 + 先同步 fork main 与 upstream（**不同步=连带变红**，见 §4）。
2. 在 `data/plugins/` 新增 `<作者>__<插件名>.yml`：`url/name/category/description.{en,zh}`——category 取 **CAT_IDS 白名单**（tools/docs/…，全集见全篇），非法值 CI 红。
3. **每个 PR ≤3 条投稿**（硬约束）；描述双语必填、与 README 事实一致。
4. 过 CI 闸：含 **README 重生成检查**（目录页由脚本重生成，手改目录=红）与元数据校验。
5. Review 意见→同分支修订，不重开 PR。

## 2. npm 发布纪律（零号发现优先）

- **默认 registry 可能是 npmmirror 镜像**（`~/.npmrc`），而 auth token 只钉 npmjs：`publish` 必须显式 `--registry=https://registry.npmjs.org`，裸发=打向镜像失败/错投。
- **view 同样必须钉 npmjs**：镜像有同步延迟，fresh publish 后查镜像会 404/旧值。纪律：**publish 输出不可信、view 为准、view 必须钉源**。
- dist-tag：`publishConfig.tag` 与目标宿主线一致——带旧 tag 发新版本 = dist-tag 错指（实案：tag=dsh-0.1.7 的仓发 0.2.0 线构建会把 dsh-0.1.7 错指）。多线并存用精确枚举 tag 矩阵，见 peer-adapt gate-checklist。
- 发布顺序先例：依赖面小的先（IT→guard→TL→steward 批次范式），每步 npm view 复核后再下一仓。

## 3. 包门禁 V1-V6 速查（检测器=mine-dsh-plugins `_tools/verify-package.mjs`）

| 闸 | 抓什么 |
|---|---|
| V1 | package.json 与 dsh.plugin.json 版本一致（元数据卫生级） |
| V6a | **tgz 内 lib 与仓库 lib 逐字节一致**（stale-build 主闸） |
| V6b | src mtime vs lib mtime（lib 早于 src=旧构建） |
| 其余 V2-V5 | files 清单/bin 存在/manifest 面（详见 gate-checklist） |

**stale-build 三层防线**（本季最大冤案，「源码改了冒烟绿了 UI 没反应」翻案三次）：① 所有 build 型仓注入 `prepack: npm run build`（**npm pack 只触发 prepack，不触发 prepublishOnly**）；② verify-package V6 闸；③ 验收必须 browser-probe 在**部署产物**上跑 UI 断言——HTTP 冒烟绿 ≠ UI 正确。任何「源码已修、实测定罪」结论先跑 V6。

## 4. 日期/历史陷阱（`references/date-derive-postmortem.md`）

- **git log 不是数据库**：`git log -p` 看不见 merge diff——把提交历史当数据史导出会得出错误日期，上游 PR #2662 合并后曾致 main 构建连红、连带所有以 main 为基的 PR 检查变红。
- 三来源可信度排序与推导规程见复盘全文；投稿日期字段以**可验证来源**为准，禁「看起来像」。

## 5. 交付宣布前检查（与 dev §6 呼应）

装机产物哈希==仓库产物哈希才许宣布「修好」；浮动 ref 一律钉 SHA；remove+add 前备份依赖行；`pnpm add` 后必须 `dsh plugin add` 对账 `dsh.profile.bundles`；四层验证 typecheck→test→build→dist 冒烟全走才谈交付。

## 参考分片

`awesome-submission-full.md`（675 行全流程+附录 B/C）· `date-derive-postmortem.md`（事故复盘全篇）· `release-incident-ledger-2026-10.md`（11 号台账全篇，A6 须与 dsh-plugin-dev 的 family-tab-contract 勘误块同读、契约优先）· `registry-and-dist-tag.md`（registry/tag 契约条款页）。

## 边界（不重述）

farm 启动/冒烟操作 → `dsh-host-farm`；门禁判据全集与分级 → `dsh-plugin-peer-adapt/references/gate-checklist.md`；插件本体规范 → `dsh-plugin-dev`。

## Maintenance

锚点唯一闸 `.agents/prd/skill-anchor-map.yaml`；registry/tag 类结论涉外部状态，每次发版批次以当场 npm view 实证刷新，不引用陈旧快照。
