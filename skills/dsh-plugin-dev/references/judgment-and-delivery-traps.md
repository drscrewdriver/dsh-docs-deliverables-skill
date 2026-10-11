> 溯源｜08-判定语义与交付陷阱 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# DSH 插件判定语义与交付陷阱（session-steward / prime-memory 实战沉淀）

> **来源**：2026-09-16 `dsh-session-steward` v0.1.0-alpha.1 → alpha.4 的完整交付过程，以及 `dsh-prime-memory` 面板修复的交付排查。
> **适用**：任何带「体检 / 诊断 / 处置」语义的插件；以及任何走 `dsh plugin` 安装的 DSH 插件。
> **一句话结论**：**判定档位的语义错一格，整个插件的输出就全错；交付链错一环，修好的东西用户永远看不到。**
> 本次两条最贵的教训分别是 #1（档位语义）与 #13（修了但没装）——一个让用户看到 30 条假异常，一个让用户以为根本没修。

---

## 一页速查表

| # | 陷阱 | 正确做法 | 类 |
|---|---|---|---|
| 1 | 把「无法判定」当「异常」 | 四值档位：`ok`/`warn`(有据)/`fail`(硬损坏)/`skipped`(无据、中性、**不入聚合**) | 判定 |
| 2 | 判定标准与处置标准各写一份 | 抽**共享谓词** `isActionable()`（仅 `warn`/`fail` 可处置） | 判定 |
| 3 | 只摆状态快照，不给因果解释 | 处置返回 `(verdict, explanation, residual)` 三元组 | 判定 |
| 4 | 半途中断留下半份缓存 | **走满一遍语料才成型**，否则 `undefined` | 缓存 |
| 5 | 一份缓存承载多种视图 | 只承载一种（`onlyProblems: true`），其它视图不参与 | 缓存 |
| 6 | 为刷新一行重扫全量 | 重算过的报告**就地写回** | 缓存 |
| 7 | 面板挂载即干重活 | 探测接口**纯读**（`resume` 只读缓存、绝不扫描） | 缓存 |
| 8 | 「加个磁盘缓存吧」 | 先算失效成本；失效判断≈重扫 ⇒ 不落盘 | 缓存 |
| 9 | 旧结果冒充刚扫的 | 缓存**必须露出生成时间** + 提供显式刷新 | 缓存 |
| 10 | 以为注册了 slot 就有形态 | `settings.plugin.item` **只分发、不给外壳**，chrome 归插件自负 | 形态 |
| 11 | i18n key 定义了却没人引用 | **死文案 = 漏渲染的信号**，当成静态检查项 | 形态 |
| 12 | 注册了 slot ≠ 有了形态 | 先看同 slot 上其它插件怎么写的，再对齐 DOM/间距/令牌 | 形态 |
| 13 | 只看 `git log` 就宣布修好 | **核对装机产物哈希 == 仓库产物哈希** | 交付 |
| 14 | 浮动 ref 装出来的东西不可复现 | 一律钉死 SHA | 交付 |
| 15 | 先 remove 再 add，add 失败 | **remove 成功 + add 失败 = 插件消失**，重装前先备份依赖行 | 交付 |
| 16 | 直接 `pnpm add` 以为装好了 | `pnpm add` **不补** `dsh.profile.bundles`，必须再跑一次 `dsh plugin add` 对账 | 交付 |
| 17 | 照抄 pnpm 报错找 key | `dsh plugin` 会吞掉 pnpm 打印的 `allowBuilds` key，要**直跑 pnpm** | 交付 |
| 18 | 长命令零输出以为没跑 | `cmd /c "... > log 2>&1"` 落盘再读 | 交付 |
| 19 | 单测全绿就宣布交付 | 四层：typecheck → test → build → **dist 冒烟** | 验证 |
| 20 | 门禁语义只写在文档里 | 写进**代码注释**——下一个人会照着现有 gate 抄 | 验证 |

---

# 第一组 · 判定语义（最贵的一组）

> 这一组的问题有个共同特征：**代码不报错、测试能过、用户看到的结果全错。**
> 没有类型系统能帮你，只能靠"档位语义"这件事本身在脑子里是清楚的。

## 1. 把「无法判定」当「异常」——全量假阳性

**现象**

