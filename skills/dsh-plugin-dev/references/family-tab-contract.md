> 溯源｜12-家族节契约 v1.0（自带「与旧文档冲突以本文为准」优先声明） 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# 家族节契约 — family-tab-contract（dsh-family 跨版本席位）

> 版本 v1.0（2026-10-08）。生效版本：dsh-thinking-levels ≥4.2.0-beta.26、dsh-session-guard ≥4.1.11、dsh-session-steward ≥0.5.0-beta.13、dsh-input-traffic ≥0.7.2。
> 依据：2026-10-07/08 两轮五格实机取证（台账 `11-测试与发版问题台账-2026-10.md` A3/A4/A6 + 10-08 勘误块）。**与任何旧文档/记忆冲突时以本文为准**；修正归因必须先在五格至少一格实机复测再改本文。

## §1 席位拓扑（id/键恒定，禁改名）

| 项 | 值 | 备注 |
|---|---|---|
| 顶级节 id | `dsh-family` | settings.section 席位；TL/guard/steward 三方注册值严格一致 |
| 顶级节 label | 「起子插件设置」（TL 用 `family.title` locale 键） | 三方一致；宿主导航据此渲染行 |
| 子席位 key | `dsh-family.tab` | kind `list`、scope `root`；每个贡献卡一个 entry |
| 节 order | 40 | 三方一致（次序不敏感，但保持一致便于 diff） |
| 贡献卡 entry | `{ name:'dsh-family.tab', id:<插件卡id>, order, label, locale }` | 经 `ctx.slots.inject('dsh-family.tab', factory)` 注册（§5-4） |

现存贡献卡（账本实测）：思考档位（TL）、会话守护门禁（guard）、搜索索引 + 会话管家（steward）、输入流量（IT）、网页搜索（free-search）、整洁显示（tidy-display）、CDP 浏览器（browser-cdp，仅 0.1.7 格）。

## §2 各代渲染面真表（2026-10-08 五格实证定案）

| 宿主线 | settings.section 声明时机 | 节壳谁渲染 | 卡数据面 |
|---|---|---|---|
| 0.2.0 | 宿主壳原生声明 | TL client 注册正座（native surface，renderSlot 优先） | TL modern ns `dsh-thinking-levels` |
| 0.1.7 | **设置面板打开时**壳声明 | 同上，client 工厂 fire（实机日志） | 同上 |
| 0.1.0–0.1.5 | 同样「面板打开即声明」 | 同上，client 工厂 fire（0.1.0/0.1.1/0.1.5 三格实机日志同现） | TL 服务端 `installLegacySection` ns 注册（beta.22）仍是卡数据出现在宿主 describe 的钥匙 |

**勘误声明**：2026-10-07 A6 所记「settings.section 在 ≤0.1.7 从未声明 / client 注册是死代码 / 宿主原生聚合节是真渲染面」**已被 10-08 复测推翻**——当时的「工厂零触发」是测量窗口问题（声明事件挂在面板打开上，未开面板就测=永远等不到）。宿主原生 describe 面在现构型下不是节壳渲染方。

## §3 单一归属：让位选举契约

**铁律：家族节全局有且只有一个所有者；所有者必须负责内容渲染。**

「有入口无内容」比不接管更差——接管者若不能渲染全家族贡献卡，必须连导航行一起退场（A4 必答项，本文落定）。

归属判定顺序（谁先落座谁拥有，不依赖注册顺序、不依赖 priority 遮蔽）：

1. **TL**（正座，缺省所有者）：工厂 fire 时查账本，已有 `dsh-family` 条目 → 退场；否则注册（带 children 声明，冲突降级为无 children）。
2. **guard**（第一兜底）：apply 期注册 settings.section inject（§5-1）；工厂 fire 后**延迟 500ms**（`FAMILY_YIELD_MS`）查账本——已有 `dsh-family`（TL 已落座）→ stand down；仍空（TL 缺席/落账失败）→ 注册接管，组件 `GuardFamilySection` 经账本 hooks 渲染全部贡献卡。
3. **steward**（第二兜底）：apply 后 2600ms 查账本，同 id 已在 → 静默放弃；否则接管（`StewardFamilySection`）。

**禁用的旧模式**：
- ⛔ 同 id 异 priority 遮蔽位选举——≤0.1.7 壳对遮蔽位**也各列导航行**，双注册=双「起子插件设置」行（guard 4.1.10 + TL beta.25 五格全现的事故）。
- ⛔ 宽限期后注册（grace-late）——工厂只在声明事件触发，声明（面板打开）过后注册的 inject 永远等不到下一次（guard 4.1.7/4.1.8 教训）。

