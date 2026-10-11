> 溯源｜enum-peer-migration INDEX（含 §G 修正） 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# 枚举 peer（supportedHosts）迁移 —— 总览与索引（第一批七插件）

> 制定日期：2026-10-04｜上游指导：[09-枚举peer适配指导-第一批七插件.md](../09-枚举peer适配指导-第一批七插件.md)（下称"09 指导"）
> 本目录是 09 指导的**逐插件执行方案层**：每插件一个文件夹、四件套格式（`spec.md` 方案 · `checklist.md` 矩阵验证 · `tasks.md` 任务分解 · `findings.md` 核实发现），本文管全批共享基线。所有事实经 2026-10-04 七仓核实，对指导文件的修正见 §G（指导原文不回改）。

---

## §A 版本矩阵基线（唯一数字源）

全批共享的宿主 rc 清单（与 MichengAI 一致，宿主侧就这些 rc）：

```js
// scripts/hosts.mjs —— 每仓库单一事实来源
export const supportedHosts = Object.freeze([
  "0.1.5-rc.1", "0.1.5-rc.2", "0.1.5-rc.3",
  "0.1.7-rc.1", "0.1.7-rc.2",
  "0.2.0-rc.1", "0.2.0-rc.2",
]);
export const peerRange = supportedHosts.join(" || ");
export const developmentHost = "0.2.0-rc.2";   // devDependencies 全部钉这里
```

- 下限按插件**实际验证过**的线裁剪（裁剪结果与逐条理由写在各插件包 spec.md §3.1，本文不重复各插件数字）；
- 升级流程固定：`supportedHosts` 加版本 → `node scripts/sync-hosts.mjs --write` → 矩阵绿 → 发版；README / README.zh-CN 兼容句由脚本同步，**禁止手改**；
- 兼容性安装中 `cordis-plugin-group/hmr/include/loader/timer` 必须钉宿主自己的 Cordis 线（09 指导 §1.5；参照 `reffer-dsh-plugins/dsh-skills-manager/scripts/compat-dependencies.mjs`）。

> **§A 增补（2026-10-04，dsh-arrowkey-nav 执行期实测）**：宿主侧的 rc 存在于**六条线**而非本批基线的三线——npm 实测 `@deepseek-ai/dsh` 已发布版本：0.1.0 线 rc.2/3/6/7/8、0.1.1 线 rc.1/2、0.1.2 线 rc.1（另有 0.1.3-alpha.2 与 0.1.6-alpha.1/2 两个未成线的 alpha）。上表 7 rc 是"批量下限裁剪后"的三线口径，不是宿主全集。另：`dsh-api-{session,workspace}-controller` 两包 **0.1.2-rc.1 起才存在**——凡下限早于 0.1.2 的插件，这两个 peer 无法覆盖老线（engines 单闸口 + 老线运行时机会式读取兜底，见 arrowkey-nav findings §3.2）；`dsh-client-ui-workspace` 则全线存在。分包 peer 枚举（各 peer 枚举自身存在版本）曾是 arrowkey-nav 落地形态（`mine-dsh-plugins/dsh-arrowkey-nav` 分支 `improve/enum-peer-six-lines`）。
>
> **§A 再增补（2026-10-04，dsh-tidy-display 执行期机制核实，修正上一条的"分包枚举"建议）**：宿主 peer 闸（app-boot `plugin-compatibility.ts`）把**每个** dsh-* peer 的范围匹配**宿主运行时版本**（semver.satisfies + includePrerelease），不按包存在性跳过——**分包窄枚举会让老线宿主在闸门处整体拒载**。凡要覆盖 0.1.0/0.1.1 的插件，全部 dsh-* peer 必须携带全量 15rc 枚举（peer 字段语义=宿主白名单）；子包在老线不存在无碍（profile `autoInstallPeers:false`，peer 不进注册表）。dsh-tidy-display 以此形状矩阵 15/15 全绿实证（含 0.1.0-rc.2）。全局决定 §G-2 的"未验证 rc 不进 supportedHosts"不变。

