> 溯源｜10-跨版本设置适配手册 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# 10 - 跨版本设置适配手册:三代 waist 与无设置页兜底

> 来源:dsh-free-search compat-legacy 分支(0.8.1→0.9.19)全程实操复盘。
> 覆盖宿主:0.1.0-rc.8 / 0.1.1-rc.2 / 0.1.2-rc.1 / 0.1.5-rc.3 / 0.1.7-rc.2 / 0.2.0-rc.2(farm 3081~3090)。
> 所有结论均farm 实测或读宿主包源码证实,非推测。

## 0. 结论速览

宿主的设置注册 API 有**三代**,插件必须做特性检测分派(禁止读版本号):
宿主设置面按线分布不均——**0.1.2+ 才有设置页 UI;0.1.0/0.1.1 壳里根本没有设置页**,任何插件都无法在宿主设置页渲染卡片,配置 UI 只能自带(浮窗/命令)。

## 1. 三代 settings waist 决策表(检测点互斥)

| 宿主线 | 判定特征 | host 侧注册 | client 卡片面 |
|---|---|---|---|
| 0.1.0-rc.x / 0.1.1-rc.x | 模块级 `installSettingsSection` + `settingsNamespace` 存在(`@deepseek-ai/dsh-settings` 具名导出) | `legacy.settingsNamespace(NS)` + `legacy.installSettingsSection(ctx, ns, Config, base, {setSource, onChange})` | 宿主壳无设置页 → 自带浮窗(§4) |
| 0.1.2-rc.1 / 0.1.5-rc.x | settings **服务实例**带 `installSection` 方法(`typeof sctx.settings.installSection === "function"`);模块级两者皆无 | `sctx.settings.installSection(ctx, NS, Config, base, hooks)` | 宿主设置→插件 tab 按 ns 派发 `settings.plugin.item` 卡(见 §3.5) |
| 0.1.7-rc.1+ / 0.2.0-rc.x | 两个注册 API 均被 rc.1 移除(#40 实锤) | 什么都不注册,`sctx.settings.configure({auto:false})` 声明自带设置页;Config 走 loader `.volatile()` | `plugins.row.config` / `plugins.bundle.config` 槽 |

代码骨架(每分支独立 try,见 §3.3):

```js
ctx.inject(["settings"], (sctx) => {
  if (typeof sctx.settings.installSection === "function") {
    sctx.settings.installSection(ctx, NS, Config, resolveConfig(config), {
      setSource: (source) => { current = () => resolveConfig(typeof source === "function" ? source() : source); },
      onChange: () => refreshPrompt?.(),
    });
    return;
  }
  void (async () => {
    try {
      const legacy = await import("@deepseek-ai/dsh-settings");
      if (typeof legacy.installSettingsSection === "function" && typeof legacy.settingsNamespace === "function") {
        legacy.installSettingsSection(ctx, legacy.settingsNamespace(NS), Config, resolveConfig(config), { /* 同上 hooks */ });
        return;
      }
    } catch { /* 落到 rc.1 */ }
    sctx.effect(() => sctx.settings.configure({ auto: false }, ctx.fiber));
    // rc.1 专属:settings.yaml 迁移、document-updated 刷新等只放这里
  })();
});
```

## 2. 宿主槽位清单(实测枚举,2026-10-07)

- **0.1.0-rc.8 / 0.1.1-rc.2**(两者一致):`root, sidebar, sidebar.settings, sidebar.footer.action, settings.trigger, settings.section, settings.general.item, settings.plugin.item, settings.plugins.tab, settings.header, settings.action, settings.close, settings.onboarding, shell.overlay, conversation.*(`conversation.input.dock/left/right/model/overlay/plan/attachments`、`conversation.composer(.bar/.dock)`、`conversation.view`、`conversation.session.header(.actions/.lineage/.utilities)`、`conversation.chat.*`、`conversation.message.images`、`conversation.hero.*`、`conversation.details.tool`、`conversation.session`), `details, tool.view.cordis, tool.call.toolview`
  - **但壳里没有设置页触发器**:全 DOM 无「设置」入口(侧边栏也没有)——settings.* 槽无渲染宿主,纯属休眠。
- **0.1.2/0.1.5/0.1.7/0.2.0**:有设置页;0.1.7-rc.2 与 0.2.0-rc.2 的 plugin-manager 槽渲染位逐字一致:`plugins.item`(仅官方卡片头,第三方注册=死代码)、`plugins.bundle.config`(bundle 详情页 config 区)、`plugins.row.config`(行详情 summary+page)。
- **0.2.0 独有标记**:外层容器 div 带 `data-plugin-config`;0.1.7 没有(CSS 选择器勿依赖)。

## 3. 陷阱清单(全部踩过,按代价排序)

### 3.1 installSection 的 base 参数必须先 resolveConfig
0.1.2+ 的 loader 传给 apply 的 config 字段是**字段级活引用对象**;installSection 内部按 schema 校验 base,直接透传必炸 `ValidationError: $.provider expected string but got [object Object]`,且 cordis 会**静默吞掉** inject 回调异常(namespace 没注册、无任何日志)。base 传 `resolveConfig(config)` 解包后的普通值。

### 3.2 bridge/describe 出口必须解包
≤0.1.5 的 `settings.describe()` 值是活引用(字段级 ref 对象),client 拿到无法用。bridge 出口统一 `resolveConfig()` 一遍(rc.1+ 纯值原样透传,双代无害)。

### 3.3 plugin-level inject 缺服务 = 整段 apply 静默死
`inject=["slots","commandUi"]` 里若某线没有 commandUi,**整个 client apply 不执行**(卡片/命令全灭,无日志)。正确姿势:顶层只放六线通用服务(slots/locale),代际服务用 **scoped 子 inject**(`ctx.inject(["configForms"/"settingsScope"/"commandUi"], ...)`,缺席线自动 pending 不阻塞)。再加 per-surface `safe(tag, fn)` try 包裹 + `console.warn`(可达 start.log;cordis logger.warn 不一定达)。

### 3.4 家族页(dsh-family.tab)必须走完整 locale 契约
容器=dsh-thinking-levels(渲染于模型选择器)。两次翻车:裸字符串 label → 污染插件清单页;用了 ctx.locale 但顶层 inject 没加 "locale" → web boot 直接挂("1 entry did not activate")。**完整契约**:顶层 inject 含 `"locale"` + `ctx.locale.register(NS, {zh:{...},en:{...}})` + `const t = ctx.locale.bind(NS)` + slot 声明 `locale: NS` + `label: () => t("family.title")`。另外:整卡塞族面可能过重(free-search 实测可控,但重构时注意)。

### 3.5 ≤0.1.5 插件配置 tab 的派发条件 = 交集
`settings.plugin.item` 卡要被派发,需 **宿主 served namespaces ∩ 已注册卡**,且 slot `key` 必须等于 namespace(NS),ns 还要 bind 进 client 侧 settingsScope。三者缺一卡就不出现(无任何报错)。

### 3.6 bundle 详情页平铺卡置底(子开关之下)
宿主固定渲染 [bundle.config 区]→[组件行区],槽位挪不动。用 `:has()`+flex order 置底,且**选择器必须泛化**(0.1.7 外层 div 无 0.2.0 的 data-plugin-config 标记):

```css
div:has(> section[data-plugin-config] .dshfs-card){display:flex;flex-direction:column}
div:has(> section[data-plugin-config] .dshfs-card) > section[data-plugin-config]{order:2}
div:has(> section[data-plugin-config] .dshfs-card) > section[data-plugin-rows]{order:1}
```
其它插件页面零影响;不支持 :has() 的内核降级为卡片在上。

### 3.7 schemastery volatile 与嵌套旧版
`.volatile()` 需 >=3.18.2;启动时 assert(schemastery 具备 .volatile),依赖声明用 `^3.18.4`(让 pnpm 给插件嵌套正确版本),防御宿主作用域解析到旧版(经典报错 `z.string(...).volatile is not a function`)。

### 3.8 file: 依赖双重陷阱
① 同路径重打包**不改包内版本** → pnpm 视为已满足直接跳过(改文件名也没用);② 删旧 tgz 前必须先把各 profile 的 dep 改指新文件,否则该 profile 所有 pnpm 命令 ENOENT。正解:bump 包内版本 → 先改 dep → pnpm add。

## 4. 无设置页宿主(0.1.0/0.1.1)兜底模式

宿主壳没有设置页 → 插件自带 UI 的唯一通用挂点是 **`shell.overlay`**(壳级 overlay,两线都有)。模式:固定定位小齿轮按钮(避开宿主底部状态条,bottom 64px)+ 固定定位浮层(背板遮罩+✕关闭)承载整卡。配置存储全在 host 侧(settings 服务/bridge),浮层与宿主设置页解耦。实测 0.1.0-rc.8/0.1.1-rc.2:齿轮→整卡→改值→保存持久化全通。
辅助面:`/命令` commandUi 在 0.1.0/0.1.1 存在(壳有「命令」按钮),可做引擎快切。

## 5. 部署与验证协议(farm 六线)

部署(profile 根):① 先改 package.json dep 指向新 tgz(§3.8)→ ② `pnpm add file:<tgz> --ignore-workspace-root-check`(env `npm_config_ignore_workspace_root_check=true` 双保险)→ ③ `dsh.profile.bundles` 名单含包名 → ④ `farm.mjs stop/start <v>`(防 EADDRINUSE 僵尸:stop 后 netstat 验端口释放)。
探针:token→303→cookie(≤0.1.1 裸 200 无鉴权);**bridge 路由全 POST**(GET 405);建议插件自带 `debug-generation` 诊断路由(返回 waist 判定+注册结果,模块级 state 存、路由读)。浏览器验 UI 时注意:**宿主重启后 token 变,旧 token 页面=空白**(易误判为代码故障)。

## 6. 八插件 0.1.0/0.1.1 设置适配审计(2026-10-07)

| 插件 | 0.1.0/0.1.1 配置层 | 设置 UI | 判定 |
|---|---|---|---|
| dsh-free-search 0.9.19 | ✓(模块级 legacy) | ✓ shell.overlay 浮窗齿轮+整卡(实测) | **好(本次修补)** |
| dsh-input-traffic 0.7.0 | N/A(纯 client 接管,无自有 Config;busyEnter apply 时钉死) | 不需要 | 好 |
| dsh-arrowkey-nav | 无自有设置面(keyboard-nav) | 不需要 | N/A |
| dsh-date-wrapper | 极简(date 快照,配置走 patch) | 无 | N/A |
| dsh-paste-dock | ✓ volatile 线(patch/宿主侧) | ✗ settings.general.item 休眠(宿主无设置页);核心粘贴功能不依赖配置 | 半好(够用) |
| dsh-session-steward 0.5.x | ✓ volatile 线 | ✗ settings.section+family tab 休眠(无设置页/无 family 容器);steward 面板自身入口待查 | 半好(够用) |
| dsh-tidy-display 0.2.4-beta.5 | ✓(宣称 0.1.0-0.2.0) | ✗ family tab 休眠(容器 thinking-levels 不装 0.1.0/0.1.1);阅读视图等核心不依赖 | 半好(够用) |
| dsh-perm-gate 4.2.1 | **缺口**:rc.1-only 注册路径(9 处 configure/volatile,无 legacy 分支);0.1.5 实锤 `settings namespace "dsh-perm-gate" is not registered`(种子写入失败) | ✗ | **修补中**(compat-legacy 分支:存储层 register+retry 已落地 @5.1.1-compat.1 0e26c5a 并实测;UI 层规划见 §8) |

> 建议优先级:perm-gate 若宣称支持 ≤0.1.5 → 按 §1 骨架补 legacy 分支;其余「半好」插件在宿主设置页存在的 0.1.2+ 均正常,0.1.0/0.1.1 如需 UI 参照 §4。

## 7. 复用检查单(下次跨版本适配照抄)

1. peers:15-rc 全枚举(见任一已适配插件 package.json);拆 `engines.dsh` 栅栏;`compatibility.dshReleases` 全量。
2. host:三代 waist 骨架(§1)+ base resolveConfig(§3.1)+ 出口解包(§3.2)。
3. client:顶层 inject 只放通用服务;每面 safe 包裹(§3.3);族面走完整 locale 契约(§3.4);老设置页卡 key=NS+settingsScope.bind(§3.5)。
4. 无设置页线:shell.overlay 浮窗(§4)。
5. 部署 §5;验证:farm 六线 describe 值类型(须为纯字符串)+ mutate 回环 + 探针路由 + 浏览器卡片展开。

## 8. 家族 section(起子插件设置)生态图(2026-10-07 盘点)

容器 = dsh-thinking-levels(FamilySettingsSection,peers `>=0.1.7-rc.1 <0.1.8`)→ **族面只存在于 0.1.7-rc.1+/0.2.0**;0.1.0-0.1.5 无此面,老线的插件设置需自带入口(§4)。

贡献 tab 的插件注入方(`slots.inject("dsh-family.tab")`)与各自跨版本状态:

| 插件 | 家族 tab | peers 覆盖 | 判定 |
|---|---|---|---|
| dsh-tidy-display | ✓ | 15-rc 全枚举 | 跨版本 ✓ |
| dsh-input-traffic | ✓ | 15-rc 全枚举 | 跨版本 ✓ |
| dsh-session-steward | ✓ | 15-rc 全枚举 | 跨版本 ✓ |
| dsh-free-search 0.9.16+ | ✓ | 15-rc 全枚举 | 跨版本 ✓(老线由 shell.overlay 浮窗补位) |
| dsh-bash-terminal-ts | ✓ | 仅 0.1.7-rc | 未跨版本 |
| dsh-browser-cdp | ✓ | 分线分版本:0.16.x=0.1.5 / 0.17.x=0.1.7 / 0.18.x=0.2.0(engines 每线 range 栅栏) | 跨版本 ✓(三线分治流派,0.1.0/0.1.1/0.1.2 未覆盖) |
| dsh-session-guard | ✓ | 仅 0.1.7-rc | 未跨版本;但采用 0.1.7/0.2.0 分线双版本策略(3.x/4.x),10-02 已发 0.1.7 线 3.2.5 含 bundle.config 平铺卡 |
| dsh-search-index | ✓ | 仅 0.2.0-rc | 未跨版本(0.2.0-only) |
| dsh-brief-sidebar / dsh-mcp-registry | ✓ | 未跨版本 | 未跨版本 |
| (容器自家「思考档位」卡) | 容器自带 | 仅 0.1.7+ | — |

注意:家族注入方即便不做 15-rc 枚举也不算错——族面只在 0.1.7+ 存在;真正的考题是**该插件在 0.1.0-0.1.5 上有没有别的设置入口**(无则配置只能 patch,参照 §4 浮窗模式)。

### 8.1 两种跨版本流派对比(以 dsh-browser-cdp vs dsh-free-search 为样本)

| | 分线分版本(dsh-browser-cdp) | 单版本全枚举(dsh-free-search/date-wrapper) |
|---|---|---|
| 形态 | 每条宿主线一个版本段:0.16.x=0.1.5、0.17.x=0.1.7、0.18.x=0.2.0,engines+peers 按线绑定 | 单包 15-rc peers 枚举,拆 engines 栅栏 |
| 用户侧 | 必须选对线的版本段(选错=装不上/不匹配) | 一个版本通吃 |
| 维护侧 | 每线独立 cherry-pick/发版(49 版里三线并存) | 单点维护+枚举成本+全量矩阵回归 |
| settings 适配 | 每线代际分别处理(0.1.5 线 peer 键集与 0.1.7+ 不同,renderer 键不存在) | 三代 waist 特性检测(本手册 §1) |
| 适用 | 功能在老线语义差异大、或宿主 API 断代严重 | 功能跨线同构、希望用户零选版 |
browser-cdp 现状(2026-10-07):0.18.21(0.2.0)/0.17.25(0.1.7)/0.16.24(0.1.5,npm 仅 2 版=刚起步);0.1.0/0.1.1/0.1.2 无版本段。web 生产装 0.17.4 落后线内最高 21 个 patch,desktop 0.18.20 落后 1。

## 8. perm-gate 跨版本适配完整规划(compat-legacy 续作,2026-10-07 定稿)

现状:peers 已 15-rc ✓;存储层 register+retry 自门控已落地(0.1.5 实测 registered+seeded);UI 层缺失(0.1.5 设置页无 perm-gate 区块,0.1.0/0.1.1 壳无设置页)。

**Phase 1 — 0.1.2/0.1.5:installSection 一体化(host 侧小改,存储+UI 一次解决)**
- settings inject 里 register+retry 升级为 `svc.installSection(ctx, ENTRY_ID, Config, resolveConfig(config), { setSource, onChange: reloadRuntime })`
- installSection 内部已含 register(存储保持修复)且在 设置→插件 渲染**原生 schema 表单**——「自动审查门」在老线的替身,client 零改动
- rules 字段 watcher 从 document-updated 改挂 onChange(或并存)
- 验收(3085):设置→插件 出现 perm-gate 表单/改字段落盘/rules 路由反映/权限行为无回归

**Phase 2 — 0.1.0/0.1.1:模块级注册覆盖(配置可用,明示无 UI)**
- `legacy.settingsNamespace(ENTRY_ID)` + `legacy.installSettingsSection(...)`(free-search §1 同款)
- 壳无设置页 → 表单无渲染面,配置走 patch/rules 文件;验收:boot 无种子报错、describe 列出 ns

**Phase 3(可选,风险中)— 0.1.0/0.1.1 UI**
- shell.overlay 浮窗承载 perm-gate 自己的卡片;卡片数据层需加 settingsScope 分支(configForms→settingsScope,动审批面 client)——独立小步分支,不与 Phase 1/2 混车

不做:0.1.0/0.1.1 原生表单(宿主无页面可渲染)。

## 9. compose 悬案告破:dsh.client.inject 空数组 = client 永不编组(2026-10-07)

**现象**:dsh-browser-cdp 的 client.js 在所有宿主线上都只躺在 node_modules,从未被聚合、拉取、执行——无槽位注册、无日志、无 UI(家族 tab/齿轮/平铺卡全灭)。

**根因**:0.2.0 线重构把 `dsh.client.inject` 清成了 `[]`。宿主的插件 client 聚合规则:**`dsh.client.inject` 非空才把该插件的 client.js 编入 `/plugins/??...` 插件聚合**(任意条目即可,如 `["@deepseek-ai/dsh-client-locale"]`);空数组 = 视为无浏览器半,永不编组。文件被静态服务(/plugins/<pkg>/client.js 直接 200)与「被编组执行」是两回事。

**验证**:manifest 补回 inject → 重启 → 页面拉取的插件聚合(1.7MB)出现完整 browser-cdp 段 → 家族页挂出「CDP 浏览器」tab(整卡渲染)——该插件 client 半边首次在任何线上工作。

**排查方法论**:①页面 performance entries 里找 `/plugins/??` 聚合 URL(注意排除主应用包与单插件文件);②fetch 聚合内容 grep 插件段标记;③注意 transferSize 是压缩后、text 是解压后;④宿主重启后 token 变,旧 token 页面空白易误判为代码故障。

**遗留**:≤0.1.5 的设置页卡片派发(settings.plugin.item 多卡互斥)与 ≤0.1.5 齿轮(settingsScope.bind 静默失败嫌疑)仍未根因——需要浏览器 console(当前 IAB webview wedged)或对 0.1.5 宿主 client-runtime 的 settingsScope 提供方源码深读。

## 10. §9 悬案告破:0.1.5 卡不派发的真根因=stale-build 部署事故(2026-10-07 深夜,T10b 定案)

§9 结尾的「≤0.1.5 卡片派发与齿轮未根因」已实测告破。**结论反直觉:三层架构假设(H1 时序/H2 setSource/H3 孤儿实例)全部死刑,代码从头到尾是对的,错在部署产物。**

### 10.1 证据链(0.1.5-rc.3 @ 3085 实测)

1. **identitySame 实证(H3 死刑)**:给 perm-gate 加临时诊断端点 `GET /api/dsh-perm-gate/debug-generation`,返回它经 `ctx.inject(['settings'])` 拿到的 settings 实例的全量 describe ns 列表——**`dsh-perm-gate` 在列**(连同 session-guard/web-search-free 等全部插件)⇒ 拿到的就是宿主共享单例,不存在孤儿注册表。
2. **差分否证(_child-scope 变体)**:session-guard 走完全相同的 `ctx.inject(['settings'])+service.installSection(ctx, NS, …)` 路径,其卡在 0.1.5 正常派发——同路径同结果,child 作用域假设不成立。
3. **nested dsh-settings 硬钉六线运行时全部无效**:0.1.5 线 legacy 分支互斥不可达(nested 副本从未加载);各格 profile store 里 0.1.1-rc.2 物理悬空(pnpm 链接存在但目标不存在),legacy 动态 import 实际经 node 向上解析**落到宿主自身副本**(0.1.0/0.1.1 start.log 命中 module.installSettingsSection 即证——若落到 0.2.0-rc.2 该分支必失败)。硬钉只剩安装重量与审计噪音,改 optional peer 安全且更正确(T35)。
4. **H2 死刑**:宿主 installSection(dsh-settings@0.1.5 lib/index.js:327-343)在 register 后同步调 `hooks.setSource(() => scope.get())`——若抛错插件加载即失败;实测 ns 在列+无失败签名+__pgSurf 干净,未发生。
5. **H1 死刑**:describeFace 在 document commit/reconnect 时刷新+控制器订阅槽账本变化重发布(client.js:1117-1126「a card registered late joins here」),且插件注册先于客户端首拉。
6. **决定性一步——用全新 build→pack→add 的 diag.1 重部署后,CDP 点击穿越(设置→插件→插件配置)实测:perm-gate 卡已派发**,渲染的正是 undefined-scope 守卫占位。此前 compat.3「卡不派发」的观测与 stale tgz 时间线吻合。

### 10.2 事故机制:npm pack 不跑 build

`npm pack` 只触发 `prepack`,**不触发 `prepublishOnly`**;仓里配了 `prepublishOnly: npm run build` 给了虚假安全感。手工 `npm pack` 打出的 tgz 是**上一次 build 的 lib**——源码改了、构建没跑、包照打、部署照装、冒烟照绿(HTTP 探针只证明进程活着,不证明 UI 行为),于是「源码已修、实测定罪」的冤案成立。本案 stale tgz 被部署到全部五格并跨两轮测试,直到全新构建的版本重部署才揭穿。

### 10.3 防线(已落地)

1. **prepack 注入(T5)**:build 型仓统一 `prepack: npm run build`——pack 即 build,从机制上消灭 stale(已注入 perm-gate/steward/bash-terminal-ts/browser-cdp/tidy-display/session-guard/OC;free-search 无 build 脚本不适用)。
2. **verify-package V6 闸**(`--repo <dir>`):a) tgz 内 lib 与仓内 lib 逐字节对比;b) 仓内 src 最大 mtime vs lib 最大 mtime——「改了 src 没 build」直接 FAIL(负向自测已验)。
3. **部署产物实测验收纪律**:HTTP 冒烟绿≠UI 正确。**UI 断言必须在部署产物上用无头浏览器实测**——`_tools/browser-probe.mjs`(零依赖裸 CDP,`--farm <版本>` 自动取格 token URL,selectors/text/evaluate/console 四类断言)专为此而生;卡类插件的验收清单必须含「卡标题文本在插件配置 tab 出现」断言(点击穿越样例见 `_tools/_diag-015-card.mjs`)。
4. **farm start 也清孤儿 lock**:smoke 杀树会留下孤儿 settings.yaml.lock,下一次 start 的 atomic-write 全线超时(2026-10-07 mutate 首测撞上)——`farm.mjs` cmdStart 已加 pre-clean(与 cmdStop/smoke 同款)。

### 10.4 方法论沉淀

- **悬案优先做「决定性差分」**:找同生态里行为相反的实例(free-search/session-guard 卡活)做路径逐段对比,比直接修嫌疑点便宜一个数量级——本案的差分一步就把 H3 的 child-scope 变体判死,避免按字面实施 F1/F2/F3' 三个无用修复。
- **诊断端点是最便宜的服务端探针**:在自家 webServer 挂一个只读 GET 端点返回内部状态(如 settings 实例的 describe 列表),比猜测+看日志强——用完即删。
- **「未证实」≠「不存在」**:0.1.5 上卡一直能派发,只是从来没被正确的包验证过;把「派发失败」当环境假设前,先排除部署链。
