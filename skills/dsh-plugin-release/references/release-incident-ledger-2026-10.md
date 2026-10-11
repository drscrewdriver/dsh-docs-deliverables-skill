>= 阅读指引｜A6 必须与 family-tab-contract.md §2/§5 勘误块同读，冲突时契约 v1.0 优先。⚠️ 条目已抽入 peer-adapt gate-checklist。

# 问题台账 — 六线跨版本适配与发版流水线（2026-10 场次）

> 收录 2026-10-05 ~ 10-07 农场整合测试、perm-gate M2 试点、thinking-levels 补位检查中发现并处置的全部问题。
> 每条四栏：现象 / 根因 / 修复 / 预防。标 ⚠️ 的是「不看源码必复发」级。
> 关联：`10-跨版本设置适配手册`（§9/§10 已收录 stale-build 与 inject 空数组两案，本文是全场总账）。

## A. 跨版本适配类

### A1. ⚠️ stale-build 部署事故（本季最大冤案，翻案三次）
- **现象**：0.1.5「设置卡不派发」、0.1.7「节空白」、0.1.2「卡缺席」三桩悬案，源码改了、冒烟绿了、UI 就是没反应；且跨多轮测试全绿。
- **根因**：`npm pack` 只触发 `prepack`、**不触发 `prepublishOnly`**——仓里配了后者造成虚假安全感，手工 pack 打出的 tgz 永远是上一次 build 的 lib，部署五格全是旧代码。
- **修复**：三层防线——①8 个 build 型仓注入 `prepack: npm run build`；②verify-package 增 V6 闸（V6a tgz lib↔仓内 lib 逐字节 / V6b src mtime vs lib mtime，负向自测已验）；③验收必须 browser-probe 在部署产物上跑 UI 断言。
- **预防**：任何「源码已修、实测定罪」结论先跑 V6；HTTP 冒烟绿 ≠ UI 正确。

### A2. ⚠️ settingsScope 子注入在 ≤0.1.5 永不 resolve
- **现象**：卡/注册逻辑关在 `ctx.inject(['settingsScope'])` 回调里的，在 0.1.0~0.1.5 上整体静默缺席（fiber 永久 PENDING）。
- **根因**：该服务虽在 0.1.5 client-locale 有 provide，但 `bind()` 返回的 scope `status:"unavailable"` 永不就绪（数据死路）；且注入回调形态在部分线根本不 resolve。
- **修复**：注册全部提到 apply 顶层（free-search/perm-gate 同款纪律），scope 走 `scopeRef` 活引用（回调解到就填，卡 inject 现读）；数据面走自家 webServer 桥（describe/mutate），与 settings 句柄彻底解耦。
- **预防**：插件级 inject 只留通用件（slots/locale）；任何 durable-settings 面一律 scoped sub-inject + 顶层注册二段式。

### A3. ⚠️ 家族节（dsh-family.tab）贡献卡三层空白（M3 立项根因，本次实锤两层）
- **现象**：≤0.1.5 上「起子插件设置」节导航在、内容全空白——thinking-levels 在场/移除（接管选举）都一样。
- **根因（已实锤两层）**：
  1. **贡献卡层**：input-traffic 的 family.tab 注册关在 onScope 回调里（=A2 变体），卡从未进账本。→ **已修**（input-traffic 0.7.1，779ec16：注册提顶层+scopeRef+卡降级守卫）。
  2. **托管节体层**：thinking-levels 的家族节是 **configForms 独占面**——`registerModernSurface()`（含 settings.section dsh-family）只在 configForms 分支调用；≤0.1.5 的 settingsScope 分支只注册 legacy 插件配置卡，**从不提供节体**。0.1.5 导航里的「起子插件设置」实际来自 session-guard 接管选举（id=dsh-family），其内容层在老壳上仍缺位。→ 未修（M3 T18 本体）。
- **修复方案（TL 侧，待实施）**：①节体按代降级——settingsScope 分支也注册节，但节组件自备 `t`（ctx.locale.bind 闭包）且贡献者 tab 改「自读账本直渲染」（0.1.5 壳不传 renderSlot/useTabs，宿主 owner props 是 0.1.7+ 才有的）；②或全量桥化重建（perm-gate 配方）；③brief-sidebar 的 `betterSidebar` 插件级 inject 有缺席 pending 风险，转 scoped；steward 卡数据层 configForms/settingsScope 双面绑死，需桥化。
- **预防**：新插件做「家族贡献卡」时三问——注册是否在顶层？数据是否桥化？节体在 ≤0.1.5 谁渲染？

