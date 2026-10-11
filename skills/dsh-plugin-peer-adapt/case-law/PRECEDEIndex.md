> 溯源｜我方适配先例索引（32 仓主表 + 10 先例卡 + 盲区清单）。「已实证可装线」列以证据来源标注为准，未复核不引用。

# PRECEDEIndex —— 我方适配先例索引（草案 v0，skill-drafts/case-law）

> 编纂日期：2026-10-11｜产出性质：**草案（先例卡 + 主表 + 盲区清单）**，供 `跨版本适配` skill 的「先例检索」环节调用。
> 本文件只汇总既有计划与磁盘/registry 实态，**不新增裁决**；与计划原件冲突时以本文件的「证据标签」自行判断强弱。

## 0. 用法（两跳查询）

第一跳 **插件 × 宿主线 → 当前可装版本实态**：查 §1 主表行，读「已实证可装线」列与其证据标签。
第二跳 **该仓当年报备坑 → 先例卡**：若该行「适配史摘要」含独特教训，转 §2 对应卡（症状词开头，可直接 grep）。
横向盲区（不属于单仓、跨仓反复出现）→ §3 通用盲区清单；症状词与版本差异台账的交叉引用 → §4。

**证据标签（贯穿全文）**

| 标签 | 含义 | 强度 |
|---|---|---|
| `[推]` | 本地推导：读该仓磁盘 `package.json.peerDependencies` 的 `@deepseek-ai/dsh*` 范围，用 `semver.satisfies(v, r, {includePrerelease:true})` 对 15 个宿主 rc 逐一线算（2026-10-11，semver 取自 `dsh-perm-gate/node_modules`）。**口径固定为宿主 preflight（includePrerelease）**；npm/pnpm 装包期的默认预发布规则对跳线 range/caret 会给出**更小**集合，逐仓对照见 §3-X | 强（等价于宿主闸门算法，但仅证明「闸门放行」，不证明运行时可用，也不证明装包闸门放行） |
| `[R]` | `npm view <pkg> dist-tags / peerDependencies --registry=https://registry.npmjs.org` 实测（2026-10-11，已钉 registry 防 npmmirror 污染） | 强（registry 实态） |
| `[P]` | 计划字面：矩阵 15/15、验收记录等文档结论（附计划名与日期） | 中（可能落后于磁盘/registry） |
| `[F]` | `_host-farm/cells/<线>/.../node_modules` 目录快照在位（2026-10-11 只读采集） | **弱**：共享格存在外来 peer hoist / 同源复制陷阱，只作旁证，不作可装性定谳 |
| `[未]` | 未复核（磁盘 metadata 已读，但可装性/发布态未取得证据） | 无 |

**三条不得矛盾的前提（已定谳）**

1. 宿主兼容性闸门**只读** `package.json.peerDependencies` 里的 `@deepseek-ai/dsh*`（`plugin-compatibility.ts` 逐 peer `semver.satisfies` + `includePrerelease`；peers 为空则早退放行）→「老线/新线装不上」的**唯一开关是 peer range**；`engines.dsh`、`dsh.plugin.json` 不一致属**元数据卫生级**（另按 §C 口径影响加载器预检，非安装闸门）。
2. 判「devDeps 假绿」前**必须**先确认该包被 `src` 静态 import 作类型基线；门面经 `as unknown as` 强转的动态 `import()` 不吃 typecheck 信号 → 不构成假绿（search-index / session-steward 豁免先例）。
3. 干净格 / `npm pack` 产物才是取证源；farm 共享格与本地检出分支都可能是陈旧面。

**主表列口径**：`当前版本` = 磁盘工作树检出值（2026-10-11 只读）；`peer 覆盖线集合` = `[推]` 结果，`n/15` 为满足该仓**全部** dsh-* peer 的宿主 rc 数，箭头为覆盖区间起点。

## 1. 主表（每自有插件一行）