体检面板 30 条会话**全部**显示「注意」。用户原话：「每一条都是注意，那这个功能等于没有」。真信号被彻底淹没。

**根因**

三个门在**无从判定**时返回了 `warn`：

| 门 | 无从判定的场景 |
|---|---|
| `lossless-json` | 拿不到热态投影（宿主未暴露 `sessionProjections`），冷态记录经 JSON 往返必然无损 |
| `projection-cache` | 缓存记录尚未生成（会话从没被加载过） |
| `cold-read` | 日志里没有 `turn/end`，无从判断能否接续 |

这三个都是**"我没法看"**，不是**"我看到了问题"**。但聚合规则把它们当异常抬升总判，于是**所有未加载的会话恒为「注意」**。

**正确做法**

门禁档位必须是**四值**，且在代码注释里把判定标准钉死：

```
ok       = 通过
warn     = 观测到了异常现象（有据）
fail     = 硬损坏
skipped  = 无从观测 / 无从判定（无据）—— 中性，**不参与总判聚合**
```

关键设计：`skipped` **刻意不放进聚合链**。聚合写成 `fail > warn > ok`，`skipped` 自然"穿透"到 `ok`——所以聚合表达式一行都不用改。

**如何验证**

- 构造一个 `skipped` 的门，断言总判**不被抬升**（回归测试）；
- 真实语料实测：修复前 30 条 → 修复后 **26 正常 / 3 注意 / 1 异常**。这是一个可复现的数字，比"看起来好了"可信。

**踩坑提醒**：改档位语义时，**旧测试可能正编码着缺陷**。本次有 3 个断言失败，全是 `expected 'skipped' to be 'warn'` 这种——别顺手"修测试让它过"，先确认测的是新语义还是旧缺陷。

---

## 2. 判定标准与处置标准各写一份——自相矛盾

**现象**

用户报告：「处置后还是异常」。点开详情：证据写的是「投影缓存记录不存在，无需隔离」，但处方区却说「投影缓存未对齐」，建议隔离一条**并不存在**的记录。

**根因**

- `gates.ts` 说这门 `skipped`（无从判定）；
- `repair.ts` 用的却是 `if (cache?.level !== 'ok')`——把 `skipped` 也算进"异常"。

于是系统在**用自己刚说的话反驳自己**。这是典型的"同一个语义概念在两处各写了一份定义，然后漂移了"。

**正确做法**

抽出**共享谓词**，让两处引用同一个定义：

```ts
/** 该门是否构成「可处置的异常」。判定标准与 gates.ts 的 GateLevel 文档一致。 */
function isActionable(level: GateLevel | undefined): boolean {
  return level === 'warn' || level === 'fail'
}
```

顺带修掉兜底文案：原为固定「四门全绿」，在存在 `skipped` 门时不成立，改为
「无可处置项（N 门无从判定，非异常）：&lt;门 id 列表&gt;」。

**如何验证**

- 断言：投影缓存为 `skipped` 时，处方里**不出现**「投影缓存未对齐」；
- 断言：存在 `skipped` 门时，兜底文案不是「四门全绿」。

**推广**：**"这个门能不能处置"和"这个门是什么档位"是同一个知识，必须只有一个定义。** 任何 `!== 'ok'`、`!= 'ok'` 形式的判断都要当场怀疑。

**别只修现象**：`prescribe()` 里有 4 处判断档位的地方，只有 1 处写成 `!== 'ok'`。**不要就地改那一处 `if`，要抽出谓词再全局替换**——本次 `isActionable()` 最终被 `prescribe()` 和 `assessRepair()` 共用，第二个调用点正是在修第一个时顺手发现的。

验证手段：`grep -n "!== 'ok'\|!= 'ok'" src/` 应当为空（或在注释里说明为何例外）。

---

## 3. 只摆状态快照，不给因果解释——用户会以为功能坏了

**现象**

处置完界面显示「处置前：异常 / 处置后：异常」。用户无法判断是**处置失败**，还是**处置跟病灶压根无关**。

**根因**

UI 只渲染了两次报告的**档位快照**，没有任何**因果说明**。而真实情况是：该会话唯一的异常来自 `cold-read`（会话有未结算的 open step），而处置**只**隔离投影缓存记录——按插件红线，处置**本来就不该**修这一类异常。