## §B semver 预发布三结论（semver 包实测）

| 声明 | 对 0.1.7-rc.2 | 结论 |
|---|---|---|
| `^0.1.5-rc.1 \|\| ^0.2.0-rc.2` | **不匹配** | caret+rc 只放行同三元组 rc → 整条 0.1.7 线被静默排除（paste-dock v0.1.3 实例，必改） |
| `>=0.1.7-rc.1 <0.1.8-0` | 匹配 | `-0` 上界写法健全，不泄漏 `0.1.8-rc.1` |
| `0.1.7-rc.2 \|\| 0.2.0-rc.2` | 匹配 | 精确枚举精确匹配，无暗坑 |

规则根源：预发布版本只能被带相同 `[major,minor,patch]` 三元组的预发布比较器匹配。**任何跨线的 `^x.y.z-rc.n` OR 都是假声明**——枚举法的直接动机之一就是让这类错误从"隐式事故"变成"显式决定"。

## §C 双闸门口径与 sync-hosts

- `engines.dsh` = **加载器预检闸门**（不满足被启动预检静默禁用）；`peerDependencies` = **包管理器闸门**（host profile 安装时由 npm/pnpm 校验，`--config.auto-install-peers=true`）。两闸门口径不一致就是事故源（mcp-registry 0.2.0 拒装、0.2.1 挂载报错，见其 README 版本表）。
- 本批决定（§G-1）：**engines.dsh 保留/补建，与 peer 同源枚举**，由增强版 sync-hosts 一并下发，禁止手改。注意参考实现（dsh-skills-manager v1.1.8）本身不同步 engines（其 engines 只有 node）——本批从 09 指导 §1.3 从严，补齐这一缺口（§D.2）。
- mcp-registry 现状 engines 在 package.json **双写两处**（`dsh.engines` :22 与顶层 `engines` :68），收敛时两处都要覆盖。
- **engines/manifest 写点全景（2026-10-04 核实，§G-6）**：写点载体因仓而异，最多三种——package.json `engines`、package.json `dsh.engines`、`dsh.plugin.json`/`dsh-plugin.json` 的 `engines`（date-wrapper/preset-manager/input-traffic/arrowkey-nav 有 dsh.plugin.json 写点；mcp-registry 为连字符 `dsh-plugin.json`；paste-dock/tidy-display 无插件 manifest）。**preset-manager 两处 engines 互相矛盾**（package.json `>=0.1.1-rc.1` vs dsh.plugin.json `>=0.1.7-rc.1 <0.1.8-0`）；date-wrapper/preset-manager/mcp-registry 的 manifest version 与 package.json version 漂移（0.2.0-beta.2 vs 0.2.0、0.3.0 vs 0.4.0、0.2.3 vs 0.2.9）。因此 sync-hosts 增强（§D.2）必须**覆盖全部写点收敛 + manifest version 同步**，否则双闸门口径一致只是纸面的；各仓写点明细见各插件包 findings.md §1.1/§1.2。
- 宿主版本识别三级优先序（能力探测 → 读宿主版本号 → **禁止**用插件自己 node_modules 里的 `@deepseek-ai/*` 判断）：见 09 指导 §1.6；版本差异代码只许出现在窄腰文件。

## §D 共享工具五件套（落库 `mine-dsh-plugins/_tools/host-compat/`；本次只登记规格，不实现）