| 仓库 | 当前版本 | engines.dsh 实态 | peer 覆盖线集合 | publishConfig.tag | dsh.plugin.json 同步态 | 已实证可装线（来源标注） | 适配史摘要一行 | 指针 |
|---|---|---|---|---|---|---|---|---|
| dsh-perm-gate | 5.1.2-compat.10 | 15rc 全枚举（无 `dsh.engines` 镜像） | 15/15（5 peer 全枚举） | `compat` | **版本漂移**：manifest 5.1.2-compat.9（engines 两处一致） | 六线全可装 `[R]` dist-tags compat=5.1.2-compat.10 / latest=5.1.0 / dsh-0.1.2=0.1.5=0.1.7=0.2.0=5.1.0；`[R]` 5.1.2-compat.10 发布物 peer=15 全枚举；`[推]` 15/15；`[F]` 0.1.0-rc.8/0.1.1-rc.2/0.1.2-rc.1/0.1.5-rc.3/0.1.7-rc.2 五格在位 | M2 试点；0.1.5 无卡 → orphan 实例假设死刑；双代腰桥化配方母本 | `compat-0.2.0-dsh-perm-gate`、`perm-gate-compat-15rc`(顶层 plans)、`compat-0.1.7` |
| dsh-free-search | 0.9.24 | **缺 engines.dsh**（仅 node>=20）→ 闸门卫生缺口 | 15/15（5 peer 全枚举）+ `dsh.compatibility` 15 条 compatible | **无 tag**（仅 access:public） | 无 dsh.plugin.json | 六线闸门放行 `[推]`；三代 waist 全程实操 + 五格复测 `[P]` cross-version findings-A §4；registry 侧**发布名被他人占用**：`[R]` dsh-free-search latest=0.8.5（非我方版本系）、`@0.9.22` → 404；`[F]` 格内 0.9.22/0.9.20 系本地 pack 非 npm | 唯一「三代 +1 腰」参照实现；npm 名 403 阻塞发版 | `cross-version-adaptation-all`(顶层 plans)、`compat-0.2.0-adaptation` |
| dsh-input-traffic | 0.7.3 | 15rc 全枚举 | 15/15（6 peer 全枚举） | `latest`（publishConfig 含 registry npmjs） | 同步（0.7.3 / 15 枚举两处一致） | 六线 `[P]` 本地无头矩阵 15/15 GREEN（2026-10-04/05，`improve/enum-peer-15rc @ 98db846+`，INDEX §F P2）；`[R]` latest 与 dsh-0.1.2/0.1.5/0.1.7/0.2.0 四线 tag 均 0.7.3；`[推]` 15/15；`[F]` 五格在位 0.7.3 | 双代腰（configForms / settingsScope 按代互斥）首例实锤 | `improve-dsh-plugins/enum-peer-migration/dsh-input-traffic`、`compat-0.2.0-dsh-input-traffic`、`input-traffic-017-020-drift-audit` |
| dsh-session-steward | 0.5.2 | 15rc 全枚举 | 15/15（5 peer 全枚举） | `latest` | 同步（0.5.2；曾 0.4.1 漂移已治） | 六线 `[推]`；`[R]` latest=0.5.2、dsh-0.2.0=0.5.1、dsh-0.1.7=0.4.8、dsh-0.1.5=0.3.3；`[P]` 0.5.2 已发 latest、B1「latest 挂 prerelease」异常随之消除（improve 13 发版计划，2026-10-08）；`[F]` 五格在位 0.5.2 | 直读 `session.jsonl`＝会话 V4 最高风险仓；档位语义曾致 30 条假异常 | `compat-0.2.0-dsh-session-steward`、`steward-source-kind-capability`、`improve-dsh-plugins/11-台账` |
| dsh-session-guard | 4.1.15 | 15rc 全枚举 | 15/15（4 peer 全枚举） | `latest` | **双漂移**：manifest 4.1.14 且 manifest engines `>=0.2.0-rc.1 <0.2.1-0`（远比 package.json 窄） | 六线 `[推]`；`[R]` latest=4.1.15、dsh-0.2.0=4.0.2、dsh-0.1.7=3.2.5、dsh-0.1.5=3.0.2；`[F]` 五格 4.1.15、0.2.0-rc.2 格 4.1.5 | 3.x/4.x 分线双版本策略；接管选举只救导航壳（A4） | `compat-0.2.0-dsh-session-guard`、`session-guard-v4-source-kind` |
| dsh-bash-terminal-ts | 0.7.2-compat.2 | range `>=0.1.0-rc.8 <0.2.1-0`（**非枚举**，比 peer 窄 4 个 rc） | 15/15（8 peer 全枚举） | `compat` | 同步（0.7.2-compat.2 / engines 两处同值） | 六线闸门放行 `[推]`；`[R]` latest=compat=0.7.2-compat.2、dsh-0.2.0=0.7.1、dsh-0.1.7=0.6.4、dsh-0.1.5=0.5.2、dsh-0.1.2=0.4.2；`[F]` 六格（含 0.2.0-rc.2）均在位 0.7.2-compat.2 | **双 manifest 陷阱**先例（engines+version 第二写点被原任务面漏指） | `compat-0.2.0-dsh-bash-terminal-ts`、`compat-0.2.0-adaptation` §12 |
| dsh-date-wrapper | 0.4.0 | 15rc 全枚举 | 15/15（1 peer 全枚举） | `latest` | 同步（0.4.0 / 15 枚举） | 六线 `[P]` 本地矩阵 15/15 绿 + 已发版 2026-10-04（INDEX §F P0）；`[R]` latest=0.4.0 且 dsh-0.1.5/0.1.7/0.2.0 三线 tag 同指 0.4.0；`[推]` 15/15；`[F]` 五格在位 | 脏工作区 / publishConfig.tag 静默遗漏 / manifest 版本漂移三lesson 同仓 | `compat-0.2.0-dsh-date-wrapper`、`enum-peer-migration/dsh-date-wrapper` |
| dsh-patch-edit-plus | 0.2.7 | narrow `>=0.1.7-rc.1 <0.1.8-0` | 2/15（仅 0.1.7-rc.1/2） | `dsh-0.1.7` | **版本漂移**：manifest 0.2.5（engines 两处一致） | **磁盘检出≠发布物**：`[R]` latest=0.4.1、dsh-0.2.0=0.3.2、dsh-0.1.7=0.2.7、dsh-0.1.5=0.2.6、dsh-0.1.2=0.1.4；`[R]` **已发布的 0.4.0 peerDependencies = 7 项 dsh-* 15rc 全枚举**（六线闸门放行）；本地 0.2.7 窄线仅 `[推]` 2/15；`[F]` 六格装的都是 0.4.0 | devDeps 曾钉 0.1.2-rc.1 假绿 + `typecheck-0.1.5.mjs` 硬编码 + INSTALL×4 明确排除 0.2.0 | `compat-0.2.0-dsh-patch-edit-plus`、`compat-0.2.0-adaptation` §10 |
| dsh-search-index | 0.5.10 | narrow `>=0.1.7-rc.1 <0.1.8-0` | 2/15（仅 0.1.7 线） | `dsh-0.1.7` | **版本漂移**：manifest 0.5.9 | 0.1.7 线 `[推]`；`[R]` dsh-0.1.7 tag=0.5.10（恰为磁盘版本）、latest=0.6.4、dsh-0.2.0=0.6.4、dsh-0.1.5=0.4.3 → 0.2.0 线走另一条 0.6.x 发布系（其 peer 面 `[未]`）；`[F]` 未见于任何格 | 双 lockfile（pnpm 权威）+ `as` 强转豁免 devDeps 换代理由订正 | `compat-0.2.0-dsh-search-index`、`fix-search-index-jump` |
| dsh-prime-memory | 0.18.5 | narrow `>=0.1.7-rc.1 <0.1.8-0` | 2/15（9 peer，多段 `\|\|` 交集只剩 0.1.7） | `dsh-0.1.7` | **版本漂移**：manifest 0.17.0-dsh0.1.7.3 | 0.1.7 线 `[推]`；`[R]` **registry 已到 0.22.1**（latest=0.22.1，dsh-0.1.2/0.1.5/0.1.7/0.2.0 四线 tag 均 0.22.1）→ 磁盘 0.18.5 系陈旧分支检出，`[R]` dsh-prime-memory@0.18.5 在 registry 可解析；`[F]` 五格装 0.22.1 | 「register 优先」历史分支注释＝当年臆想分支（0.1.5 源码无该服务方法） | `compat-0.2.0-dsh-prime-memory`、`dsh-prime-memory`、`prime-memory-v4-source-kind` |
| dsh-prime-memory-flh-base | 0.16.1 | `>=0.1.5-rc.1 <0.2.0-0`（含 `<0.2.0-0` 陷阱） | 5/15（0.1.5-rc.1..0.1.7-rc.2，**整条 0.2.0 线被拒**） | `dsh-0.1.5` | **版本漂移**：manifest 0.15.0（engines 同值） | `[推]` 5/15；`[R]` 不可单独取证——与主仓**共用 npm 名** `dsh-prime-memory`（同名互踩）；`[未]` 未复核 | 同 npm 名双仓并存 = 发布/tag 归属歧义 | `compat-0.2.0-dsh-prime-memory`（4 检出排除注记）、`compat-0.1.7` §prime-memory 系 |
| dsh-thinking-levels | 3.5.0 | narrow `>=0.1.7-rc.1 <0.1.8-0` | 2/15 | `dsh-0.1.7` | **版本漂移**：manifest 3.4.5 | 0.1.7 线 `[推]`；`[R]` latest=4.2.0-beta.29、dsh-0.2.0=4.1.0、dsh-0.1.7=3.4.5、beta=3.4.5-beta.9、compat=1.0.0-beta.2；`[R]` 发布物 **4.2.0-beta.29 的 peer = 7 项 11rc 枚举**（0.1.0-rc.8↑，0.1.0-rc.2/3/6/7 不含）→ 已跨线；`[F]` 五格装 4.2.0-beta.28/29 | 家族节正座方；tag 地雷（忘带 `--tag dsh-0.2.0-beta` 会顶掉 0.2.0 稳定位） | `compat-0.2.0-dsh-thinking-levels`、`dsh-thinking-levels-effort-slider`、`improve-dsh-plugins/12-家族节契约` |
| dsh-tidy-display | 0.1.2-beta.8 | **缺 engines.dsh**（仅 node）→ 与 §G-1 双闸口决定相悖的现行缺口 | 15/15 **但形态是 12 项宽范围 `>=0.1.0-0 <0.3.0-0`（非枚举）** → npm 默认口径仅 5/15（§3-X）；发布物 0.3.1 `[R]` 才是 12 项 15rc 全枚举 | `dsh-0.1.7`（磁盘）| 无 dsh.plugin.json（paste-dock/tidy-display 同族无 manifest 写点） | 六线 `[P]` 本地矩阵 15/15 全绿（2026-10-04，INDEX §F P4，含 0.1.0-rc.2）；`[R]` latest=0.3.1=dsh-0.1.7=dsh-0.2.0，`[R]` 0.3.1 发布物 peer=12 项 15rc 全枚举；磁盘 0.1.2-beta.8 落后两代（`[R]` dsh-0.1.7-beta=0.1.2-beta.2）；`[F]` 六格装 0.3.0/0.2.4-beta.5 | 「分包窄枚举会拒载老线」的关键机制发现出自本仓 | `compat-0.2.0-dsh-tidy-display`、`enum-peer-migration/dsh-tidy-display`、`integrate-livetoken-into-tidy-display` |
| dsh-brief-sidebar | 0.7.0 | 15rc 全枚举 | 15/15（2 peer 全枚举） | `latest` | 同步（0.7.0 / 15 枚举） | 六线 `[推]`；`[R]` latest=0.7.0、dsh-0.1.5/0.1.7/0.2.0/beta=0.6.0；`[F]` 五格装 0.6.0 | 侧栏批量改造 + `release:015 --tag dsh-0.1.5` 陈旧脚本（G-D） | `compat-0.2.0-dsh-brief-sidebar`、`compat-0.2.0-adaptation` §11-14 |
| dsh-browser-cdp | 1.1.5 | `>=0.1.0-0 <0.3.0-0`，**package.json 内双写**（顶层 engines + `dsh.engines`）两处同值 | 15/15（6 peer 同一宽范围 `>=0.1.0-0 <0.3.0-0`；npm 默认口径仅 5/15，§3-X） | **`dsh-1.1.0`**（异于一线一 tag 体系） | **版本漂移**：`dsh-plugin.json`（连字符变体）version 1.1.3、该 manifest 无 engines | 六线闸门放行 `[推]`；`[R]` latest=0.18.19=dsh-0.2.0、dsh-0.1.7=0.17.23、dsh-0.1.5=0.16.24、beta-0.2.0=0.18.21、beta-0.1.7=0.17.25、**dsh-1.1.0=1.1.5** → 本地 1.x 与 npm 0.18.x **两套版本系并存**；`[F]` 六格均装 1.1.5 | 三线分治流派（0.16.x/0.17.x/0.18.x 各配 range 栅栏） | `compat-0.2.0-dsh-browser-cdp`、`dsh-browser-cdp`、`lightpanda-backend-dsh-browser-cdp`、`m4-card-bridge-guard-mcp` |
| dsh-mcp-registry | 0.3.4 | `>=0.1.7-rc.1 <0.1.8-0 \|\| >=0.2.0-rc.1 <0.3.0-0`，双写两处同值 | 4/15（0.1.7×2 + 0.2.0×2） | `dsh-0.2.0` | manifest **存在**，但文件名是连字符变体 `dsh-plugin.json`（用字面 glob `dsh.plugin.json` 检索会漏检本仓，见 §3-M）：version 0.3.4 **与 package.json 同步**（INDEX §G-6 记载的「0.2.3 vs 0.2.9」漂移现已消解，2026-10-11 只读核实）；该 manifest **无 engines 字段** → 本仓 engines 写点仅 package.json 两处 | 0.1.7+0.2.0 四 rc `[推]`，且 `[R]` **发布物 0.3.3 的 peerDependencies 已实读**（dsh-tools 同宽 range + 2 项 client 四 rc 枚举）→ 与磁盘口径一致，本仓是少数 `[推]`↔`[R]` 互证成立者；`[R]` latest=0.2.14、dsh-0.1.7=0.3.3=dsh-0.2.0、dsh-0.1.5=0.1.5、dsh-0.1.2=0.1.2、dsh-0.1.1=0.1.1；`[R]` **`@0.3.4` 404**（磁盘版本从未发布，2026-10-11 钉 registry 复测仍 404）；而 `[F]` 0.3.4 却躺在 0.1.0-rc.8 / 0.1.1-rc.2 / 0.1.2-rc.1 / 0.1.5-rc.3 / 0.1.7-rc.2 五格 profile `node_modules` 顶层（其中四格按 peer 本应拒装），0.1.5 格 `.pnpm` 内另存 `_artifacts/dsh-mcp-registry-{0.2.10,0.2.11,0.3.0,0.3.1}.tgz` 的 `file:` 安装痕迹 → **本地 pack 装入共享格 = farm 假满足现行实锤**（§3-H） | §G-5 双写 engines + README 版本表手工漂移的现行实证；同时是「manifest 双拼写漏检」与「格内在位≠闸门放行」两坑的取证样本 | `cdp-registry-manager`、`mcp-registry-manager`；`compat-0.2.0-adaptation` 未列本仓（**计划面缺口**：双闸门口径统一仅在 INDEX §F P1 立过项） |
| dsh-live-token-stats | 0.5.0 | narrow `>=0.1.7-rc.1 <0.1.8-0` | 2/15 | `dsh-0.1.7` | 同步（0.5.0 / narrow 两处一致） | 0.1.7 线 `[推]`；`[R]` **latest=0.4.7，无 dsh-0.1.7 tag** → 磁盘 0.5.0 与 tag 意图均未落 registry（权限阻塞，`[P]` compat-0.1.7 findings §20 / cross-version findings-B） | devDeps 全钉 0.1.5-rc.2（G1）+ `pnpm.overrides` dsh-llm 差集坑 | `compat-0.2.0-dsh-live-token-stats`、`compat-0.1.7` §20 |
| dsh-context-compression-improved | 0.7.0-beta.1 | narrow `>=0.1.7-rc.1 <0.1.8-0` | 2/15 | `dsh-0.1.7` | 未复核（root 无 dsh.plugin.json，manifest 疑在 `packages/selector`） | 0.1.7 线 `[推]`；`[R]` latest=0.9.3、dsh-0.2.0=0.9.0=dsh-0.1.5=dsh-0.1.7=dsh-0.1.2、beta=0.4.0-beta.1、dsh-0.2.0-beta=0.8.0-beta.7 → 磁盘 0.7.0-beta.1 落后两代；`[F]` 五格装 0.9.2/0.9.3 | pnpm workspace（~50 devDeps 钉 0.1.7-rc.2，混 0.1.5-rc.3 / 0.1.6-alpha.2）→ overrides 差集高危仓 | `compat-0.2.0-dsh-context-compression-improved`、`deps-align-dsh-context-compression-improved-0.1.7` |
| dsh-arrowkey-nav | 0.5.2 | 15rc 全枚举（**比 peer 宽 7 rc**） | 8/15（0.1.2-rc.1..0.2.0-rc.2；`dsh-api-{session,workspace}-controller` 0.1.2-rc.1 才存在） | `latest`（publishConfig 含 registry npmjs） | 同步（0.5.2 / 15 枚举） | `[推]` 8/15；`[R]` **七个 dist-tag（latest/0.1.0/0.1.1/0.1.2/0.1.5/0.1.7/0.2.0）全指 0.5.2** → 单版本挂全线 tag；`[F]` 0.1.2/0.1.5/0.1.7 三格装 0.5.2，0.1.0/0.1.1 格未见 | engines 比 peer 宽＝「装不上但预检说支持」的卫生级不一致样本；5 条 compat 分支待收敛 | `compat-0.1.7-0.2.0-dsh-arrowkey-nav`、`enum-peer-migration/dsh-arrowkey-nav` |
| dsh-canvas-tsx-sidebar | 0.3.2 | narrow `>=0.1.5-rc.1 <0.1.6-0` | 3/15（仅 0.1.5 线） | **无 tag**（scripts `release:015 --tag dsh-0.1.5`） | 同步（0.3.2 / engines 一致） | `[推]` 3/15；`[R]` latest=0.7.0、dsh-0.1.5/0.1.7/0.2.0/dsh-0.1.2=0.6.0 → **磁盘 0.3.2 从未在 registry 出现，落后一整代**；`[F]` 0.1.0-rc.8/0.1.1/0.1.5 格装 0.7.0、0.1.2/0.1.7 格装 0.6.0（其 peer 面 `[未]`） | better-sidebar 消费者 + 0.1.5 专线口径；peer 含非 `@deepseek-ai` 包（`dsh-better-sidebar >=0.18.1`）＝闸门不查 | `compat-0.1.7-0.2.0-dsh-canvas-tsx-sidebar`、`brief-canvas-sidebar-peer-15rc` |
| dsh-synapse | 0.5.0 | `>=0.1.5-rc.1 <0.2.0-0`（**`<0.2.0-0` 陷阱**） | 5/15（0.1.5-rc.1..0.1.7-rc.2；整条 0.2.0 线被拒） | `dsh-0.1.7` | **双漂移**：manifest 0.4.1 + manifest engines `>=0.1.2-alpha.1 <0.2.0-0` | `[推]` 5/15；`[R]` **latest=0.4.2**（磁盘 0.5.0 未发布）；`[未]` 未复核（无格内安装） | 计划要求 0.5.0→0.6.0，但 tag 写 dsh-0.1.7 而 peer 上限 `<0.2.0-0` → tag/peer 自相矛盾 | `compat-0.2.0-adaptation` §3（synapse 行）、cross-version findings-B（权限阻塞） |
| dsh-tidychat | 0.2.8（`@bananasoldier01/`） | **缺 engines.dsh** | 10/15（0.1.0-rc.7..0.1.7-rc.2；`^0.1.0-rc.7` 拒 0.2.0 线） | **无 tag** | 无 dsh.plugin.json | `[推]` 10/15；`[R]` latest=0.4.0 且存在 **非规范 tag `dsh-0.2`**（与 dsh-0.2.0 体系异名）；0.4.0 的 peer 面 `[未]`；`[未]` 未复核可装线 | README「register」口径与 prime-memory 同案（一代 API）；scoped 名权限阻塞 | `compat-0.1.7` §20（tidychat→0.3.2 冲突/权限阻塞）、`legacy-sink-batch` |
| dsh-preset-manager（npm 名 `dsh-preset-doctor`） | 0.6.0 | `>=0.1.1-rc.1`（**无上界**） | **无 dsh-* peer（仅 cordis）→ 闸门早退放行** | `latest`（publishConfig 含 registry npmjs） | 同步（0.6.0；两处 engines 现均为 `>=0.1.1-rc.1`，§G-6 记载的「互相矛盾」已消解） | `[推]` 不适用（peers 空 → preflight 不拒任何线）；`[R]` latest=0.6.0；`[F]` 六格在位（0.1.5 格另有 `dsh-preset-manager` 目录残留） | 非 git 仓（§G-5）；`dsh.compatibility` 15 条 compatible 但 peers 为空＝纯声明面 | `enum-peer-migration/dsh-preset-manager`、`dsh-preset-manager`、`dsh-preset-manager-v0.3` |
| dsh-paste-dock | 0.1.4 | 15rc 全枚举 | 15/15（2 peer 全枚举） | **无 publishConfig.tag** | 无 dsh.plugin.json（写点不存在） | 六线 `[推]`；`[P]` 已发 v0.1.4、dist-tag `next`（2026-10-04 手工带 --registry 发布，shasum=faaf29d8 即受测产物，INDEX §F P1）；`[R]` latest=next=0.1.4；`[F]` 六格在位 0.1.4 | §B 表第一行的反面教材：v0.1.3 曾用 `^0.1.5-rc.1 \|\| ^0.2.0-rc.2` 整条 0.1.7 线被静默排除 | `enum-peer-migration/dsh-paste-dock`、`dsh-paste-dock-integration` |
| dsh-memory-palace | 1.6.0 | **缺 engines.dsh** | 6/15（0.1.2-rc.1..0.1.7-rc.2；`^0.1.2-alpha.2` 拒 0.2.0 线） | 无 tag（publishConfig 仅 registry） | 无 dsh.plugin.json | `[推]` 6/15；`[R]` latest=1.8.0、alpha=1.8.1-alpha.3 → 磁盘 1.6.0 落后两代；`[未]` 未复核 | 外部风格仓（repo 属主 lovezi0），未进 compat 计划 | `legacy-sink-batch` 未列；无专属 compat 计划 |
| dsh-seatbelt-sandbox | 0.1.0 | `>=0.1.0-rc.6 <0.2.0-0`（`<0.2.0-0` 陷阱） | 11/15（0.1.0-rc.6..0.1.7-rc.2） | 无 tag | **engines 不一致**：manifest `>=0.1.0-rc.6`（**无上界**） vs package.json 有上界 | `[推]` 11/15；`[R]` **404 从未发布**；`[未]` 未复核 | macOS 专属；manifest 无上界 + package 有上界 = 两闸口口径分叉样本 | 无 compat 计划（`compat-0.2.0-adaptation` 未列） |
| dsh-session-search（`@dsh-external/`，private） | 0.1.0 | `>=0.0.1`（非 rc 语义） | 11/15（0.1.0-rc.6..0.1.7-rc.2，`^0.1.0-rc.6` 拒 0.2.0 线） | 无（`private: true` 不可发布） | 无 dsh.plugin.json | 不适用（private）；`[未]` 未复核 | `engines.dsh: ">=0.0.1"` 属无信息声明 | 无 compat 计划 |
| dsh-auto-paste | 0.2.1 | 缺 engines.dsh | 6/15（**含 0.2.0-rc.2 却不含 0.2.0-rc.1**：两个 dsh peer 均写 `^0.1.5-rc.1 \|\| ^0.2.0-rc.2`，起点就是 rc.2）；npm 默认口径仅 4/15（§3-X） | 无 tag | 无 dsh.plugin.json | `[推]` 6/15；`[R]` latest=0.2.2、next=0.2.3 → 磁盘 0.2.1 落后；`[未]` 未复核 | 未进任何 compat 计划；caret 跳线假声明（INDEX §B 第一行形态）+ devDeps 全钉 0.1.5-rc.2（G1）双形态现行样本；非对称源于 rc.2 起点而非笔误 | 无 compat 计划 |
| dsh-paste-to-path | 0.0.7 | 缺 engines.dsh | 7/15（0.1.5-rc.1..0.2.0-rc.2） | 无 tag | 无 dsh.plugin.json | `[推]` 7/15；`[R]` latest=0.0.7（磁盘=发布态）；`[未]` 未复核 | 11 个 dsh-* peer 但下限起 0.1.5，老线全拒 | 无 compat 计划 |
| dsh-media-lens | 0.1.0 | `0.2.0-rc.1 \|\| 0.2.0-rc.2` | 2/15（仅 0.2.0 线） | `dsh-0.2.0` | 无 dsh.plugin.json | `[推]` 2/15；`[R]` **404 未发布**；`[未]` 未复核 | 新仓，0.2.0-only 精确枚举（§B 第三行安全形态） | 无 compat 计划 |
| dsh-video-read | 0.1.0 | `0.2.0-rc.1 \|\| 0.2.0-rc.2` | 2/15 | 无 tag | 无 dsh.plugin.json | `[推]` 2/15；`[R]` **404 未发布**；`[未]` 未复核 | 同上（0.2.0-only） | 无 compat 计划 |
| dsh-transition-webui | 1.1.0 | 缺 engines.dsh | **无 dsh-* peer → 闸门早退** | `dsh-0.1.7` | 无 dsh.plugin.json | `[推]` 不适用；`[R]` latest=1.1.0、dsh-0.1.7=1.1.0（已发布且 tag 落位） | 纯前端脚手架型插件：无 dsh peer → 兼容性闸门永不参与，任何「已实证可装线」都不能由 metadata 推出 | 无 compat 计划（`compat-0.2.0-adaptation` 未列） |

