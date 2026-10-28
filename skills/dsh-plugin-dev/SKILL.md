---
name: dsh-plugin-dev
description: DSH（DeepSeek Harness）插件开发规范——文件结构/双半架构/host-client 声明分离/展示体系（client 卡片·槽位席位 slots·tab·DOM 主题令牌 --dsw-alias·渲染降级链）/家族节契约(family-tab)/9 语本地化/判定语义四值档位与交付陷阱。凡在 mine-dsh-plugins 或等价仓新写或改造 DSH 插件（dsh.plugin.json、cordis.patch.yml、dsh.client.inject、ctx.slots、locales.ts、settings 表单面、卡片/面板展示）时用。跨版本装不上/换代适配 → 用 dsh-plugin-peer-adapt；沙箱运行 → dsh-host-farm。
---

# DSH 插件开发（dsh-plugin-dev）

> 读者路径：**新插件从本页速查表起步 → 深查对应 references 分片**。所有结论 2026-10-11 对 0.2.0-rc.2/0.1.7-rc.2 宿主源码复核；跨版本断裂面一律查 `dsh-plugin-peer-adapt` 症状路由表，本页不重复。

## 1. 双半架构（3 行摘要）

- 插件 = host 半（Node，`apply(ctx, config)`，声明 Config schema/服务/inject）+ client 半（浏览器，`window.__ModuleLoader__.load({id, factory})`，**id 必须等于 npm 包名**，否则整体静默失活）。
- 两半通过 `dsh.client.inject` 清单与 slots/命名空间桥接；**注册必须发生在 client apply 期顶层**，关在任何 inject 回调里 = 两代事故根因。
- 骨架与两种文件态（JS 为主/TS 为主）→ `references/file-structure.md`、`references/dual-half-host-client.md`（后者注册骨架已换代，按 §2 分派改写后用）。

## 2. 设置面速查（结论表版；细节与迁移处方在 peer-adapt）

| 宿主线 | 插件怎么有设置 |
|---|---|
| 0.1.0/0.1.1 | 壳里根本没有设置页 → UI 自带（浮窗/命令） |
| 0.1.2–0.1.6 | `installSection(owner, ns, schema, base, hooks)`（base 先 resolveConfig）；0.1.6 线内 alpha.1↔2 有断代 |
| 0.1.7+/0.2.0 | **无命令式注册**：Config 字段标 `.volatile()` 自动成表单；自带页才 `settings.configure({auto:false})`；ns=active profile entry local id，不再自定 |

- ≤0.1.6 无 `.volatile()`——跨代代码必须 `typeof field.volatile === 'function'` 探测。
- VD 卡：installSection→VD-016-017-01、volatile→VD-015-016-04、键名重映射→VD-016-017-05。

## 3. 家族节契约 5 铁律（`references/family-tab-contract.md` v1.0，冲突以该文为准）

> 适用边界｜契约是 **dsh-family 私有实例**（自家插件群专属 id/选举序列）。其它插件群要共用一个聚合设置节 → 用参数化通用版 `references/generic-aggregation-section-playbook.md`（先填实例化参数表，机制铁律/选举协议/验收断言直接套用）。

1. 席位拓扑 id/键恒定禁改名：顶级节 `dsh-family`、子席位 `dsh-family.tab`、order 40、label「起子插件设置」。
2. 家族节全局**唯一所有者**且所有者必须渲染内容；让位选举=查账本（TL 正座→guard 500ms 兜底→steward 2600ms），⛔ 同 id 遮蔽位选举、⛔ 宽限期后注册。
3. inject 必须 apply 期注册；工厂在「声明事件」（面板打开）统一 fire；**注册必须走 `ctx.slots.inject` 包装管道**（裸 slots.register 的 entry 在 ≤0.1.5 壳不解）。
4. 宿主剥 inject 面 `hooks` 键转 `useTab` prop——组件读 `props.hooks.tabs` 必炸，需自带订阅兜底。
5. 验收硬断言：导航行数=1（ROWS= 计数，includes 文本断言禁作去重依据）+ 工厂日志归因 + 必须在部署产物上无头点击穿越。

