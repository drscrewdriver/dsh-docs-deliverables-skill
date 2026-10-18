---
name: dsh-plugin-peer-adapt
description: DSH 插件跨版本适配主技能——同时支持 0.1.0-rc.8 / 0.1.1 / 0.1.2 / 0.1.5 / 0.1.6 / 0.1.7 / 0.2.0 / 0.2.1 八线宿主（闸门存在 engines.dsh 优先的换代：≤0.2.1-alpha.3 纯 peer，≥0.2.1-alpha.4 engines.dsh 独裁）。凡涉及：配置面适配（cordis Config schema/schemastery/volatile/settings 表单）、老线装不上/被拒载、installSection is not a function、设置卡不派发、卡片头有但表单空白、改值不热生效、语言包不生效、peer range 怎么写、engines.dsh 拒载、requirements 字段改名、宿主换代适配（compat-0.2.0 类）、devDeps 假绿、双清单/tag 门禁、跨线发版核对——一律先查本技能症状路由表。与 dsh-host-farm（沙箱操作）、cordis-plugin-development（宿主一方 authoring）互补不重叠。
---

# DSH 插件跨版本适配（peer-adapt）

> 用法（context7 式三段）：**①症状在本页路由表命中 VD-ID → ②到 `references/version-delta-ledger.md` 取完整卡（≤20 行/卡）→ ③可选：拿卡内锚点 grep 宿主源码现场核验**（基准 `<ws>/deepseek-harness`@0.2.0-rc.2，含 dsh-v0.2.1-alpha.1..5 与 rc.1 全 tag——0.2.1 线探针直接 `git show|grep <tag>` / `<ws>/.harness-017rc2-wt`@0.1.7-rc.2 / `<ws>/dsh-repo`@0.1.5-rc.2；`<ws>`=本知识库所在工作区根，基线清单见 `.agents/prd/skill-anchor-map.yaml` meta.baselines）。
> 实证纪律：一切结论三态标注 VERIFIED/FARM/PENDING；原文档冻结，本技能为修订版唯一出口。

## 症状路由表（症状词 → VD-ID）