**主表行数：32**。枚举口径（2026-10-11 复核）：`mine-dsh-plugins/` 下共 **34** 个 `dsh-*` 目录，其中 `dsh-host`（宿主源码工作区）与 `dsh-docs-deliverables`（文档取证仓）**均无 package.json**，不属自有插件 → 余 32 仓与主表 1:1 全覆盖；未含 `awesome-dsh-plugin` 模板与 `_wt-*` / `_tmp*` / `_host-farm` 工作树。

主表口径补充：
- `dsh.plugin.json` 同步态判据 = manifest `version` 与 `engines.dsh` 是否等于 package.json 对应字段；三类写点（package.json `engines` / package.json `dsh.engines` / manifest `engines`）见 INDEX §C 写点全景。
- **口径提醒**：主表 `peer 覆盖线集合` 统一为**宿主 preflight（includePrerelease）**口径。凡 peer 为跳线 range/caret 形态者（browser-cdp、tidy-display 磁盘态、seatbelt-sandbox、session-search、tidychat、paste-to-path、memory-palace、auto-paste、prime-memory、prime-memory-flh-base、synapse）在 npm 默认装包口径下集合更小（个别仓为 **0**），逐仓对照见 §3-X——引用时可装线必须同时声明口径。
- 「六线」指 0.1.0 / 0.1.1 / 0.1.2 / 0.1.5 / 0.1.7 / 0.2.0 六条宿主线的 15 个 rc（宿主 peer 闸门逐 rc 判定，不按线打包）。
- `[F]` 列中 0.2.0-rc.2 格与其余五格不同系（版本更低），疑为独立构型；凡 `[F]` 单独支撑的结论一律降级为「待干净格复测」。