### A4. 接管选举只救导航壳（半补位）
- **现象**：thinking-levels 移除后「起子插件设置」导航不消失（session-guard 接管，id=dsh-family 沿用节名），但内容空白。
- **根因**：接管选举的设计只覆盖节注册，内容责任未定义。
- **修复**：M3 T17 契约新增必答项——**胜出接管者须同时负责内容渲染，否则应连导航一起退场**（「有入口无内容」比不接管体验更差）。
- **预防**：跨插件接管/选举逻辑进契约文档，禁止隐式补位。

### A5. ⚠️ dsh.client.inject 空数组 = client 整体不编组
- **现象**：browser-cdp 1.1.2 的 client.js 在所有线上躺在 node_modules 从未执行（无 UI 无日志）。
- **根因**：宿主聚合规则=inject 非空才把 client.js 编入 `/plugins/??` 聚合；`[]` 视为无浏览器半。静态服务 200 与「被编组执行」是两回事。
- **修复**：manifest 补回非空 inject（1.1.3）。
- **预防**：verify-package V2 闸（inject 非空）；V3（inject 每项有 peer 背书）。

### A6 家族节渲染面归因修正：`settings.section` 在 ≤0.1.7 从未声明（2026-10-07 深夜）
- **现象**：TL beta.25 在 0.1.7 上家族节满血渲染（六 tab 全在），但 TL 自己的
  `settings.section` 工厂日志**零触发**（beta.25 加了工厂日志实证）；guard 4.1.10 的
  同键 inject 同样从不触发（0.1.0/0.1.7 双格实证）。0.1.0 终态出现**双「起子插件设置」
  导航行**（内容正确，导航重复）。
- **根因（归因修正）**：≤0.1.7 的设置壳上 `settings.section` 槽从未被声明——TL/guard/
  perm-gate 的 client `settings.section` 注册在这些线上是**死代码**（inject 工厂只在
  「声明事件」触发，未声明的键永远等到不了）。≤0.1.5 上实际渲染「起子插件设置」的是
  **宿主原生家族聚合节**（读 settings 服务 describe 驱动，ns 级 tab）：beta.22 的
  `installLegacySection` 服务端 ns 注册才是家族节亮起的真正钥匙；0.1.0 的双导航 =
  宿主原生节 + steward 的 client 接管节叠加。**当日 A3（家族节三层根因）的②层
  归需据此改写：数据层（服务端 ns 注册）为主因，client 注册层在 ≤0.1.7 是空转。**
- **伴生实证（有效机制，勿丢）**：① cordis inject 回调收 `(ctx, config)`，服务按名从
  scope 对象读（input-traffic 0.7.1 曾按裸服务调用=每代 TypeError，纤维暗死，0.7.2 修）；
  ② 宿主 `bindInjectHooks` 把 inject 面的 `hooks` 键**剥掉**转成 `use<Tab>` prop
  （0.1.0 起 各代皆然）——组件读 `props.hooks.tabs` 必炸（guard 4.1.5「半补位」的
  真相=接管节体从未渲染成功过），必须读 `useTabs` 舱；③ `ctx.slots.inject` 工厂只在
  声明事件触发→**任何"晚注册等下次声明"的接管/补注册模式在这些线上不可用**；
  ④ TL 服务端 `installLegacySection` 曾被 `describe→skip` 谓词废掉（describe 四代全在）
  + volatile schema 二代 register 不认 + base 层带 ref，三层叠bug（beta.18→22 逐层修，
  谓词只留 register 形状检测 + LegacyConfig 无 volatile schema + readVolatile 摊平 base）。
- **修复/处置**：outcome 层五格全绿（0.1.0/0.1.1/0.1.2/0.1.5 注册+家族节真数据，
  0.1.7 回归绿；用户目检 0.1.0+0.1.5 确认）。0.1.0 双导航 → 并入 T20（steward 接管
  与宿主原生节的去重）；guard 接管在 ≤0.1.7 惰性（无害死代码）→ 工厂触发条件待 T20
  一起钉。TL beta.25 / guard 4.1.10 / input-traffic 0.7.2 为当前格上版本。