| # | 产物 | 原型 | 需真开发的部分 |
|---|---|---|---|
| D.1 | `hosts.mjs` 模板 | `reffer-dsh-plugins/dsh-skills-manager/scripts/hosts.mjs`（19 行；含 `requiredHostPeers`+`assertHostPeers` 契约断言，模板化时改可选导出） | 无 |
| D.2 | `sync-hosts.mjs` 增强版 | 同目录 `sync-hosts.mjs`（52 行；默认校验/`--write` 双模式 + 双语 README 正则替换 :33-51） | **补 engines.dsh 同步**（现版不同步）；**覆盖全部写点载体**（package.json `engines`/`dsh.engines` + `dsh.plugin.json`/`dsh-plugin.json`，见 §C 写点全景）并同步 manifest version |
| D.3 | `host-version.js` 双锚点版 | `mine-dsh-plugins/dsh-preset-manager/src/host-version.js`（52 行）+ `pkg-resolve.js`（107 行，强耦合需一并搬） | 补 `process.argv[1]` realpathSync 锚点 + `prefix/lib/node_modules` Unix 布局候选（参照 `reffer-dsh-plugins/dsh-agency-agents/src/settings-compat.ts:62-77`），约 20–30 行 |
| D.4 | `scan-slot-registrations.mjs`（共享槽位扫描器） | `mine-dsh-plugins/dsh-tidy-display/scripts/check-harness-compat.mjs:30-56`（rg 枚举 → 文本预过滤 → TS AST 提取 `.register({name,key,id})`） | 三参数化：槽位前缀正则 / 宿主源码根 / 基线路径 `compat/<host-version>.json`；**:31-34 的 `--path-separator=/` Windows rg 修复必须原样保留**（反斜杠路径会致扫描静默清空） |
| D.5 | CI workflow 模板 | `reffer-dsh-plugins/dsh-skills-manager/.github/workflows/compatibility.yml`（57 行：`versions` job 导出 hosts JSON → `windows-latest` × `matrix.host: fromJSON(...)`、`fail-fast:false`、`always()` 上传 `.compat-results/`） | 执行体 `test-host-compatibility.mjs`（585 行）须剥离业务断言，拆成"装宿主/启动/存证骨架 + 各插件 assertions 钩子"两层；浏览器验收参照 `dsh-agency-agents/.github/workflows/ci.yml:76`（playwright chromium） |

## §E 矩阵验证：通用断言与执行环境

每格矩阵通用四断言（09 指导 §5 尾）：**装载无挂载错误日志 → inject 清单逐项存在 → 插件功能冒烟（各插件包 checklist.md §4.2）→ README 兼容句与版本一致**。

**执行环境现实（2026-10-04 核实）**：七仓仅 paste-dock 有 CI（ubuntu 质量门，无宿主矩阵），其余六家零 CI。因此近期主线为**本地隔离矩阵**：复用 `mine-dsh-plugins/_wt-015|_wt-017|_wt-020` 工作树 + 离线 tgz（如 `deepseek-ai-dsh-0.1.7-rc.2.tgz`）逐版本装宿主、跑断言，结果存 `.compat-results/`；CI 化（§D.5）后置。**矩阵未跑绿前，supportedHosts 只收已本地验证的 rc。**

## §F 批次状态表（单一事实源：改状态只改这里）