## 2. 先例卡（10 张，症状词开头）

### C-01 perm-gate — 「设置面板无卡 / 老线卡不亮 / orphan 实例」
症状词：`无卡`、`settings namespace not registered`、`identitySame`、`stale-build`。
- 当年被当作 M2 试点：0.1.5 设置面板整卡缺席，怀疑「宿主存在第二个 orphan settings 实例」。
- **orphan 实例假设已死刑**：`debug-generation` 镜像含 `dsh-perm-gate` ns 且 `identitySame=TRUE`；真根因＝**stale-build 部署事故**（源码修了，部署产物没 rebuild）。七步 served 验证（T10b，H1/H2/H3 全部证伪）。`[P]` perm-gate-compat-15rc HANDOFF-0.1.5-card + cross-version findings §2b-rev。
- 双代腰：`settingsScope`（≤0.1.5）与 `configForms`（0.1.7+）按代互斥；≤0.1.5 上子注入永不 resolve，但**卡派发只依赖 ns ∈ describe 镜像 ∩ settings.plugin.item 卡 key** → 老线「有卡无回调」是可达状态。
- 元数据卫生：`dependencies` 曾硬钉 `dsh-settings@0.1.1-rc.2`；`[P]` T35 裁决「硬钉在六线口径下无效，peer-only 更安全」。
- 当前实态：`[R]` 磁盘 5.1.2-compat.10 已以 `compat` tag 落 registry；`dsh.plugin.json` 仍写 5.1.2-compat.9（**版本漂移未愈**）。
- 子弹坑：`cd` 进 `.pnpm` 超长路径会毒化 shell（spawn ENOENT 不可恢复）→ 查 cell 源码只用 Read 直读。
- 知识孤岛：本 HANDOFF 位于**顶层** `.agents/plans/perm-gate-compat-15rc`，兄弟计划零引用（见 §3-K）。

