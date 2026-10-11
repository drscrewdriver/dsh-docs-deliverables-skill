# 通用聚合设置节 Playbook（generic-aggregation-section）

> 定位｜把 `family-tab-contract.md`（dsh-family 私有实例）中的**宿主机制层**抽出参数化，供任意「一组姊妹插件共享一个设置聚合节」的场景实例化。机制条目全部继承契约 v1.0 的五格实证与 VD 台账证据等级；本文不新增未证断言。
> 适用判断｜单插件自用设置 → 不需要聚合节，直接走三代设置面（dev §2）。≥2 个插件要在宿主设置页共享一个带 tab 的聚合节 → 用本文。
> 与私有契约的关系｜dsh-family 是本模板的**案例实例**（参数值见文末附录）；冲突时家族插件仍以 `family-tab-contract.md` v1.0 为准，本文服务新家族。

## 1. 实例化参数表（新家族开工前先填这张表，禁改宿主全局约定）

| 参数 | 含义 | 约束 |
|---|---|---|
| `familySectionId` | 顶级节 id（`settings.section` 席位） | 全体候选所有者**逐字一致**；小写连字符；定后禁改名 |
| `tabKey` | 子席位 key（贡献卡注入点） | kind `list`、scope `root`；一个家族一个，禁复用他族 |
| `sectionLabel` + locale 键 | 导航行文案 | 全族一致，locale 化走 9 语规范 |
| `sectionOrder` | 顶级节 order | 家族内一致即可（次序不敏感，一致便于 diff） |
| `ownerCandidates[]` | 所有者候选序列：`(插件, 探测延迟ms, 兜底优先级)` | **恰好一个最终所有者**；延迟错开（先例 0/500/2600ms） |
| `dataBridge` | 卡数据通道 | 一律自家 webServer 桥（describe/mutate），**禁止**依赖 client settings 句柄（settingsScope ≤0.1.5 死路，VD-016-017-02） |

## 2. 机制铁律（宿主行为，与家族 id 无关——VERIFIED/FARM 沿契约引注）

1. **注册在 apply 期顶层**：inject 工厂只在「声明事件」（设置面板打开）统一 fire，fire 顺序=注册顺序；声明过后再注册的 inject 永远等不到（宽限期后注册=死代码，guard 4.1.7/4.1.8 事故）。
2. **必须走 `ctx.slots.inject` 包装管道**：裸 `slots.register` 的 `entry.inject` 在 ≤0.1.5 壳不解（EMPTY_INJECTED_PROPS，「半补位」真相）。
3. **宿主剥 inject 面 `hooks` 键转 `use<Tab>` prop**（0.1.0 起各代皆然）：组件读 `props.hooks.tabs` 必炸；需 `useTabs → hooks 订阅兜底 → 账本直读` 三级降级链（契约 §5-3/§6；命名 bindInjectHooks 本身 UNVERIFIED，机制经复测定谳）。
4. **cordis inject 回调收 `(ctx, config)`**：服务按名从 scope 读（`scope.configForms`）；按裸参数调 `.get/.bind` = 每代 TypeError、纤维暗死（input-traffic 0.7.1 教训）。
5. **宿主对同 id 多注册不去重**：≤0.1.7 壳对同 id 遮蔽位**各列导航行**（双行事故）——去重只能插件侧做，见 §3 选举。
6. **设置节渲染面按代分派**：0.2.0 壳原生声明；0.1.7 面板打开时声明；≤0.1.5 「面板打开即声明」同样成立但渲染者=插件 owner（契约 §2 五格定案；勿信「≤0.1.5 死代码」旧归因，§2 勘误块）。

## 3. 通用让位选举协议（从 TL→guard→steward 抽象）

```
账本 = familySectionId 在顶级节注册表中的占位（全局可查）
每个候选 owner 在 apply 期注册 settings.section inject；工厂 fire 后：
  await delay(OWNERS[candidate].probeDelayMs)          // 候选间必须错开
  if (账本已有 familySectionId) → stand down（连导航一起退场）
  else → 注册接管，组件必须渲染全部在场贡献卡
```

- **铁律**：全局唯一所有者，且所有者必须负责内容渲染——「有入口无内容」比不接管更差（契约 §3/A4 必答项）。
- ⛔ 禁用旧模式：同 id 异 priority 遮蔽位选举（宿主不去重，必现双行）；宽限期后注册（§2-1）。
- children 声明冲突降级：被先到者占 → 去 children 重试重注册（账本全局，渲染等价）；同 id 同 priority 双抛 → 放弃（契约 §5-5）。

## 4. 贡献卡准入三问（任何新卡进任何家族，全过才准）

1. 注册在 client apply 期**顶层**吗？（不关在任何 inject 回调里）
2. 数据**桥化**了吗？（§1 dataBridge；不碰 settings 句柄）
3. 各代**节体谁渲染**？（本卡不自渲染节体，只保证 component+inject 面在账本可取）

## 5. 组件与 UI 通用契约

- 节壳 props 降级链：`renderSlot → renderContributor`；tabs 数据 `useTabs → hooks 订阅 → 账本直读`（壳不传 useTabs 的代需组件自带 useState+useEffect）。
- tab 条 `flexWrap: nowrap + overflowX: auto`、按钮 `flex: 0 0 auto`（多卡孤行事故）。
- 配色只用宿主令牌：`var(--dsw-alias-*)` + `colorScheme` 按体亮度探针；禁写死颜色（暗壳白控件事故）。主题检测按 `body[data-ds-dark-theme]` 属性契约（非 class）。
- `t` 解析链：宿主 prop → `tFallback`（locale bind 闭包）→ key 直返。

## 6. 验收断言（任何家族/任何线，全绿才算装配完成）

1. 导航行计数 `ROWS(familySectionId) == 1`（**includes 类文本断言禁作去重依据**）。
2. 工厂日志归因：在场非所有者必须打出 `stand down`，禁出现 `takeover registered`。
3. 节体含全部在场贡献卡 label + 真数据；console 无 `slot entry crashed`/`Unhandled`。
4. 必须在**部署产物**上无头浏览器点击穿越（stale-build 三层防线：prepack + verify-package V6 + probe）。

## 7. 跨代适配指针（不重述，查 VD 卡）

设置面三代分派=peer-adapt VD-016-017-01 / 表格单卡头=VD-017-020-02 / hooks 剥键=VD-017-020-03 / 槽位改名静默失效=VD-015-016-02 / settingsScope 死路=VD-016-017-02 / volatile 断代=VD-015-016-04。逐线槽位名先查 `host-matrix.yaml` client 卡片面列（FARM 级，裁决用途需干净格复测）。

## 附录：dsh-family 实例参数（案例，勿当通用值抄）

`familySectionId='dsh-family'`；`tabKey='dsh-family.tab'`；label「起子插件设置」(locale `family.title`)；order 40；候选序列 TL(0ms 正座)→guard(500ms `FAMILY_YIELD_MS`)→steward(2600ms)；数据桥=各家 webServer describe/mutate；TL 卡数据面另带双 ns 迁移（modern `dsh-thinking-levels`@0.1.7+ / legacy `thinking-levels`≤0.1.6，属该卡私有史，非通用要求）。