也就是说：**功能完全正常，但呈现方式让人觉得它坏了。**

**正确做法**

处置返回一个**定性结论三元组**，而非只回 before/after：

```ts
type RepairVerdict =
  | 'nothing-to-do'            // 四门全绿
  | 'repaired'                 // 已恢复
  | 'repaired-with-residual'   // 处置生效，但仍有与缓存无关的异常
  | 'not-applicable'           // 当前异常无可逆处置项
  | 'failed'                   // 处置自身失败

interface RepairAssessment {
  verdict: RepairVerdict
  explanation: string          // 人读说明，直接展示
  residual: { id: string; level: GateLevel }[]
}
```

> 注：计划里原本设计成 **3 档**，实现时扩成 **5 档**——因为 3 档无法区分「四门全绿」与「无可处置项」，也无法表达「处置本身执行失败」。**分支数量要按"用户需要区分的处境"来定，不是按"代码里有几条路径"来定。**

UI 侧按 verdict 渲染彩色结论横幅（`.dss_verdict_<verdict>`）。

**如何验证**

- 单会话 open step 场景 → 应显示 `not-applicable` + 说明，而不是两个红档位；
- 5 档各写一条单测。

---

# 第二组 · 缓存不变式

> 缓存不是"加个 Map 就完事"。本次沉淀出 6 条**不变式**，任何一条破了都会产生"看起来对、其实是错的"结果。
> 参照实现：`dsh-session-steward/src/host/health/cache.ts`（`HealthCache`，19 例单测）。

## 4. 走满一遍语料才成型

**现象（如果做错）**：用户扫到 30% 关了面板，再打开时看到"未发现异常会话"——因为缓存里只有那 30% 的结果，而其中恰好没问题。

**正确做法**

```ts
begin(total)   // offset === 0 时开一轮
append(findings, scanned)  // 每批追加；visited >= total 才 this.ready = {...}
```

**关键**：`scanned` 是**本批已访问数**，不是**命中数**。用命中数累计进度条永远走不满（因为过滤掉了 ok 的会话）。

**如何验证**：单测——`begin(10)` + `append(..., 4)` → `read()` 为 `undefined`；再 `append(..., 6)` → 成型。

---

## 5. 一份缓存只承载一种视图

**现象（如果做错）**：`onlyProblems: true`（面板用的）和 `false`（全量）交替扫描同一份缓存 → 行数忽多忽少，`patch()` 的"转好即移出"语义也失去意义（全量视图里 ok 的行本来就该留着）。

**正确做法**：明确声明缓存语义 = **只列问题的视图**；`onlyProblems: false` 的扫描**完全不碰缓存**。

```ts
if (result.ok && onlyProblems) {
  if (offset === 0) cache.begin(result.total)
  cache.append(result.findings, result.scanned)
}
```

**如何验证**：单测——跑一次 `onlyProblems: false` 的全量扫描，断言 `cache.read()` 仍为 `undefined`。

---

## 6. 单条就地回写

**现象（如果做错）**：用户处置完一条，为了刷新那一行要重扫 200 个会话（每个都要解 zstd、跑四门）。

**正确做法**：处置**本来就重算了 `after` 报告**——把它直接写回缓存即可。

```ts
patch(report): boolean {
  // 缓存视图只列非 ok：转好的行移出，新坏的（或原本未在列的）行加入
  if (report.level === 'ok') { /* splice 掉 */ }
  else { /* 替换或追加 */ }
}
```

三个调用点：`session-health-session`、`session-health-repair`、以及 `session-health-repair` 的 `before.level === 'ok'` 早返回分支（用来摘掉缓存里可能残留的陈旧行）。

**如何验证**：单测用**对象身份**断言——`expect(cached).toBe(res.after)`。这比断言字段相等强得多，它证明写回用的就是本次重算的那个对象。

---

## 7. 探测接口必须纯读

**现象（如果做错）**：面板一挂载就跑一批扫描。用户在设置页和面板之间来回切，每切一次全量重扫一遍——"挂载即干重活"。

**正确做法**：`resume: true` 语义钉死为**纯读缓存、绝不扫描**。没命中就如实回 `cached: false`，并捎回语料总数（让 UI 知道"有多少待体检"），然后什么都不做。