### C-02 dsh-free-search — 「三代全程实操 / 五格复测 / npm 名被占」
症状词：`三代 waist`、`webServer 桥`、`403`、`shell.overlay 浮窗`。
- 唯一走完 0.1.0 / 0.1.5 / 0.1.7 / 0.2.0 代际全程的实操样本，窄腰落在 `lib/index.js:3655-3700`（三代 +1 腰）；webServer 数据桥（describe / mutate / debug-generation，loopback + POST-only + `expectedRevision` 乐观并发）以此为参照实现。`[P]` cross-version findings-A §4。
- 闸门面：`[推]` 磁盘 peer = 5 项 dsh-* 15rc 全枚举 → 六线放行；`engines.dsh` **缺失**（仅 node）＝按 §G-1 双闸口决定应补建；`dsh.compatibility.dshReleases` 15 条 compatible（**不读，非闸门**）。
- 发布面：`[R]` registry `dsh-free-search` latest=0.8.5（非我方版本系）；`@0.9.22`/`@0.9.23`/`@0.9.24` 均 404 → 发布名被占（计划字面记 403）；`[F]` 格内 0.9.22/0.9.20 是本地 pack 安装，**不能当作 npm 可装证据**。
- 教训：`publishConfig.tag` 缺位（只有 access:public）→ 发版时 tag 全靠命令行手工，静默遗漏概率=1。

### C-03 dsh-input-traffic — 「双代腰 / 0.1.7 卡不出现 / 裸沙箱家族 tab 缺席」
症状词：`configForms`、`settingsScope`、`按代互斥`、`dsh-family.tab`。
- 实锤：0.1.7-rc.1 的 client-ui-settings 源码已无 `settingsScope` 字样 → 两代句柄**不可共存**，必须窄腰分派；这是「双代腰」词汇的来源仓。
- 矩阵：`[P]` 15/15 GREEN（2026-10-04/05，`improve/enum-peer-15rc @ 98db846+`）；插件级 inject 收敛为四线通用服务，`dsh-family.tab` 条件注册（持有者是跨插件家族而非宿主 → 裸沙箱缺席属预期）。
- 扫描器坑（同仓反哺全批）：`rg` 三坑——`.gitignore` 吞 node_modules / `-L` 对 junction 不保证下行 / **宿主 client 包只存在于 `.pnpm` 虚拟 store 不在顶层** → 「插件仓 smoke 全绿、沙箱全灭」的迷惑差异即出于此；根治＝纯 Node 遍历。
- 当前实态：`[R]` latest=0.7.3 且 dsh-0.1.2/0.1.5/0.1.7/0.2.0 四线 tag 同指 0.7.3；`[推]` 15/15；发布纪律：publishConfig 已补 `registry: npmjs`（92a145a）。

### C-04 dsh-session-steward — 「体检 30 条全『注意』 / latest 挂 prerelease / 会话数据静默损坏」
症状词：`30 条`、`skipped`、`档位`、`source-kind`、`session.jsonl`。
- 直读 `session.jsonl`（src 字面命中 7 处：purge.ts:16、health/gates.ts:139、health/generation.ts:6,11,100、health/scan.ts:8,9）→ 会话 V4 风险最高仓；**不只读还写**（`migrateSessionSourceKind` 重序列化改名行）。`[P]` compat-0.2.0-dsh-session-steward findings（2026-09-29 两轮修订）。
- 三处硬耦合：① `source-kind.ts` 逐字照录宿主 `dsh-session-format-v3-to-v4@0.1.7-rc.2` 的第一方名单（改名表 + 24 项同名表）→ 0.2.0 名单若增减而表未同步＝**静默数据损坏**；② `decode.ts:145` 动态 `import()` + `as unknown as` 强转 → 编译期零信号；③ `purge.ts` 硬编码目录契约（`session.jsonl.zstd` / 旧格式双份、image_projcache、workspace.json 两处 id 名单）。
- **档位语义 30 条假异常**（判据缺陷，非版本缺陷）：把「无从判定」记成 `warn` → 30 条会话全标「注意」，真信号被淹没；修法＝新增中性档 `skipped`（面板文案「未检查」）且不参与总判聚合，实测 30 条变为「26 正常 / 3 注意 / 1 异常」。证据：`dsh-session-steward/CHANGELOG.md:285`、`lib/index.d.ts:785`（2026-10-11 只读）。
- 豁免先例（定谳事实 2）：src 对 `@deepseek-ai/dsh-session` **零静态 type-import** → devDeps 换代不产生 typecheck 信号，故「假绿」结论被订正为「换代真实收益在测试环境/运行时软加载」。
- 当前实态：`[R]` latest=0.5.2、dsh-0.2.0=0.5.1、dsh-0.1.7=0.4.8；B1「latest 曾指 prerelease」已消除。

### C-05 dsh-patch-edit-plus — 「全绿假绿 / typecheck:0.1.5 还在跑 / INSTALL 写着不支持 0.2.0」
症状词：`假绿`、`0.1.2-rc.1`、`typecheck-0.1.5.mjs`、`INSTALL ×4`。
- devDeps 曾钉死 `@deepseek-ai/dsh-*@0.1.2-rc.1` → typecheck/build/test 三绿而 0.1.7/0.2.0 运行时 API 已改名（`ShellExecutor.run` → `execute`，0.1.2→0.1.7）→ 原「纯元数据适配」判断**被推翻**，devDeps 换代即暴露。`[P]` compat-0.2.0-adaptation §10。
- 交叉脚本硬编码：`scripts/typecheck-0.1.5.mjs` 内 `VERSION = '0.1.5-rc.2'` 写死（G2 形态①），磁盘仍保留 `scripts.typecheck:0.1.5`。
- 文档面：INSTALL / INSTALL×4 语种明确「不支持 0.2.0」→ 与「本仓可适配 0.2.0」的计划结论正面冲突，属**必须同批改 README+README.en 双份**的口径债。
- 当前实态（关键反转）：`[R]` 发布物 0.4.0 的 peerDependencies 为 7 项 dsh-* **15rc 全枚举**（六线闸门放行），而**磁盘检出是 0.2.7 窄线分支**；npm 分线：latest 0.4.1 / dsh-0.2.0 0.3.2 / dsh-0.1.7 0.2.7 / dsh-0.1.5 0.2.6 / dsh-0.1.2 0.1.4。→ 任何「本仓只能装 0.1.7」的结论都必须先声明「以哪个版本为准」；`dsh.plugin.json` 还写着 0.2.5。

### C-06 dsh-date-wrapper — 「发版了但没提交 / tag 没表态 / manifest 版本对不上」
症状词：`脏工作区`、`publishConfig.tag`、`0.2.0-beta.2 vs 0.2.0`。
- 当年三lesson 同仓：① 脏工作区未裁决（提交态 0.2.0-beta.2 与 npm 已发 0.2.0 漂移，bump 未回提交）；② `publishConfig.tag` 静默遗漏（无表态 → 全靠命令行 `--tag`）；③ manifest version 与 package.json 漂移（INDEX §G-6/§C 记载的三例之一）。
- 现为**正面样本**：磁盘 0.4.0、engines 15rc 全枚举、manifest 0.4.0 且 engines 同步、`publishConfig.tag=latest`；`[P]` 本地矩阵 15/15 绿 + 2026-10-04 已发版，`[R]` latest 与 dsh-0.1.5/0.1.7/0.2.0 三线 tag 全指 0.4.0。
- 反哺产物：`_tools/host-compat/` 五件套在此定型（sync-hosts 扩 9 语）；写点收敛要求（三写点 + manifest version 同步）源自本仓取证。