| 症状（用户/日志原话） | VD-ID | 处方一句话 |
|---|---|---|
| Failed to load plugins / 载入即抛 | VD-011-012-01 | 客户端包换代未对齐，查卡 |
| 配置面/Config schema 怎么跨代适配 | VD-016-017-01 | 三代分派：无设置页→installSection→volatile 声明式（详表见 dev §2） |
| cordis 配置加载报错/z.string(...).volatile is not a function | VD-015-016-04 | 宿主 schemastery 需 >=3.18.2，devDeps 用 ^3.18.4 保嵌套（手册 §3.7） |
| installSection is not a function | VD-016-017-01 | 0.1.7+ 无命令式注册，改 volatile 声明式 |
| settings.register is not a function | VD-015-016-05 | 该服务方法三代均不存在（历史臆想分支） |
| installSettingsSection is not a function | VD-010-011-02 | 第 1 代模块级具名导出，按线分派 |
| UI 全无但插件显示已启用 / client 半不执行 | VD-016-017-02 | settingsScope 已删→configForms；注入回调核对 |
| 设置项没地方填 / 无设置页 | VD-010-011-03 | 0.1.0/0.1.1 壳无设置页，UI 只能自带 |
| 设置里找不到卡片 | VD-012-015-03 | 槽位派发口径，查三代表 |
| 卡片头有、表单空白 | VD-017-020-02 | plugins.item 仅官方卡片头，第三方注册=死代码 |
| 老设置值丢失 / 只生效一次 | VD-016-017-05 | settings.yaml 键名重映射未做 |
| ValidationError: expected string but got [object Object] | VD-012-015-02 | installSection base 必须先 resolveConfig |
| .volatile is not a function | VD-015-016-04 | ≤0.1.6 无该方法，先探测再链式 |
| 改值不热生效 / volatile fields require fixed path | VD-016-017-06 | volatile 更新面约束，查卡 |
| incompatible with this host / 被拒载 | VD-016-017-08 | **唯一开关=放宽 peer range**（见下） |
| 老线全部插件同时失效 | VD-017-020-05 | `<0.2.0-0` 数值型预发布 < rc，上界拒 rc |
| 0.2.1-alpha.4+ 装了带 `engines.dsh` 的包被拒载 | VD-020-021-01 | **新时代**：engines.dsh 单独裁决，peers 被忽略；range 须覆盖全部目标版本或删键回 peer 规则 |
| 读 IncompatiblePlugin/PluginCompatibility 的 `peers` 字段拿不到 | VD-020-021-01 | a.4 起改名 `requirements`（键=engines.dsh 或 peer 包名） |
| `engines.dsh` 写 `workspace:*` 被判不兼容 | VD-020-021-01 | `workspace:` 仅在 peers 合法；engines.dsh 内一律拒 |
| 版本号升了但 bug 还在 | VD-012-015-05 | stale-build：npm pack 只触发 prepack |
| 只有英文标题 / 语言包不生效 / 1 entry did not activate | VD-016-017-09 | 9 语接线缺失 |
| 老会话打不开 / 会话字段读空 | VD-016-017-10 | session format 换代，查投影 |
| props.hooks undefined / 拿不到 tabs | VD-017-020-03 | 宿主剥 hooks 键转 useTab prop |
| 包已装但 client 从不加载 | VD-017-020-06 | bundle 挂载 id ≠ npm 包名 |
| 找不到 dsh-client-runtime / 包名解析失败 | VD-011-012-02 | 客户端包名换代 |
| 0.2.0 要另写一套适配？ | VD-017-020-01 | 否，0.1.7 面基本平移，差异见卡 |
| 按 0.1.6 写 range 打不中 | VD-015-016-01 | 0.1.6 线内 alpha.1↔alpha.2 断代 |
| 未知席位注册后静默无效果 | VD-015-016-02 | 槽位名是宿主内部契约，改名=静默失效 |
| 桌面端插件管理与 web 不一致 | VD-017-020-07 | 查卡 |
| arrowkey / sessions.open 失效 | VD-015-016-06 | 服务面断代 |
| 权限闸门报 not registered | VD-016-017-05 | 同老设置值丢失案 |
| 装了 engines.dsh 后反而被拒载 / 范围写不对 | VD-020-021-01 | **≥0.2.1-alpha.4：engines.dsh 独裁、peers 被忽略**；要 peer 白名单就删 engines.dsh |
| 拒载记录里读 peers 为空 / undefined | VD-020-021-01 | ≥a.4 改名 `requirements`；过渡读 `rec.requirements ?? rec.peers` |
| 升级宿主后插件更新不生效 | VD-020-021-07 | ≥a.4 跨宿主 release 不自动应用，按提示重载 |
| install_bundle 报 already-installed | VD-020-021-02 | ≥a.3 先 remove_bundle 再 install_bundle |
| job_output/job_kill 找不到 job / 事件配不上对 | VD-020-021-02 | ≥a.3 JobId=`<kind>-<short-uuid>`；删 executionId 映射，原样透传 |
| subagent 配置被拒 persona/toolFilter | VD-020-021-02 | ≥a.3 改 agentPreset 组装；fork 继承 |
| JSONL 持久化默认导入报 undefined / instanceof 断言失败 | VD-020-021-02 | ≥a.3 命名空间插件 `import * as`；类型用 SessionPersistence |
| 脚本/SDK 收不到 $events | VD-020-021-02 | ≥a.3 非页面 Connection 默认 interactions:'none'；要答交互显式 answer |
| 凭据 env 注入被存储盖掉 | VD-020-021-02 | ≥a.3 存储 refs > env；headless 默认禁存储 |
| 委派后拿不到后台 job（run_in_background 无效） | VD-020-021-06 | ≥a.2 激活统一化 `{kind:'activation'}`；start→startActivation |
| prompt 模板残留 {{cwd}} 报错 | VD-020-021-06 | ≥a.2 变量已删；改 ctx.workingDirectory |
| BundleInfo 缺 official/availability 断言失败 | VD-020-021-06 | ≥a.2 必填字段；构造方/精确测试补字段 |
| webRuntime.trustedHosts 注入失效 | VD-020-021-06 | ≥a.2 改 webStartup；通配 host 加载即拒 |
| session-title 导入 registerSessionTitleLlmProvider 编译断 | VD-020-021-06 | ≥a.2 三导出删；直注 ctx.sessionTitle.register() |
| 槽注入成功但永远不渲染 / 具名符号 tsc 断 | VD-020-021-03 | ≥a.3 旧名 conversation.message.images 改名进 chat 家族；新面 hero.options/workspace.toast/plugins.tab(a.4)/input.model.label(a.5) |
| 账号通知元数据读空 / orderId 非 UUID 断言炸 | VD-020-021-04 | ≥a.5 可选 JsonValue 需收窄；空 expiresAt=永久 |
| 0.2.1-alpha/rc 互相打不中 | VD-020-021-05 | 同三元组预发布序 alpha<rc：^0.2.1-alpha.1 含 rc.1；>=0.2.1-rc.1 不含 alpha；rc.1 本身=纯 bump 面同 a.5 |

完整卡与 PENDING 项 → `references/version-delta-ledger.md`（44 卡，含 §7 0.2.0→0.2.1 七卡）。未命中症状：Grep 台账文件症状列。

## 核心定论（已裁决，不得与旧文档混读）