- **⚠ 2026-10-08 复测勘误（T20-a 取证推翻本条两处归因）**：①「settings.section 在
  ≤0.1.7 从未声明/工厂从不触发」**不成立**——设置面板打开时壳**会**声明
  settings.section，apply 期注册的 inject 工厂全部照常 fire（guard 4.1.10 与 TL
  beta.25 的工厂日志在 0.1.0/0.1.1/0.1.5 三格实机同现；0.1.2/0.1.7 同构）。当时的
  「零触发」实证是测量窗口问题（声明事件挂在面板打开上，未开面板=等不到）。
  ②「宿主原生家族聚合节是 ≤0.1.5 的真实渲染面」**在本 batch 构型下不成立**——
  双「起子插件设置」行 = **guard 接管节 + TL 节双注册**（0.1.0 摘除 guard 实验：
  单行归位、TL 节独座满血；两行均宿主 nav 单元、内容全同）。steward 的 2600ms
  兜底与此无关（声明前 entries 为空 → register 落不进 nav）。TL 服务端 legacy ns
  注册（beta.22）依旧有效但不再是「唯一钥匙」。**双导航真根因**：≤0.1.7 壳的设置
  导航对同 id 异 priority 的遮蔽位**也各列一行**（「p10 恒阴影不占导航」假设死）。
- **T20-a 修复（2026-10-08，guard 4.1.11 b03aaba + TL 4.2.0-beta.26 b1be6a2）**：
  让位选举——guard 工厂 fire 后延迟 500ms 查账本，已有 dsh-family（TL 头位落座）
  → stand down；仍空（TL 缺席/落账失败）→ 接管（fallback 语义保留）。TL 侧对称
  加 entries 检查（宿主原生面/未来竞争者先落座则退场）。**五格验收：单行 +
  guard stand-down 日志全现 + 家族节内容满血**（0.1.1/0.1.7 实测 ROWS=1 含全
  tab 与 TL 卡真数据）。工厂触发条件（T20-c）随之钉死：声明事件=设置面板打开、
  inject 必须 apply 期注册、grace 后注册永不 fire。

### A7. ⚠️ client settings 句柄数据桥（T20-b：老线卡片数据/钉值死路 → webServer 桥）
- **现象**：纯 client 插件的持久数据面（卡片读数 + 启动钉值）骑在代际互斥的 client
  settings 句柄上——`configForms`（0.1.7+）可用，`settingsScope`（≤0.1.5）永不
  resolve（A2 死路）：老线上家族卡降级「设置服务不可用」，input-traffic 的
  busyEnter 钉值静默失效。
- **修复（分仓推进）**：① **dsh-perm-gate 5260fe6**（compat-legacy，2026-10-08）：
  T12 桥泛化——路由从 ns 派生（`bridgeRoutesFor`，client/server 两半各持同式、
  测试钉死一致），为同进程多 ns 各持一对端点铺路（10 测试，602 绿）。②
  **dsh-input-traffic 85a19b3**（main，0.7.3，2026-10-08）：桥移植——node 半区
  从 no-op 转正（loader `inject=['webServer']` + settings 子注入挂活引用），
  挂 `/api/ui-conversation/settings/{describe,mutate}`；client 半区
  BridgeDocHandle 双轨（原生句柄优先、桥兜底），钉值在原生缺席时由桥首拉
  ready 后补发一次（与原生臂竞态=同值幂等双写）；顺修 family-card 条件 hook。
  **前提实证**：0.1.0 宿主 settings 服务全款具备 describe/mutate/redactSecrets
  面（lib/index.js 直查），最老线无需 update() 兜底。
- **验收**：五格部署 0.7.3 后——四条桥线（0.1.0/0.1.1/0.1.2/0.1.5）家族卡真数据
  `busyEnter = queue`、降级语缺席（diag-t20b.cjs 点穿验收）；0.1.7 原生路径无
  回归；桥写回落盘确认（settings.yaml `ui-conversation.busyEnter`）。71 测试
  （+12）+ lint 绿 + verify-package ALL PASS。
- **待办**：steward 双 ns（会话管家+搜索索引）桥移植＝本泛化的下一站（T20-b
  原定主目标）；`farm start` 打印 token 与实例实际 token 曾不一致（实例在
  start 返回后重启过一次，机理未查）。
- **预防**：新插件凡有「老线也要活」的持久数据面，一律桥化（perm-gate/input-traffic
  两个成品先例），禁骑代际互斥句柄。