### C-07 dsh-search-index — 「pnpm 权威还是 npm 权威 / devDeps 换代理由被订正」
症状词：`双 lockfile`、`pnpm-lock 钉 0.1.0-rc.8`、`as 强转`。
- G1-B 双 lockfile 现行样本：`pnpm-lock.yaml` 与 `package-lock.json` 同时被跟踪，权威 PM 判定＝**pnpm**（v9.0 / allowBuilds）；用错 PM 刷新则陈旧 lockfile 仍钉旧线却照样提交（静默回退）。
- 第二写点（G2 形态②）：`dsh.plugin.json` 自带 engines + version → 本仓 `manifest 0.5.9 vs package 0.5.10` 漂移在案。
- **devDeps 假绿的豁免**：门面经 `as` 强转、typecheck 不解析 → 判「假绿」前必须确认该包被 src 静态 import 作类型基线（定谳事实 2 的出处之一）。磁盘 devDep `dsh-client-ui-slots` 仍为 caret 旧线（`^0.1.0-rc.6` 形），属遗留卫生项。
- 当前实态：`[推]` 2/15（仅 0.1.7）；`[R]` dsh-0.1.7=0.5.10（磁盘版本恰为 0.1.7 线发布态）、latest=0.6.4、dsh-0.2.0=0.6.4；`[F]` 未见安装。

### C-08 dsh-bash-terminal-ts — 「改了 package.json 还是改了 dsh.plugin.json」
症状词：`双 manifest`、`第二处 engines`、`spec 只写 package.json`。
- 陷阱形态：`dsh.plugin.json` 里**另有一份** `engines.dsh` 与 `version`；若 spec/checklist 把动作限定为「package.json 的 engines.dsh（如存在）」，就漏掉第二写点 → 发布物双清单口径不一致（perm-gate 5.0.0 带病上线是该缺陷的实锤先例）。
- 现况已收敛：`[推]` peer 8 项 15rc 全枚举（六线放行）；manifest 与 package.json 的 version/engines 一致（0.7.2-compat.2）；**但 engines 用 range `>=0.1.0-rc.8 <0.2.1-0` 而非枚举**，比 peer 面窄 4 个 rc（0.1.0-rc.2/3/6/7 装得上却会被加载器预检禁用）。
- 发布纪律：`publishConfig.tag=compat`，`[R]` latest=compat=0.7.2-compat.2，四线 tag 各指旧版本（0.7.1/0.6.4/0.5.2/0.4.2）；devDeps 15 项 @0.2.0-rc.1、`node-pty@1.2.0-beta.15` 系 native 依赖，格内冒烟需单独留证。

### C-09 dsh-prime-memory — 「register 优先」是当年臆想分支
症状词：`ctx.settings.register`、`历史分支注释`、`0.1.5 源码无此服务方法`。
- 历史分支注释写「优先走 `ctx.settings.register`（0.1.5 可用）」——**该分支属臆想**：按定谳事实 1/2 复核，`settings.register` 是一代 API 且宿主 0.1.5 源码并无该服务方法；结论不得写成「register 在 ≤0.1.5 仍可用」。
- 判据纪律：`dsh.engines`/`dsh.plugin.json` 不是安装闸门；「哪条线能装」只由 peer range 决定；本仓 peer 交集为 2/15（多段 `||` 反而把 0.1.1/0.1.5 段算进 engines 的假象排除掉）。
- 发布面（重要更正）：`[R]` registry `dsh-prime-memory` latest=**0.22.1**，且 dsh-0.1.2/0.1.5/0.1.7/0.2.0 四个线 tag 同指 0.22.1 → 「本仓从未发布」的旧笔记不成立（本仓 npm 可解析；`compat-0.1.7` §20 记的 3 项权限阻塞另属他包）；磁盘 0.18.5 与 `_wt-port-015/_wt-port-017` 工作树均落后 registry 数代。
- 同名互踩：`dsh-prime-memory` 与 `dsh-prime-memory-flh-base` **共用 npm 名**（两仓 package.json `name` 相同，tag 分别写 dsh-0.1.7 / dsh-0.1.5）→ 发布顺序决定 dist-tag 归属，属结构性风险。

### C-10 dsh-tidychat — 「README 写 register / caret 拒新线 / 非规范 tag」
症状词：`register`、`^0.1.0-rc.7`、`dsh-0.2`。
- 与 C-09 同案：README 沿用一代 `register` 口径描述设置面 → 属死 API 口径债（`ctx.settings.register` 一代、`settings.plugin.item` 席位 Tier2）。
- 闸门面：唯一 peer `@deepseek-ai/dsh-settings: ^0.1.0-rc.7` ＝ `>=0.1.0-rc.7 <0.2.0-0`；`[推]` 10/15，**整条 0.2.0 线被拒**（semver 实测 `0.2.0-rc.1 ∉ ^0.1.0-rc.7`，见 §3-S），「caret 顺带覆盖」的直觉在此为反向。
- `engines.dsh` **缺失**、`publishConfig.tag` **缺失**、无 `dsh.plugin.json` → 三处写点全为空白（比不一致更糟的是无从校验）。
- 发布面：`[R]` scoped 名 `@bananasoldier01/dsh-tidychat` latest=0.4.0，且存在**非规范 dist-tag `dsh-0.2`**（一线一 tag 体系里应是 `dsh-0.2.0`）→ tag 体系外泄样本；磁盘 0.2.8 落后两代，0.4.0 的 peer 面 `[未]`。

## 3. 通用盲区清单（跨仓反复出现）

**G1 — devDependencies 钉旧线 → 「全绿假绿」**
症状词：`typecheck 绿`、`vitest 绿`、`运行时 TypeError`。devDeps 钉 `<0.2.0` 上界 → 装不到 0.2.0，验证保真度穿孔。**判前必检**：该包是否被 src **静态 import** 作类型基线；若门面为 `as unknown as` 强转 + 动态 `import()`，则换代拿不到编译期信号（**非假绿**），真实收益在测试环境/运行时软加载解析到目标线 → 豁免样本：search-index、session-steward、free-search（无 build）。现形仓：live-token-stats（devDeps 全 0.1.5-rc.2）、mcp-registry（devDep dsh-tools narrow 0.1.7 而 peer 含 0.2.0）、browser-cdp（devDeps tools/sandbox narrow 0.2.0-rc.1）、cci（0.1.5-rc.3 / 0.1.6-alpha.2 混钉）、auto-paste（dsh-session / dsh-tools / dsh-typert-protocol 三项 devDep 均钉 0.1.5-rc.2，2026-10-11 只读核实）。

**G1-B — 双 lockfile（`pnpm-lock.yaml` + `package-lock.json` 同被跟踪）**
症状词：`lockfile 陈旧`、`静默回退`。识别法：`git ls-files` 双份同时命中 → 先定权威 PM，另一侧显式删除或同步刷新；用错 PM 刷新则陈旧那份仍钉旧线却照样提交。已判：search-index（pnpm 权威）、session-steward / tidy-display（npm 权威）；cci / context-compression（`packageManager: pnpm@11.7.0` workspace）。

**G2 — 第二处版本声明（两形态）**
形态①交叉脚本硬编码旧版：`patch-edit-plus/scripts/typecheck-0.1.5.mjs` 的 `VERSION='0.1.5-rc.2'`。形态②`dsh.plugin.json` 自带 engines + version：search-index / bash-terminal-ts / session-steward / prime-memory / session-guard。反例（可关闭）：prime-memory `verify-catalog.mjs` 实证与宿主版本无关。**核对法**：把三处写点（package.json `engines`、package.json `dsh.engines`、manifest `engines`）+ manifest `version` 一次列全再比。

**G4 — manifest/README 深度漂移（「加一行」不够）**
症状词：`README 矩阵`、`README.en`。README 主机矩阵须 `README.md` + `README.en.md`（本批最多七/九语）同改；`dsh.compatibility.dshReleases` 的 15 条 compatible 是**声明面**，不被闸门读取，不能当作可装证据。现行样本：mcp-registry（README 版本表落后 package.json）、thinking-levels（仓内 3.5.0 落后 npm 4.1.0/4.2.0-beta）、browser-cdp（1.x 与 0.18.x 两套版本系）。