**实现细节**：面板把 `resume` 挂在**首批请求**上（`offset === 0`），命中就直接渲染并 `return`，未命中则这一批**就是**第 0 批，循环继续。而「刷新」按钮走 `forceRefresh: true` 跳过探测。

**如何验证**：单测——`resume: true` 且无缓存时，断言 `scanned === 0` 且 `findings` 为空。

---

## 8. 落盘之前，先算失效成本

**决策**：本次缓存**不落盘**，DSH 重启即失效。

**理由**：落盘就必须配失效策略（会话日志在变、语料在变），而**判断失效的代价（枚举语料、比对每个日志的 mtime/size）已经接近重扫本身**。既然失效判断 ≈ 重扫，那落盘就没有收益。

> 代价不对称才有缓存的价值。**枚举目录很便宜、跑完四门很贵**——正因为两者差着量级，"对账"才不构成失效策略本身，可以作为便宜的辅助提示。

**成本兜底**：不落盘就必须**诚实**——面板显示「结果来自缓存 · N 分钟前」，绝不制造"看起来总是新的"的假象。

**如何验证**：对照 `session-health-scan` 的 `resume` 响应里的 `total`（生成时语料数）与 `currentTotal`（当前语料数），不一致时 UI 提示「语料已变化，建议刷新」。

---

## 9. 生成时间必须露出 + 显式刷新入口

**做法**

- 缓存命中时显示「结果来自缓存 · N 分钟前」（四档粒度：刚刚 / 分 / 时 / 天，30 秒走字，不引第三方时间库）；
- 同区提供「刷新」按钮（强制全量重扫）；
- 语料数不一致时加一行「语料已变化（a → b），建议刷新」。

**如何验证**：关面板 → 重开，结果仍在且带时间戳；点刷新能更新。

---

# 第三组 · DSH 插件形态

## 10. `settings.plugin.item` 只分发、不给外壳

**现象**

「设置 → 插件 → 配置」里，本插件的卡片只有三行裸开关，没有标题头。同分区其它插件都是**可折叠抽屉**（标题 + 说明 + chevron）。用户原话：「设置漏加抽屉项了」。

**根因**

DSH 的「插件」设置分区（`dsh-client-ui-settings-plugins`）**只做一件事**：

```js
// ConfigurablePluginsTab
renderSlot('settings.plugin.item', {}, { entryKey: ns })
```

它把命名空间对应的 slot 渲染进一个 `<ul class="cards">`，**不提供任何外壳**。
官方 README 写得很清楚：

> A plugin that ships a browser half registers its own card under its own namespace and **owns every part of it: chrome, controls, and copy.**

所以卡片的标题、说明、展开/收起，**全归插件自己所有**。

**正确做法**：新卡片必须对照同分区其它插件的实现（本次参照 `dsh-search-index` 的 `SearchSettingsCard`）：

```
div.dss_setCard           (border + bg-layer-3 + radius 12)
 └─ button.dss_setHead    (aria-expanded={open}，整块可点)
     ├─ span.dss_setHeadText
     │    ├─ span.dss_setCardTitle   (14px / 600 / label-primary)
     │    └─ span.dss_setCardDesc    (13px / tertiary)
     └─ svg.dss_setChev     (16×16，展开时 rotate 180deg)
 └─ div.dss_setBody        (open 时渲染)
```

默认 **`open = false`**（收起的），与分区内其它卡片一致。

**顺带修**：设置服务不可用时，原先整张卡退化成一行并**连标题一起丢掉**——插件在分区里等于消失。现在抽屉头照常渲染，只在主体里说明原因。

**如何验证**：装机产物里应能搜到 `dss_setCard` / `dss_setHead` / `dss_setChev` / `aria-expanded`。

---

## 11. ⭐ 死文案 = 漏渲染的信号

**这条是本次最值得固化的检测手段。**

**现象**：抽屉头漏写，但**没有任何工具会报错**——TS 编译过、测试全绿、i18n 字典完整。

**根因（可复用的规律）**：

> 字典里定义了 i18n key，但代码里**从不引用**它 ⇒ **一定有一段 UI 没写**。

本次铁证：`card.title`（会话管家）和 `card.desc`（历史文件 · 健康检查）**两条都在字典里，`card.tsx` 里一次都没引用**——死文案精准指向了漏掉的抽屉头。