1. **兼容性闸门判定面（双时代，VERIFIED@源码锚定）**：
   - **纯 peer 时代（0.1.7-rc.1 ～ 0.2.1-alpha.3）**：宿主只读插件 `package.json.peerDependencies` 中 `@deepseek-ai/dsh`/`@deepseek-ai/dsh-*` 前缀项，`semver.satisfies(runtime, range, {includePrerelease:true})`；**不读 engines.dsh、不读 dsh.plugin.json**（锚 `packages/boot/app-boot/src/plugin-compatibility.ts:61-88@0.1.7-rc.2+0.2.0-rc.2`，0.2.1-alpha.1..3 零 diff）。
   - **engines.dsh 时代（≥0.2.1-alpha.4，含 rc.1/rc.2）**：包自带 `engines.dsh` range **单独决定**兼容性（peers 全忽略）；无该键才回落 peer 规则。`workspace:` 值只在 peers 合法（engines.dsh 内判不兼容）；`engines` 非对象/`engines.dsh` 非字符串 → **拒载**。拒载记录字段 `peers` 改名 **`requirements`**（`IncompatiblePlugin` 与 app-boot `PluginCompatibility` 同步；锚 `plugin-compatibility.ts@0.2.1-alpha.4` + 官方指南 `docs/upgrade-guide/v0.2.1-alpha.3/plugin-engines-dsh/`）。跨线解锁开关：无 engines.dsh 的包仍是放宽 peer range；有则改 range 本身（或删键回退 peer 规则）；`dsh plugin allow-version` 豁免语义两时代不变。
2. **semver 预发布三结论**（semver 包实测）：`^x.y.z-rc.n || …` 只连同三元组 rc，**跨线 caret 是假声明**；`>=a-rc.1 <b-0` 上界健全；精确枚举 `A || B` 无暗坑。`<0.2.0-0` 拒所有 `0.2.0-rc.x`。
3. **三层模型**（适配的实质）：元数据层（hosts.mjs→peerRange→sync-hosts 单源下发）→ 验证层（CI 逐 rc 真机矩阵）→ 运行时层（能力探测窄腰）。只抄 peer 不抄 CI = 把没验证的版本写进白名单。
4. **版本识别三级优先**：能力探测（`typeof x==='function'`，禁止读版本号）> 宿主版本号双锚点（realpath+prefix）> **禁止**用插件自己 node_modules 判宿主。分支决策集中一个窄腰文件。
5. **inject 强校验**：`dsh.client.inject` 清单 0.2.0+ 挂载期报错；插件级 inject 卡 PENDING 会触发启动审计失败——能 scoped 就 scoped。
6. **取证口径红线**：farm 共享格 ≠ 某线能力源（外来 peer hoist「假满足」四例实证）；逐线断言须用 `npm pack <pkg>@<rc>` 读类型面或只装目标包的干净格。npm 查询钉 `--registry`（镜像污染）。

## 老线支持六步配方（对任插件跨任一线）

1. 症状→查 VD 卡（上表）；2. peer range 按 supportedHosts 枚举加宽（hosts.mjs 单源）；3. devDeps 换代到开发线（判「假绿」前先确认该包被 src import 作类型基线——as 强转豁免案）；4. 双清单 version/engines 同步（P2 卫生级，verify-package V1）；5. publishConfig.tag 核对（防 dist-tag 错指）；6. 逐线实证（干净格/npm pack + 矩阵断言）。

## 参考分片（按需加载，勿全读）

- `references/version-delta-ledger.md` — 45 变化卡（本技能核心数据）
- `references/host-matrix.yaml` — 七线×5 列矩阵 + git tag 探针取证
- `references/gate-checklist.md` — D1-D11/V1-V6/G1-G6/T 门禁 42 条（分级已按裁决重标）
- `references/settings-registration-migration.md` — installSection 迁移 549 行全篇（三代定性+处方）
- `references/peer-enum-adapt-guide.md` — 09 枚举 peer 指导全篇（含逐插件适配卡）
- `references/enum-peer-index.md` — 七仓执行 INDEX（§G 修正已并入）
- `case-law/PRECEDEIndex.md` — 我方 32 仓先例索引（插件×线→当年坑+当前实态）

## 边界（不重述）

插件 authoring/install/verify 通用机制 → 宿主一方 skill `cordis-plugin-development`；farm 沙箱启动/冒烟命令/版本边界 → `dsh-host-farm`；文件结构/家族节/判定语义 → `dsh-plugin-dev`；发版投稿 → `dsh-plugin-release`。

## Maintenance

防腐化唯一闸：`.agents/prd/skill-anchor-map.yaml`——宿主每升 rc 重跑锚点 grep，未命中→对应卡加「⚠ 待重新核实 <date>」。源文档（improve-dsh-plugins/*）冻结不改；修订只走本出口。与旧文档/记忆冲突时：version-delta-ledger + family-tab-contract v1.0 优先。