| 批次 | 插件 | 性质 | 状态 | 阻塞于 | 文档 |
|---|---|---|---|---|---|
| P0 | dsh-date-wrapper | 流程试点（模板定型反哺 §D） | **已发版（2026-10-04，v0.4.0）**：15 rc 全枚举[用户扩围]三写点下发 + 单测 22/22 + 本地矩阵 15/15 绿（钉 Cordis 线 + 宿主 CLI 自建 profile 配方，findings §3-8）+ 嵌入点逐 rc 回溯无冲突（§3-10/11/12）；rebase 进 main（含 i18n 五语）后发布，dist-tag latest/dsh-0.1.5/dsh-0.1.7/dsh-0.2.0 均指 0.4.0，publishConfig.tag=latest；分支重整：原 main → `compat/0.2.0`，改进线 → `main`；`_tools/host-compat/` 已定型（sync-hosts 扩 9 语）。余：快照级人工核验一次 | 无 | [→](dsh-date-wrapper/spec.md) |
| P1 | dsh-preset-manager | volatile 探测补齐 + 基础设施前置 | 未开始（文档就绪） | git init（非 git 仓，§G-5） | [→](dsh-preset-manager/spec.md) |
| P1 | dsh-paste-dock | 0.1.7 漏线修复 + 声明收敛 | **已发版：v0.1.4 在 npm（dist-tag `next`，2026-10-04 手工带 --registry 发布，shasum=faaf29d8 即受测产物）；main=b041a67，旧 main=`compat/0.2.0`；`latest` 转正待观察期后人工 2FA；Trusted publishing 仍未配置（下版前配）** | `npm dist-tag add dsh-paste-dock@0.1.4 latest`（用户 2FA） | [→](dsh-paste-dock/spec.md) |
| P1 | dsh-mcp-registry | 双闸门口径统一 | 未开始（文档就绪） | 无 | [→](dsh-mcp-registry/spec.md) |
| P2 | dsh-input-traffic | 槽位矩阵化（遮蔽失效是静默的） | **矩阵全绿（2026-10-04/05，分支 improve/enum-peer-15rc @ 98db846+）**：15 rc 全枚举[用户扩围，六 peer 包 registry 实读全线存在、无分包拆枚举] + peer 转必需双闸口 + 窄腰（**双 scoped-inject**：`configForms`/`settingsScope` 按代互斥实锤——0.1.7-rc.1 的 client-ui-settings 已无 settingsScope 字样；插件级 inject 收敛为四线通用服务）+ setDraft `.actions` 第三分叉归一 + dsh-family.tab 条件注册（持有者是跨插件族非宿主，裸沙箱缺席属预期）；**槽位扫描器纯 Node 遍历根治 rg 三坑**（.gitignore 吞 node_modules / `-L` 对 junction 不保证下行 / **宿主 client 包只在 `.pnpm` 虚拟 store 不在顶层**——插件仓 smoke 全绿沙箱全灭的迷惑差异，findings §3-1）；无头矩阵 **15/15 GREEN**（全 A 形，0.1.0-rc.6 首拍 spawn 瞬态、单格重跑绿），三宿主槽自 0.1.0-rc.2 起逐格在位（存在性下限早于作者注释的 0.1.5）；verify 全链绿（vitest 59 + assembly 12/12）；compat/0.2.0 核实零运行时增量。余：T4 dist-tag + 分支收敛（发版时）、浏览器验收与 CI（后置） | 发版窗口 | [→](dsh-input-traffic/spec.md) |
| P3 | dsh-arrowkey-nav | 分支收敛后枚举化（修复已落地） | 未开始（文档就绪） | 无（起点分支见其 tasks.md） | [→](dsh-arrowkey-nav/spec.md) |
| P4 | dsh-tidy-display | 哈希门禁 → 逐版本指纹；**peer 枚举延期** | **矩阵全绿（2026-10-04，分支 improve/enum-peer-15rc）**：用户指令覆盖延期方案，12 peer 全量 15rc 枚举 + engines.dsh 同源 + 七语 README 管理块下发；本地矩阵 **15/15 全绿**（0.1.0-rc.2 起，老线 C 形裸启动）；key 机制发现：peer 闸按宿主运行时版本逐 peer 匹配 → 分包范围（arrowkey 形状）会拒载老线，全量枚举才覆盖 0.1.0（findings §3.1）；基建三坑（corepack pnpm 垫片/pnpm pack/探针时序）findings §3.3。余：发版合并、浏览器面、扫描器共享化（T4 指纹待 CI 化） | 发版（用户 2FA/观察期） | [→](dsh-tidy-display/spec.md) |

状态取值：`未开始 / 进行中 / 矩阵全绿 / 已发版 / 延期`。

## §G 对 09 指导的事实修正与全局决定

**五处事实修正**（以 2026-10-04 仓库实测为准，证据行号在各插件包 findings.md §1.1）：