**正确做法（建议落成测试）**

```ts
// tests/locales.spec.ts —— 扫 src/client/** 里所有 translate(t,'x') / t('x') 的字面量引用，
// 断言 zh 字典的每个 key 都被引用过。
```

这条测试**能在编译期直接抓住本次这个 bug**，比任何文档都硬。

**如何验证**：把 `card.title` 的引用删掉，测试应当报红。

---

## 12. 注册了 slot ≠ 有了形态

**推广自 #10**：`slots.inject(...)` + `slots.register(...)` 成功返回，只证明**挂上了**，不证明**长对了**。

**正确做法**：新增任何 UI 挂载点时，**先去看同 slot 上其它插件怎么写的**（`node_modules/<其他插件>/lib/client.js`），把 DOM 结构、间距、圆角、配色令牌对齐。

**如何验证**：装机后目视对比同分区内的多个卡片，形态应当一致。

---

# 第四组 · 交付部署（踩得最实的一组）

## 13. ⭐「修了但没装」是独立故障类别

**现象**

用户报告「维度设置突出来一块」。我查仓库——**修复早已 `commit` 且 `push`**，提交信息就是「fix(client): 回填嵌入卡片布局修复到源码」。

**根因**

```
仓库 feat/storage-scope:  ba13419 → 94d52f1(修复) → 6df4fb8
profile 钉的是                                    ↑ 差 2 个提交，正好卡在修复前
```

> **用户看到的是装机产物，不是 `git log`。**

`git log` 显示"修好了"，profile 却钉在修复前一个 SHA。这是**独立于"没修"的故障类别**，而它在 `git log` 里**完全不可见**。

**正确做法**

交付前核对**装机产物哈希 == 仓库产物哈希**：

```powershell
(Get-FileHash "$profile\node_modules\<pkg>\lib\client.js").Hash
(Get-FileHash "<repo>\lib\client.js").Hash
```

本次正是靠这一步抓到的：装机哈希 `EC2CFCA0…` ≠ 仓库哈希 `AECF134F…`。

**如何验证**：上面两条哈希必须逐字节相同（`MATCH`）。

---

## 14. 浮动 ref 必须钉死 SHA

**现象**：profile 里 `"dsh-session-steward": "github:drscrewdriver/dsh-session-steward"`——**没有 SHA**。

**风险**：今天装的和明天装的可能不是同一份代码；出问题无法复现、无法回滚。

**正确做法**：一律 `github:<owner>/<repo>#<full-sha>`。

```
github:drscrewdriver/dsh-session-steward#c6d84146e2aa60d4f3ce8cc3b93d0082744d8579
```

**如何验证**：`Select-String -Path <profile>\package.json -Pattern 'github:'` 结果里，每一条都应当带 `#<40位hex>`。

---

## 15. ⚠️ `dsh plugin add` 失败会先把插件卸掉

**现象（本次真实发生）**

我执行 `dsh plugin remove dsh-prime-memory` → 成功；紧接着 `dsh plugin add` → **失败**。
结果：**profile 里 prime-memory 一度消失**（依赖没了、`node_modules` 没了、`bundles` 条目也没了）。

失败原因是双重的：
1. pnpm 的 `allowBuilds` 构建门禁拦截 git-hosted 插件的 `prepare` 脚本；
2. 该包 6.2MB tarball 走 codeload 只有 **~28KB/s**，首次下载耗时 **7 分 17 秒**（期间极易被中断）。

**正确做法**

- **重装前先备份 profile 的依赖行与 bundles 条目**；
- 大包（>1MB）优先用**直装 + 对账**两步法：
  ```powershell
  # 1) 直跑 pnpm（workdir = profile 目录），失败不会动 profile 清单
  pnpm add "github:<owner>/<repo>#<sha>" -w
  # 2) 再跑一次 CLI 让 dsh 补 dsh.profile.bundles
  dsh plugin --profile web add "github:<owner>/<repo>#<sha>" -w
  ```
- 失败后的恢复顺序：确认 `deps` / `bundles` / `node_modules` **三处**都回来了。

**如何验证**：重装后三处都查一遍：

```powershell
Select-String -Path "$p\package.json" -Pattern '<pkg>'   # deps + bundles 两行
Test-Path "$p\node_modules\<pkg>"                        # 目录
```