**G5 — publishConfig.tag 未表态（静默遗漏）/ 零代码依据换靶**
症状词：`发出去了但没挂线 tag`、`没带 --tag`。tag 缺位仓（磁盘无 `publishConfig.tag`）：free-search、canvas-tsx-sidebar、memory-palace、paste-dock、paste-to-path、seatbelt-sandbox、tidychat、auto-paste、media-lens(有)、video-read。异常 tag 值：browser-cdp `dsh-1.1.0`、tidychat `dsh-0.2`（非规范）、preset-manager 无 tag 但 engines 无上界。**发布纪律**：`npm publish` / `npm view` 均须 `--registry=https://registry.npmjs.org`；一线一 tag（dsh-0.1.5 / dsh-0.1.7 / dsh-0.2.0 / compat / latest）；CDN 传播 60s 内 view 404 属正常，勿重复发。

**G6 — 字面 grep「零代码」打错靶**
症状词：`grep 无命中所以纯元数据`。对文件/工具类插件，grep `composer|Schedule|forkSession|TextShimmer|displayTitle` 命中 0 是**必然**，不构成豁免依据。处置：设 `task_0` 定位真实消费面（src 内字面 import / slot key / jsonl 路径），再按迁移指南「调用者 vs 实现者」判豁免。反例即本清单最高风险样本：session-steward（原「零代码」被推翻为会话 V4 最高风险仓）。

**H — farm 共享格假满足（「格内在位」从来不是可装证据）**
症状词：`node_modules 里明明有`、`沙箱装过 = 能装`、`file+..+...+_artifacts`。定谳事实 3 的现行实锤样本＝mcp-registry：`[R]` `@0.3.4` 404（从未发布），却躺在 0.1.0-rc.8 / 0.1.1-rc.2 / 0.1.2-rc.1 / 0.1.5-rc.3 / 0.1.7-rc.2 五格 profile `node_modules` 顶层，而该仓 peer 只覆盖 0.1.7×2 + 0.2.0×2 → **四格根本不该能装上**。三路识别法：① 拿 `[R]` 问该版本是否存在（不存在＝本地 pack 塞入）；② 看 `.pnpm` 键名是否形如 `dsh-<pkg>@file+..+..+...+_artifacts+dsh-<pkg>-<ver>.tgz`（`_artifacts` = 本地 tgz 安装，非 registry）；③ 拿该格宿主 rc 去比该仓 peer 覆盖集（不在集内却装了＝闸门被绕过，典型手段：`--force` / `auto-install-peers` 误满足 / 直接复制目录）。同源变体：宿主 client 包只存在于 `.pnpm` 虚拟 store 不在顶层 → 「插件仓 smoke 全绿、沙箱全灭」的迷惑差异（C-03）。凡本索引 `[F]` 列均按此降级。

**M — manifest 文件名与副本陷阱（本索引编纂期自踩的坑）**
症状词：`glob 搜不到 = 不存在`、`manifest 缺失误判`。写点载体名有**两种拼写**：`dsh.plugin.json`（18 仓）与 `dsh-plugin.json`（browser-cdp、mcp-registry）；用字面 `dsh.plugin.json` 检索会把这两仓误判为「无 manifest」。另同一仓的 manifest 存在**多副本**（`.worktrees/`、`_wt-015|017|020/`、`_pmtest/`、`dsh-session-guard/_wt-main/`），核对必须锁定**仓根那一份**。全枚举口径（2026-10-11）：`dsh-*` 仓根共 **20** 个 manifest（两种拼写合计），其余 12 仓确实无 manifest（free-search、tidychat、tidy-display、paste-dock、paste-to-path、memory-palace、session-search、auto-paste、media-lens、video-read、transition-webui、cci-root）——「无 manifest」与「没搜到 manifest」是两种结论，后者必须用 `*plugin.json` 通配复核。

**S — semver 预发布三条硬结论（本索引全部 `[推]` 列的计算依据）**
① `<x.y.z-0` 上界**拒绝**同三元组的字母型 rc：数值标识符 0 < 字母标识符 → `0.2.0-rc.1` **不满足** `<0.2.0-0`（2026-10-11 本地 semver 实测：false）。凡上限写 `<0.2.0-0` / `^0.1.x` / `~0.1.x` 的 peer 都整条拒掉 0.2.0 线（synapse、seatbelt-sandbox、tidychat、prime-memory-flh-base、paste-to-path 之外的 0.1.5 起线仓尤甚）。
② `-rc` 精确上界 `<0.1.8-0` 是**健全写法**：不泄漏 `0.1.8-rc.1`（0.1.7 窄线全部仓适用）。
③ caret+prerelease 只放行**同 [major,minor,patch] 三元组**：`^0.1.5-rc.1 || ^0.2.0-rc.2` **不匹配** 0.1.7-rc.2（paste-dock v0.1.3 真实事故）；`^0.1.0-rc.7` 匹配 0.1.0-rc.8 但拒 0.2.0-rc.1。跨线 `^x.y.z-rc.n` OR 都是假声明——枚举法就是把「隐式事故」变「显式决定」。

**X — 双口径分歧表：「闸门放行」与「装得进去」是两个不同答案（本节是主表 `[推]` 列的必填脚注）**
症状词：`preflight 说支持但 npm 拒装`、`同一条 range 两个答案`。同一 peer range 在两道闸门下判定可相反：宿主 `evaluatePluginCompatibility` 用 **includePrerelease**（定谳事实 1）；而 npm/pnpm 装包期按 semver 默认规则——**预发布版本只能被同三元组、且自身带预发布的比较器匹配**。后果：跳线宽 range（`>=0.1.0-0 <0.3.0-0`）在默认口径下只剩 5/15（仅 0.1.0 线）；`^0.1.5-rc.1 || ^0.2.0-rc.2` 只剩 4/15（整条 0.1.7 被拒，即 INDEX §B 表的 paste-dock v0.1.3 真实事故）。**只有「精确枚举」与「同三元组窄 range」两口径一致** → 这就是枚举法的硬理由。
逐仓实测对照（2026-10-11，semver 库本地线算；`inc` ＝宿主 preflight 口径，`def` ＝npm 默认口径，未做真实装包取证）：

| 仓（磁盘版本）| inc | def | 仅 inc 才放行者 |
|---|---|---|---|
| browser-cdp 1.1.5 | 15 | **5** | 除 0.1.0 线外全部 10 个 rc |
| tidy-display 0.1.2-beta.8 | 15 | **5** | 同上 10 个 rc（发布物 0.3.1 已改枚举→无分歧）|
| seatbelt-sandbox 0.1.0 | 11 | **3** | 0.1.1×2、0.1.2、0.1.5×3、0.1.7×2 |
| session-search 0.1.0（private）| 11 | **3** | 同上 8 个 |
| tidychat 0.2.8 | 10 | **2** | 0.1.1×2、0.1.2、0.1.5×3、0.1.7×2 |
| paste-to-path 0.0.7 | 7 | **3** | 0.1.7×2、0.2.0×2 |
| memory-palace 1.6.0 | 6 | **0** | 全部 6 个（def 口径下一条都装不上）|
| auto-paste 0.2.1 | 6 | **4** | 0.1.7-rc.1/2 |
| prime-memory-flh-base 0.16.1 | 5 | **2** | 0.1.5-rc.1、0.1.7×2（多段 `\|\|` 逐段同三元组锁定 → 交集空）|
| synapse 0.5.0 | 5 | **3** | 0.1.7-rc.1/2 |
| prime-memory 0.18.5 | 2 | **0** | 0.1.7-rc.1/2（窄 range 与多项 `\|\|` 交成空集）|
| 其余 21 仓（全枚举/窄 range/无 dsh peer）| — | 与 inc **相同** | 无分歧（含 perm-gate/input-traffic/session-steward/session-guard/bash-terminal-ts/date-wrapper/brief-sidebar/paste-dock/arrowkey-nav/search-index/patch-edit-plus/thinking-levels/live-token-stats/mcp-registry/canvas-tsx-sidebar/cci/media-lens/video-read/free-search）|