## B. 发版流水线类

### B1. ⚠️ prerelease 挂 latest 地雷
- **现象**：perm-gate 曾带 `publishConfig.tag=latest` + prerelease 版本——裸 publish 会把 beta 推上 latest。
- **修复**：publishConfig 改线 tag（compat）；verify V4 闸（prerelease 时 tag≠latest）。
- **预防**：发版前必跑 verify-package 全闸。

### B2. npm publish 输出文案不可信
- **现象**：`npm publish` 输出「with tag latest」，实际按 publishConfig 落了 compat——文案误导差点引发误判回滚。
- **修复**：以发布后 `npm view <pkg> dist-tags --json` 为准（rollback.md 已记纪律）。
- **预防**：publish 后 60s 内 view 404 属 CDN 传播延迟，勿重复 publish；复核 dist-tags 才算发版完成。

### B3. file: 同名重打包不认
- **现象**：同名 tgz 重打包后 pnpm add 不换内容。
- **修复**：铁律=重打包必 bump 版本（哪怕 patch 一位）；发版用 `./` 前缀路径（无前缀会被 npm 解析成 GitHub shorthand）。
- **预防**：流水线固定 bump→pack→verify 顺序。

## C. 农场/环境类

### C1. ⚠️ 孤儿 settings.yaml.lock
- **现象**：smoke 杀树/stop 后残留 lock，下次启动 atomic-write 全线超时（桥 mutate 首测撞上、插件列表 tab 卡死同源）。
- **修复**：farm.mjs 的 stop/smoke/start 三处 pre-clean cleanLocks。
- **预防**：任何「写设置超时」先查 lock。

### C2. 端口僵尸
- **现象**：taskkill /T 杀不掉宿主分离的 web listener → smoke 被迫 A-zero 回退、测到旧代码。
- **修复**：killByPort 按 netstat 反查 PID 补杀 + smoke 结果带 zombie 字段。
- **预防**：boot 前端口清场已入 smokeCell。

### C3. ⚠️ .pnpm 超长 cwd 毒化会话
- **现象**：cd 进 `.pnpm` 深层目录后本会话 Bash 永久 `spawn bash.exe ENOENT`，子代理一并死，唯一解=重启会话。
- **预防**：查 cell 内源码只用 Read 绝对路径直读 / node -e 绝对路径；永不 cd 进 node_modules 深层。

### C4. remove 后聚合再生存活窗口
- **现象**：`farm remove` 后首轮页面加载，无头浏览器 loadEventFired 超 10s~30s 不触发（0.1.5 聚合 14.4MB 再生），探针连挂两轮后自愈。
- **修复**：探针 load 预算提到 ≥30s；browser-probe 加 clicks 未命中重试（400ms×10）。
- **预防**：remove/add 后先 curl 暖聚合再跑 UI 探针。

### C5. ⚠️ SPA fallback 假 200
- **现象**：0.1.x web 对任意未匹配路径返回 200 HTML——路由探活看状态码必假绿。
- **预防**：路由存活判定必须看 body 是否 JSON。

### C6. 无头浏览器时序抖动
- **现象**：同断言时过时不过；设置面板/大聚合页面渲染慢导致点击 NOT_FOUND。
- **修复**：browser-probe 点击重试 + 断言清单支持 `settleMs`（大聚合页面 6000ms+）；截图工具 7s 起步。
- **预防**：UI 断言一律带重试，不写死单次时序。

### C7. ⚠️ 全农场 settings.yaml 零化腐蚀（2026-10-07，0.1.0 格已瘫）
- **现象**：0.1.0 的 `sandbox/home/settings.yaml` 变成 **980 字节全 NUL**，boot 即抛
  `settings-file: … must be a map of namespace sections`（FileSettingsProvider.parse）。
  0.1.1/0.1.2/0.1.5 同名文件同样二进制不可解码（运行中的格内存里有设置所以还活着，
  **下次重启即瘫**）；0.1.7 该路径无此文件（该线存储位置不同）。伴随现场：
  四个 `settings.yaml.*.tmp` 遗留（09:41/11:52=944B 完好、14:18=980B 完好、14:37=0B）。