---

## 16. `pnpm add` 不补 `dsh.profile.bundles`

**现象**：直跑 `pnpm add` 成功后，`package.json` 的 `dependencies` 有了，但 `dsh.profile.bundles` **没有对应条目** → 插件不会被加载。

**根因**：`dsh plugin` CLI 在 pnpm 之后会读包内 `dsh.bundle.patch` 并**对账** `dsh.profile.bundles`；裸 `pnpm add` 只改依赖与锁文件。

**正确做法**：直装后**必须再跑一次** `dsh plugin --profile <p> add <same-spec> -w` 对账（此时包已缓存，几秒完成）。

**如何验证**：`package.json` 里该包名应出现**两次**——一次在 `dependencies`，一次在 `dsh.profile.bundles`。

---

## 17. `dsh plugin` 会吞掉 pnpm 打印的关键信息

**现象**：`dsh plugin add` 失败时报：

```
dsh: git-hosted plugins build on install via their prepare script, which pnpm blocks
until allowed — add the exact key pnpm printed above under allowBuilds in
~\.dsh\profiles\<p>\pnpm-workspace.yaml, then re-run
```

它说「the exact key pnpm printed **above**」——**但 above 什么都没有**，pnpm 的输出被 dsh 包装层吞了。

**正确做法**：`dsh plugin --help` 也不可用（它会转发到 pnpm help 并报 `required option '--profile'`）。要看 pnpm 的真实输出，**直跑 pnpm**：

```powershell
# workdir = profile 目录
cmd /c "pnpm add github:<owner>/<repo>#<sha> -w --reporter=append-only > log.txt 2>&1"
```

**如何验证**：`log.txt` 里能看到 pnpm 的完整告警块（含被拦截的构建脚本名与 `allowBuilds` key）。

---

## 18. 长耗时命令会「零输出 + exit=-1」

**现象**：`dsh plugin add` 跑了 52 秒后返回 `exit=-1`，**stdout/stderr 全空**。用 PowerShell 管道 `2>&1 | Select-Object` 也拿不到内容。

**正确做法**：改用 cmd 重定向落盘，再读文件：

```powershell
cmd /c "<command> > C:\...\log.txt 2>&1"; Get-Content C:\...\log.txt -Encoding UTF8 | Select-Object -Last 30
```

**如何验证**：日志文件里有完整输出，且能看到真实错误原因。

---

# 第五组 · 验证深度

## 19. 四层验证：单测全绿 ≠ 交付完成

| 层 | 命令 | 抓什么 |
|---|---|---|
| 1 | `pnpm typecheck` | 类型与接口漂移 |
| 2 | `pnpm test` | 行为正确性（本次 101 例 / 9 文件） |
| 3 | `pnpm build` | 产物能否生成（`lib/` 重建） |
| 4 | **dist 冒烟** | **产物本身**的行为（用 `lib/index.js` 跑真实调用，而非 `src/`） |

**第 4 层为什么必须**：单测跑的是 `src/`，而**装到用户机器上的是 `lib/`**。构建配置、tree-shaking、外部依赖声明，任何一个环节都可能让"源码是对的"变成"产物是坏的"。

本次 dist 冒烟脚本独立确认了三件事（与单测正交）：

```
resume-miss : {"ok":true,"cached":false,"scanned":0,"total":3}     ← 纯读，零扫描
mid-scan    : {"scanned":2,"resumeCached":false}                  ← 半程不成型
resume-hit  : {"cached":true,"scanned":0,"total":3,"currentTotal":3,"findings":3,"generatedAtIsNumber":true}
```

**如何验证**：写一个临时 `.mjs`，`import { ... } from './lib/index.js'`，用假运行时跑一遍关键路径，跑完删除。

---

## 20. 门禁语义写进代码注释，不只是文档

**理由**：加新 gate 的人**不会去读设计文档**，他会**照着旁边现有的 gate 抄**。

所以把判定标准写在**类型定义旁边**：