## §4 贡献卡契约（新卡三问，全过才准进家族）

1. **注册在顶层吗？** 注册必须发生在 client apply 期（不能关在任何 inject 回调里——A2/A3 两代事故根因）。
2. **数据桥化了吗？** 卡数据走自家 webServer 桥（describe/mutate），不依赖 client settings 句柄（settingsScope 在 ≤0.1.5 是死路）。
3. **各代节体谁渲染？** 本卡不自渲染节体；节壳由 §3 所有者统一渲染，本卡只保证 component + inject 面在账本可取。

## §5 机制铁律（宿主行为，写卡/改节必读）

1. **inject 必须 apply 期注册**，工厂在「声明事件」（=设置面板打开）统一 fire，fire 顺序 = inject 注册顺序。
2. **注册必须经 `ctx.slots.inject` 包装管道触发**——裸 `slots.register` 的 entry.inject 在 ≤0.1.5 壳不解（EMPTY_INJECTED_PROPS），guard 4.1.5「半补位」真相。
3. **宿主 `bindInjectHooks` 剥掉 inject 面的 `hooks` 键**，转成 `use<Tab>` prop（0.1.0 起各代皆然）——组件读 `props.hooks.tabs` 必炸，必须读 `useTabs` 舱；组件需自带 useState+useEffect 订阅兜底（壳不传 useTabs 的代）。
4. **cordis inject 回调收 `(ctx, config)`**——服务按名从 scope 对象读（`scope.configForms`）；按裸参数调 `.get/.bind` = 每代 TypeError、纤维暗死（input-traffic 0.7.1 教训）。
5. **子席位声明冲突**：children 表被先到者占 → 去 children 重试重注册（账本是全局的，渲染等价）；同 id 同 priority 双抛 → 放弃。

## §6 组件与 UI 契约（节壳/卡通用）

- 节壳 props 面：`renderSlot? / useTabs? / hooks? / renderContributor? / tFallback?`；渲染降级链 `renderSlot → renderContributor`，tabs 数据 `useTabs → hooks 订阅兜底 → 账本直读`。
- tab 条 `flexWrap: nowrap + overflowX: auto`，按钮 `flex: 0 0 auto`——多卡不孤行（0.1.0 整洁显示孤行事故）。
- 控件配色：`background: var(--dsw-alias-bg-surface, rgba(127,127,127,0.12))` + `color: var(--dsw-alias-label-primary, inherit)` + `colorScheme` 按体亮度一次性探针——禁写死 `#fff`（暗色壳白控件事故）。
- `t` 解析链：宿主 prop → `tFallback`（locale bind 闭包）→ key 直返。

## §7 数据面契约

- **TL 双 ns**：modern `dsh-thinking-levels`（0.1.7+）/ legacy `thinking-levels`（≤0.1.6）；client 侧 `getSnapshot().status === 'unavailable'` 探测降级。
- **服务端 ns 注册**是卡数据进宿主 describe 的唯一钥匙（≤0.1.5 线靠 TL `installLegacySection`）；谓词只做 register 形状检测（describe 四代全在，禁用 describe→skip）、schema 禁 volatile、base 层禁活引用（三层叠 bug 史见台账 A6）。
- **写入纪律**：所有设置写入走宿主 `dsh-settings-file` 统一原子通道（writeFileAtomic：tmp `wx` + rename）；`settings.yaml.*.tmp` 是事实快照备份**禁清理**（A7 零化事故遗产）。

## §8 验收断言（回归闸，farm probe 用）

1. **导航行计数是去重硬断言**：`起子插件设置` 行数必须 = 1（diag 类工具 ROWS= 输出；includes 类文本断言测不出重复，禁作去重依据）。
2. **工厂日志是归因铁证**：TL 在场时 console 须出现 `settings.section factory fired` + `dsh-family already seated — stand down`（guard），且**禁出现** `family takeover registered`。
3. 内容断言：节体含全部在场贡献卡 label + TL 卡真数据（如「默认档位」），console 无 `slot entry crashed` / `Unhandled`。
4. 验收必须在部署产物上以无头浏览器点击穿越（stale-build 三防线：prepack + verify-package V6 + probe）。

## §9 版本账与变更史

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-10-07 | TL 4.2.0-beta.25 / guard 4.1.10 / IT 0.7.2 | T18 全链：五格家族节真数据（A6 首版归因，后被勘误） |
| 2026-10-08 | TL 4.2.0-beta.26（b1be6a2）/ guard 4.1.11（b03aaba） | T20-a：让位选举替代遮蔽位选举；五格单行验收；本契约 v1.0 立 |