- **根因（写路径已排除，外因未钉死）**：宿主设置写入走 `dsh-atomic-write` 的
  `writeFileAtomic`（随机名 tmp 以 `wx` 独占创建 → 整体写入 → rename 原子替换），
  **目标文件从不以写模式打开**，理论零化不可能；farm.mjs 各子命令也不写
  settings.yaml（credentials 只写 `.credentials.yaml`）。时间线：14:18 完好 tmp 遗留
  （写入进程在 rename 前被强杀）→ 14:37 0 字节 tmp（再次强杀于写入中）→ 主文件
  980B 全零（**尺寸=新内容 980 而非旧 944**，零化者持有新内容）。两个候选外因：
  ① farm stop 的 taskkill /F 强杀风暴撞上设置写入窗口 + NTFS 元数据/数据不一致；
  ② 系统级事件（休眠/掉电/磁盘/AV）。**与 TL 遗留 ns 注册无关**（写入全走
  dsh-settings-file 统一通道，各格同瘫即证）；机理待用户侧系统事件日志佐证。
- **修复**：本会话 shell 因 C3 全灭（文件工具拒写 NUL 二进制目标，Write 覆写闸
  要求先成功 Read），无法就地恢复——交付两件：① `_host-farm/repair-settings.cjs`
  （扫全农场，rotten=含 NUL 检测，从最新完好 `.tmp` 恢复+留证 `*.corrupt-*.zeroed`，
  支持 --dry）；② farm.mjs 增 `healSettings` 预检（start/smoke 前自愈，A7 标注）。
  用户一键：`node _host-farm/repair-settings.cjs` → `node _tools/host-farm/farm.mjs start 0.1.0-rc.8`。
- **预防**：①`settings.yaml.*.tmp` 是事实上的最近快照备份，**禁止手工清理**；
  ②若复发，先查系统事件日志（意外重启 6008/磁盘 disk/AV 拦截）再怀疑软件；
  ③农场的 restart 风暴日之后跑一次 repair-settings.cjs --dry 体检。

## D. 诊断方法类（案例沉淀）

### D1. ⚠️ 诊断通道语义别搞反
- `window.__pgSurf` 是**失败才初始化**（`??= []`）——页面读到 undefined = 零失败（干净信号），读到数组 = 有失败。断言写反会全盘误判。

### D2. 决定性差分优先
- 0.1.5 卡派发悬案的破案点是「同路径的 session-guard 卡活着」一步差分，比逐个修嫌疑点便宜一个数量级。先找同生态行为相反的实例再动手。

### D3. 诊断端点是最便宜的服务端探针
- `debug-generation` 端点（返回 settings 实例全量 ns）一击判死 H3 孤儿假设。用完即删（T16 已删）。临时诊断端点模式值得沉淀为 snippet。

### D4. 部署产物实测验收
- 本季三桩冤案共同教训：**UI 断言必须在部署产物上、用无头浏览器、带点击穿越**（`farm probe` 一键化）。

## 处置状态总表