```ts
/**
 * 该门是否构成「可处置的异常」。
 *
 * 判定标准与 gates.ts 的 GateLevel 文档一致：
 *   `warn` / `fail` = **观测到了**异常现象（有据）→ 可开处方；
 *   `skipped`       = 无从观测/无从判定（无据）→ 不开方。
 *
 * 早期版本用 `level !== 'ok'` 判断，把 `skipped` 也算成异常，导致对着
 * 「本门无从判定」的证据输出「投影缓存未对齐」，并建议隔离一条不存在的记录。
 */
```

**关键**：注释里要写明**错误写法长什么样、会造成什么后果**。只写"正确是什么"不够——下一个人不知道自己正在写的就是那个错误写法。

---

# 交付前验证清单

## A. 代码门禁

- [ ] `pnpm typecheck` exit 0
- [ ] `pnpm test` 全绿（记录用例数 / 文件数）
- [ ] `pnpm build` 成功，`lib/` 已重建
- [ ] **dist 冒烟**：用 `lib/` 而非 `src/` 跑一遍关键路径

## B. 判定语义（如涉及体检/诊断/处置）

- [ ] 档位是四值（`ok`/`warn`/`fail`/`skipped`），`skipped` **不参与聚合**
- [ ] 「可否处置」与「什么档位」共用**同一个谓词**
- [ ] `grep -n "!== 'ok'\|!= 'ok'" src/` 为空
- [ ] 处置返回 `(verdict, explanation, residual)`，不只回 before/after
- [ ] 每个 verdict 分支都有单测

## C. 缓存（如引入）

- [ ] 走满才成型（半途中断 → `undefined`）
- [ ] 只承载一种视图，其它视图不参与
- [ ] 单条就地回写（用**对象身份**断言）
- [ ] 探测接口**纯读**，不扫描
- [ ] 落盘决策已记录理由（本次：不落盘）
- [ ] 缓存暴露生成时间 + 提供显式刷新

## D. UI 形态

- [ ] 新挂载点已对照同 slot 上其它插件的实现
- [ ] `settings.plugin.item` 的卡片**自带 chrome**（标题/说明/展开）
- [ ] **字典里没有未被引用的 i18n key**（死文案检测）
- [ ] 服务不可用时，卡片不会整体消失

## E. 版本与文档

- [ ] `package.json` / `dsh.plugin.json` / `INSTALL.*` 版本号同步
- [ ] 3×CHANGELOG（zh/ja/ko）已补本次条目
- [ ] `tasks.md` / `checklist.md` 已回写
- [ ] **产物更新必须同步升版**（dist 变了而 version 没变 = 状态漂移）

## F. 交付与装机（最容易漏）

- [ ] 提交用 `-F` 传消息（中文/编码敏感内容**严禁 shell 管道**）
- [ ] 已推送，`git rev-list --left-right --count origin/<branch>...HEAD` 为 `0 0`
- [ ] 重装走**先 remove 再 add**（增量覆盖会跳过 integrity 锁）
- [ ] **profile 依赖已钉死 SHA**（无浮动 ref）
- [ ] `dsh.profile.bundles` 条目存在
- [ ] **装机产物哈希 == 仓库产物哈希** ⭐
- [ ] 已明确告知用户**是否需要重启 DSH**（宿主侧变更 = 必须重启；纯客户端 = 刷新或重启）

---

## 附：本次交付轨迹（可复盘的完整链条）

```
6690c91  fix(health): 修掉「注意」全量误报，补扫描进度与行内原因      → 0.1.0-alpha.1
39afed8  fix(health): 处置判定修正 —— 不再对 skipped 开方，五档结论   → 0.1.0-alpha.2
7659022  feat(health): 体检结果缓存 —— 关面板重开零延迟，单条回写     → 0.1.0-alpha.3
c6d8414  fix(settings): 设置卡补回抽屉形态 —— 此前只剩裸行           → 0.1.0-alpha.4
```

对应的用户反馈链：

```
「每一条都是注意」              → #1 档位语义
「处置后还是异常」              → #2 谓词漂移 + #3 缺因果解释
「关面板重开又要重扫」          → 第二组 缓存不变式
「设置漏加抽屉项了」            → #10 #11 卡片 chrome / 死文案
「维度设置突出来一块」          → #13 修了但没装
```

**规律**：**每一条用户反馈，都恰好对应一个"代码没报错、测试能过"的语义/交付盲区。** 用户看到的是结果，而缺陷藏在"结果是怎么被定义和送达的"这两层里。