**使用约束**：引用任何一行的「可装线」时必须声明口径；给用户下「老线装不上」结论前取两口径的**交集**；要消除分歧只有一条路径＝把 peer 改成 15rc 精确枚举（INDEX §G 全局决定 1）。

**O — overrides 差集（pnpm workspace 仓）**
症状词：`pnpm.overrides`、`workspace 版本被悄悄改写`。`package.json.pnpm.overrides`（以及 workspace 根 overrides）优先级高于 devDependencies 声明，故「读 devDeps 得知的基线」与实际解析版本可能不同。现形：live-token-stats（`overrides: dsh-llm@0.1.5-rc.2` 覆盖自身 peer/devDep 口径）、cci（pnpm workspace + `packages/*` 分包 devDeps 混钉）。核对法：三处同读——devDependencies / pnpm.overrides / lockfile 实际解析项。

**K — 知识孤岛（兄弟计划零引用）**
症状词：`HANDOFF 没人引`、`同一坑重踩`。`perm-gate-compat-15rc/HANDOFF-0.1.5-card.md` 与 `cross-version-adaptation-all/*` 位于**顶层** `.agents/plans/`，而各仓子计划位于 `mine-dsh-plugins/.agents/plans/`；两侧互不引用 → 根因结论（H3 死刑、stale-build 真根因、T35 硬钉无效）没有回灌进各仓 checklist。教训形态化：新先例卡落盘时必须在**被引用侧**（各仓 checklist / 本索引）显式登记指针；跨目录引用一律写相对路径 + 计划名。

## 4. VD 关联候选（症状词 → 期望 VD-ID；台账未建时 ID 留空）

| 先例坑 | 症状词（供 version-delta-ledger 卡片交叉引用） | 期望 VD-ID |
|---|---|---|
| C-01 perm-gate | `无卡` / `settings namespace not registered` / `identitySame` / `stale-build` / `dependencies 硬钉 dsh-settings` | （待台账） |
| C-02 free-search | `三代 waist` / `webServer 桥 expectedRevision` / `engines.dsh 缺失` / `npm 名占用 403` | （待台账） |
| C-03 input-traffic | `configForms 与 settingsScope 按代互斥` / `.pnpm 虚拟 store` / `rg -L junction` / `family.tab 裸沙箱缺席` | （待台账） |
| C-04 session-steward | `source-kind 名单照录` / `session.jsonl 直读` / `档位 skipped` / `purge 目录契约` | （待台账） |
| C-05 patch-edit-plus | `ShellExecutor.run→execute` / `typecheck-0.1.5.mjs 硬编码` / `INSTALL 排除 0.2.0` / `devDeps 0.1.2-rc.1 假绿` | （待台账） |
| C-06 date-wrapper | `脏工作区未裁决` / `publishConfig.tag 缺` / `manifest version 漂移` | （待台账） |
| C-07 search-index | `双 lockfile 权威 PM` / `as 强转豁免` / `第二处 engines` | （待台账） |
| C-08 bash-terminal-ts | `双 manifest` / `range 而非枚举（engines 比 peer 窄）` / `node-pty beta native` | （待台账） |
| C-09 prime-memory | `ctx.settings.register 臆想分支` / `多段 \|\| 交集塌陷` / `同名双仓互踩` | （待台账） |
| C-10 tidychat | `^0.1.0-rc.7 拒 0.2.0` / `README register 口径` / `非规范 tag dsh-0.2` | （待台账） |
| 通用 H（farm 假满足）| `格内在位≠闸门放行` / `file+..+_artifacts` / `.pnpm 虚拟 store` | （待台账） |
| 通用 M（manifest 拼写）| `dsh-plugin.json 与 dsh.plugin.json` / `manifest 多副本` | （待台账） |
| 通用 X（双口径）| `preflight 说支持但 npm 拒装` / `跳线宽 range 只剩同三元组` / `inc≠def` | （待台账） |
| 通用 S（semver）| `<0.2.0-0 拒 rc` / `caret 同三元组锁定` / `includePrerelease` | （待台账） |
| 通用 G1/G1-B/G2/G4/G5/G6/O/K | 见 §3 各节首行症状词 | （待台账） |

## 5. 无法定谳清单（本草案遗留）

1. **npm 发布态 ≠ 可装线**：`[R]` 只证明 registry 上存在某 dist-tag 版本；本索引仅对 patch-edit-plus@0.4.0、thinking-levels@4.2.0-beta.29、perm-gate@5.1.2-compat.10、tidy-display@0.3.1、mcp-registry@0.3.3 **五个**发布物实读了 peerDependencies。其余仓的「**已发布版本**」peer 覆盖线仍属 `[未]`（例：search-index@0.6.4、session-guard@4.1.15、synapse@0.4.2、canvas-tsx-sidebar@0.7.0、tidychat@0.4.0、prime-memory@0.22.1、brief-sidebar@0.7.0、arrowkey-nav@0.5.2）。
2. **office 家族四仓不在本地**：`compat-0.2.0-adaptation` §3 列有 dsh-docx-sidebar / dsh-office-render / dsh-opensheet-sidebar / dsh-pptx-sidebar，且存在 `compat-0.2.0-dsh-{docx,opensheet,pptx}-sidebar` 计划目录；2026-10-11 全枚举 `mine-dsh-plugins/` 下 34 个 `dsh-*` 目录**均不含这四名** → 主表缺这 4 行（**不得**据计划字面版本推断可装线；这四仓的当前实态需先取得仓目录或 registry 名才能定谳）。
3. **mcp-registry 遗留项（原「manifest 缺失」已推翻）**：仓根 `dsh-plugin.json`（连字符名）已定位并读取——version 0.3.4 与 package.json 同步、**无 engines 字段**。未定谳的是：① 按 §G-1「双闸口同源」该 manifest 是否应补建 engines（属裁决题，非事实题）；② **发布物** 0.3.3 里究竟带不带 `dsh-plugin.json`（package.json `exports` 有 `./dsh-plugin.json` 条目，但未做 `npm pack` / 干净格取证，不能拿磁盘文件推发布内容）；③ registry 上 `latest=0.2.14` 低于 `dsh-0.1.7`/`dsh-0.2.0` 的 0.3.3——latest 与线 tag 的版本系分叉原因未追溯。
4. **CCI 的 dsh.plugin.json 位置**：root 无 manifest，疑在 `packages/selector` 下，未逐一确认（同步态列已标未复核）。
5. **`[F]` farm 格快照全部降级**：六格 node_modules 目录近乎同构（同源复制嫌疑）＋定谳事实 3 的 hoist 陷阱 → 本索引未把任何「可装线」唯一归于 `[F]`；0.2.0-rc.2 格构型与其余五格明显不同，需要单独取证。
6. **`def` 口径未做真实装包取证**：§3-X 的 `def` 列全部由 semver 库本地推演（不传 `includePrerelease`），与 INDEX §B 计划字面（caret 跳线「不匹配」）互证；但 npm/pnpm 在 host profile 安装路径上究竟走哪套选项（`auto-install-peers` / `legacy-peer-deps` / npm 自身的 peer 冲突判定）**未实测** → 对 wide-range 仓（browser-cdp、tidy-display 磁盘态）的「装不上」判定需一次干净格 `npm install` 取证才能定谳。另：本仓系活仓，磁盘版本会变（已观察到 free-search 0.9.23→0.9.24 在一次会话内前移）。
7. **prime-memory「从未发布」旧笔记**：与本次 `[R]`（latest=0.22.1）直接冲突，本索引以 `[R]` 为准，但**旧笔记出自哪个计划原文未追溯定位**；同理，磁盘 0.18.5 与 registry 0.22.1 的分支主从关系（谁为权威线）未定谳。
8. **「档位语义 30 条假异常」出处层级**：仅在 `dsh-session-steward/CHANGELOG.md` 与 `lib/index.d.ts` 注释取得证据，属**产品判据缺陷**而非跨版本适配坑；compat-0.2.0-dsh-session-steward 四件套内**无**该记载，`steward-source-kind-capability` 计划亦未见「30 条」字样 → 该条与「0.2.0 适配」的因果关联未定谳。
9. **日期口径**：磁盘 metadata 采集于 2026-10-11（只读），`[P]` 计划字面结论日期跨 2026-09-25 ~ 2026-10-08；两者之间若发生过发版/分支归位，本索引无法自行分辨。