## 4. 文件结构与 9 语清单（取代旧四语规范）

- 标准树 → `references/file-structure.md`；语言数=**9**（zh en ja ko fr de it ru es）：运行时 `src/client/locales.ts`（named-export 式：zh 键集为真理源，其余 8 语 `Record<keyof typeof zh, string>` 编译期对齐；map 式需循环注册+人工对键）+ 元数据 `locale/<lang>.json`（**en.json 必需锚**，宿主 `package-meta.ts:104-112,151` 扫描拒重复）+ package.json `exports./locale/*.json`。
- 全量规范与接线配方 → `references/locale-rollout-9-lang.md`（真源）。死文案（key 定义无人引用）= 漏渲染信号，当静态检查项。

## 5. 判定语义四值档位（诊断/体检/处置类插件的第一原则）

`ok`（正常）/ `warn`（**有据**可疑）/ `fail`（硬损坏）/ `skipped`（**无据、中性、不入聚合**）。
把「无法判定」当「异常」= 全量假阳性（实案：用户看到 30 条假异常）。判定与处置共享一个谓词 `isActionable()`（仅 warn/fail 可处置）；处置返回 `(verdict, explanation, residual)` 三元组。→ 20 条陷阱全表在 `references/judgment-and-delivery-traps.md` 首页速查。

## 6. 不要做（事故直译，含出处）

- ⛔ 只看 git log 宣布修好 → 核对装机产物哈希==仓库产物哈希（#13）；⛔ 浮动 ref 装东西 → 钉 SHA（#14）。
- ⛔ remove+add 裸重装（add 失败=插件消失）→ 先备份依赖行（#15）；⛔ `pnpm add` 当装好 → 不补 `dsh.profile.bundles`，须 `dsh plugin add` 对账（#16）。
- ⛔ 单测全绿宣布交付 → 四层 typecheck→test→build→**dist 冒烟**（#19）；⛔ 门禁语义只写文档 → 写进代码注释（#20）。
- ⛔ 面板挂载即干重活/落盘缓存不露生成时间（#7-9）；⛔ `settings.plugin.item` 以为有外壳——只分发不给壳（#10）。
- ⛔ stale-build：配 `prepublishOnly` 不等于 `npm pack` 会构建（只触发 `prepack`）——三层防线见 peer-adapt VD-012-015-05。
- ⛔ runtime 引入的 native binary（dll/.node/.so）与宿主已加载同名文件同进程共存——Windows LoadLibrary 按文件名去重、worker_threads 不隔离，ABI 不匹配崩溃或静默损坏（实案 prime-memory #11 sharp/libvips）→ 子进程隔离，判据与清单比对配方见 `references/native-module-isolation.md`（发版闸 G7）。

## 参考分片

`three-generation-settings-waist.md`（10 号全篇，三代 waist+六线槽位实测）· `family-tab-contract.md`（12 号全篇）· `judgment-and-delivery-traps.md`（08 号全篇 591 行）· `dual-half-host-client.md` · `file-structure.md` · `locale-rollout-9-lang.md` · `native-module-isolation.md`（native 模块子进程隔离模式，起源 prime-memory #11）· `historical/`（compat-012 与 version-distribution，仅沿革用，均带废止横幅）。

## 边界（不重述）

authoring 通用机制/主题令牌/禁 import 客户端包 → 宿主一方 skill `cordis-plugin-development`；farm 命令与版本边界 → `dsh-host-farm`；跨版本断裂面与门禁 → `dsh-plugin-peer-adapt`；投稿发版 → `dsh-plugin-release`；宿主内部原理 → `dsh-host-internals`。

## Maintenance

锚点唯一闸 `.agents/prd/skill-anchor-map.yaml`；宿主升 rc 后重跑 grep，未命中段落加「⚠ 待重新核实」。重复即腐化：任何事实两处出现改为一处+see-also。