| # | 问题 | 状态 |
|---|---|---|
| A1 | stale-build | ✅ 已防（prepack+V6+probe） |
| A2 | settingsScope 死路 | ✅ 范式已立（顶层注册+桥），各仓迁移随 M3/M4 |
| A3 | 家族节空白 | ✅ outcome 五格全绿（TL beta.25 + IT 0.7.2；用户目检）；归因经 A6 修正：真钥匙=服务端 ns 注册，client 注册层 ≤0.1.7 惰性 |
| A4 | 接管半补位 | ✅ 真相定案（bindInjectHooks 剥 hooks 键，节体从未渲染成功）；guard 4.1.10 组件已修 useTabs 路径；接管工厂触发条件 → T20 |
| A5 | inject 空数组 | ✅ 已防（V2/V3） |
| A6 | 家族节归因修正 + 0.1.0 双导航 | ✅ 双导航已灭（T20-a：guard 4.1.11 让位选举 + TL beta.26 对称 stand-down，五格单行验收 10-08）；A6 本体两处归因被同日复测勘误推翻（见勘误块） |
| B1-B3 | 发版地雷 | ✅ 已防（V4+rollback.md+铁律） |
| C1-C2 | 农场环境 | ✅ 已防（farm 三处清场+探活） |
| C3-C6 | 环境/时序 | ✅ 工具已固化（探针重试/settleMs/JSON 判活） |
| C7 | 全农场 settings.yaml 零化 | ✅ 已恢复（10-08：repair-settings.cjs 四格 healed、五格重启全绿、家族节满血）；farm healSettings 自愈预检常驻；外因机理待事件日志；tmp=快照勿清理 |
| T17 | 家族节契约文档 | ✅ v1.0 已立（`12-家族节契约-family-tab-contract.md`，10-08）：席位拓扑/各代渲染面真表/让位选举契约/贡献卡三问/机制铁律/验收断言九节 |
| A7/T20-b | settings 句柄数据桥 | ✅ 全线完成（10-08）：perm-gate 泛化 ✓ + input-traffic 0.7.3 ✓（已发 latest+四线）+ **steward 0.5.2 ✓（已发 latest，B1 异常随之消除）**；唯余 guard/mcp-registry 两张设置卡未桥化（→ M4 下一批） |
| T21-prep | 发版准备（TL/guard/IT 三仓） | ✅ 10-08：三仓 CHANGELOG 入节（TL d47e9dc / guard 8bb0278 / IT 6aa5154）+ 单行回归闸断言（probe-asserts-family-single-row.json：console 必须 stand down、禁 takeover registered、IT 卡桥供数）+ **发版计划 `13-发版计划-2026-10-家族节批次.md`**；发布动作待 steward 落定 + 用户 2FA。**同日复审勘误（B2+ 镜像雷）**：「guard 4.1.x 从未上 npm」系 npmmirror 同步延迟假象——npmjs 权威源 4.1.5 在且 latest 正指（10-07 台账正确）；**零号新发现=默认 registry 是 npmmirror（~/.npmrc），publish 与 view 都必须钉 --registry npmjs**；IT/guard publishConfig 无 registry 字段（发布命令已补 flag）；TL tag 地雷经 npmjs 复核坐实。计划已全线修订（发现 0-5）；**发现 5 已落地**：IT 92a145a / guard c77f547 publishConfig 补 registry 字段，tgz 重 pack V1-V6 ALL PASS |
| T21-publish | 批量发布 | ✅ 10-08（用户授权跳过 farm 闸先发，全钉 npmjs）：**IT 0.7.3**（latest+四线 tag 全收敛）/**guard 4.1.11**（latest 4.1.5→4.1.11；dsh-0.2.0 晋级压后）/**TL 4.2.0-beta.26**（`--tag dsh-0.2.0-beta` 落位，**latest/dsh-0.2.0 纹丝不动=4.1.0**，tag 地雷规避成功）。均无 OTP。新坑两条：①`npm dist-tag add` 一条命令只吃一个 tag，多线收敛须逐条；②farm probe 的「设置」点击被 🛡 title「审批门设置」宽松匹配劫持→所有线 DOM 断言不可信（console 闸可用；修复=精确 text 匹配优先）。本次闸门替代：console 闸四格全过 + 0.1.0/0.1.1 diag 精确点击 DOM 闸 ROWS=1。**余项**：steward 插入发布（其会话）、farm 正式闸（其落定后补）、desktop 人工验证 → TL/guard dsh-0.2.0 晋级；guard CHANGELOG「4.1.x 从未发版」句待下版更正（4.1.5 实曾发） |
| T21-publish-2 | steward 插入发布 + farm 正式闸 | ✅ 10-08 收口：**steward 0.5.0-beta.18 转正 0.5.2 发布 latest**（B1 异常消除；publishConfig 旧线 tag dsh-0.1.7 改 npmjs+latest；CHANGELOG 补 0.5.x 线整段；dsh-0.2.0 仍 0.5.1 待 desktop 闸）。**farm 五格单行正式闸 5/5 PASS**（含 IT 桥供数断言）。工具三连修（browser-probe）：①桌面视口 1440×900——headless 默认 800×600 落进宿主 <900px 窄布局、侧栏设置按钮 offsetParent=null 被过滤；②点击分层=可交互元素（button/tab/menuitem/a）的 text 精确→aria 精确→前缀，包裹层 DIV textContent 恰等于目标文本时 click 落空壳；③title 层改「只报 TITLE_ONLY 不点、预算（clickRetryMs，断言可配 30s）耗尽才放行」——🛡 比侧栏按钮早渲染且点击即成功退出循环，等待预算形同虚设的完整机理。另修 steward check-release 两处：prepack 的 tsdown 日志污染 `npm pack --json` stdout（取 /\\[\\s*\\{/ 定位真起点——pretty JSON 的 `[` 与 `{` 不相邻） |