1. **arrowkey-nav 版本前移**：0.3.3/0.4.0 → 实为 compat/0.1.7 = v0.3.4、main = v0.4.1（工作树检出 compat/0.1.5 = v0.3.2）；
2. **arrowkey-nav P3 前提反转**：`uiWorkspace.openSession` + `retainedBy.mainView` 修复**已在 main 与 compat/0.1.7 落地** → 待做的是"收敛 compat/* 五条分支进 main 单分支 + 枚举化"，不是"落地修复"；
3. **arrowkey-nav client inject 风格**：实为**包名风格**（09 指导 §2 表称其用服务名风格，该说法仅对 paste-dock 成立）；已提交三线一致为 **3 项**，第 4 项 `dsh-client-locale` 仅为未提交工作树的 i18n 半成品（收敛时需对该半成品显式决策，见其 findings.md §1.1-3a）；
4. **tidy-display peers 计数**：实为 **14 项**（12 项 dsh-* 锁 `>=0.1.7-rc.1 <0.1.8`；`cordis ~4.0.4`、`react ^18.2.0` 不在该范围），09 指导写 13；
5. **mcp-registry engines 双写 + README 漂移**：engines 在 package.json 写了两处（:22/:68），README 版本表（"latest = 0.2.2"）落后于 package.json（0.2.9）——正是 sync-hosts 要消灭的手工漂移现行实证；
6. **engines/manifest 写点比指导文件记载的更碎**（七仓执行时逐一确认）：dsh.plugin.json/dsh-plugin.json 是第三类写点载体，preset-manager 两处 engines 互相矛盾，date-wrapper/preset-manager/mcp-registry 的 manifest version 与 package.json 漂移——详见 §C 写点全景与各插件文档差异表（文档撰写阶段新发现）。

**全局决定**：

1. 双闸口：engines.dsh 保留/补建、与 peer 同源枚举、由增强版 sync-hosts 下发（§C / §D.2）；
2. 验证主线：本地隔离矩阵先行、CI 后置；未验证 rc 不进 supportedHosts（§E）；
3. 共享产物五件套统一落 `_tools/host-compat/` 子目录，不散落 `_tools/` 根（§D）；
4. volatile 探测就地取材：agency-agents `liveSchemaField` 与 tidy-display `src/config.ts:23-25` 双参考；
5. preset-manager 非 git 仓库：先 git init（或显式声明无 git 流程变体）再走 sync-hosts / 基准戳流程；
6. arrowkey-nav 动作重心 = 分支收敛（5 条 compat + 2 条 archive），起点分支必须显式指明（当前工作树脏、检出 compat/0.1.5）；
7. 09 指导文件本身不回改，一切修正以本节为准。

## §H 证据索引与既有文档关系

- **参考实现**：`reffer-dsh-plugins/dsh-skills-manager/`（hosts.mjs / sync-hosts.mjs / compat-dependencies.mjs / compat-paths.mjs / test-host-compatibility.mjs / .github/workflows/compatibility.yml）；`reffer-dsh-plugins/dsh-agency-agents/src/settings-compat.ts`（hostModuleAnchors :62-77、hostRequireFor :79-93、loadHostModule :95-98）
- **host-matrix-rollout.md**（`mine-dsh-plugins/`）：其 §2 旧推广模板（dist-tag 多版本 + compat 分支）对七插件已被本范式取代；§3 推广状态表是登记处（是否回写横幅待定）
- **DSH-PLUGIN-VERSION-DISTRIBUTION-STRATEGY.md**（`improve-dsh-plugins/`）：旧分发模型（同名多版本 + compat 分支），对七插件被取代（是否回写横幅待定）
- **DSH-PLUGIN-COMPATIBILITY-GUIDE.md**（`improve-dsh-plugins/`）：运行时检测 + 双 API 回退，与枚举法互补，仅引用不回写
- **adaptation-reports/**（`mine-dsh-plugins/`）：2026-09-11 面向 v0.1.5-rc.2 的上一代分析，仅作历史证据，**禁止当现状引用**（其 SUMMARY 矩阵版本号均已过期）
- **dsh-arrowkey-nav-0.1.7-0.2.0-失效根因分析.md**（`mine-dsh-plugins/`）：P3 全部技术依据（断点提交 `6830e1460d`、修复方案、DOM 核对表），按节引用不复制
