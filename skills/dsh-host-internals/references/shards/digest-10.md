# digest-10 · GUI 前后端：webserver 载体与 slot 插件化界面

> **来源**：`dsh-study-docs/详解/第10篇-GUI前后端.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示（本篇是漂移重灾区之一）**：MAIN = **v0.2.0-rc.2**。① 旧三层的 **`packages/client/runtime` 与 `packages/client/web-react` 在 MAIN 都不存在**——client 分组现为 11 个非 ui 包（`connection`/`store`/`resources`/`web`/`ui-renderer` 等）+ **54 个 `ui-*`**（旧文 39）；落点改为 `store` + `resources` + `web` + `ui-renderer`。② `AppWebEntry` 实锚在 **`packages/client/web/src/boot.ts:23`**。③ `apps/web/src/main.ts` **不再是薄壳**（四个新符号见表 #1）。④ slot 贡献契约变了：需 `inject: ['slots']` + `ctx.slots.inject` 包裹（见表 #9）。旧文"runtime / web-react / 39 个 ui-* / tapIndex"一律按上述重读。

## 0 WHY（一段）

前九篇产品都是"无头"的，但产品要给**人**用就需要 GUI。三个场景逼出三条纪律：① 浏览器里要实时看到 Agent 的思考、工具调用与结果（SSE 事件流，非轮询）；② GUI 的每个区块都要能由插件贡献——**UI 本身也是插件**；③ 职责不混：浏览器只管"怎么画"，模型可见的事实永远来自会话日志。官方一句话定调 webserver：*"It is not part of the agent loop and not a capability seam; it knows no harness concepts, and another plugin registers every feature route."*

## 1 WHAT：职责边界

- **拥有**：`packages/host/webserver`（纯 `node:http` 载体：named route、index.html 变换、唯一 fallback 席位）、`packages/host/frontend-static`（SPA 静态，认领 fallback）、`packages/client/connection` + `packages/api/*`（`/api` 桥 = Typert RPC；旧 `host/apiproxy` 已拆分）、其余 `packages/client/*`（对象层、slot 协议、54 个 `ui-*` 区域）、`apps/web`（Vite 入口）。
- **不拥有**：任何 agent 循环逻辑（digest-02）、任何模型可见事实的产生（digest-02/06）、渲染细节（`ui-theme` / `ui-primitives` 私有）、鉴权（loopback 默认姿态即安全边界）、Electron 通道（走 `file://` + IPC 桥，不经 webserver）。
- **需求面**：R1 载体与业务分离 · R2 UI 即插件（`ctx.slots.register({ name, children?, store?, inject? }, Component)`）· R3 数据/渲染/展示三层分离（**业务数据活在对象层，永不在 store**）· R4 SSE 实时 + 连接自愈 · R5 UI 不产生模型可见输入；N1 默认只听 `127.0.0.1`，`0.0.0.0` 是显式暴露（无 TLS/auth）· N2 SPA 锁定规则（非 GET/HEAD=405、越界=403、miss 回 index.html=200）· N3 重连状态机 · N4 UI 域间只共享 JSON 兼容数据与回调 · N5 展示组件吃 props、可按 seq 重放。
- **原则**：P1 管道不装水 · P2 UI 也是插件 · P3 数据与渲染分离 · P4 事件驱动渲染 · P5 展示不造事实。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `apps/web/src/main.ts` | 存在；含 `dshDesktopBoot` / `__DSH_BOOT_READY__` / `__DSH_TRANSPORT__` / `applyIndexInjections` | "10 行薄壳" | **DRIFTED** |
| 2 | `packages/host/webserver/src/index.ts` | `:39` `WebRouteKind`；`:42` `WebRoute`；`:51` `WebUpgradeRoute`（**0.2.0 新增**）；`:59` `Config`；`:61` `host: '127.0.0.1' \| '0.0.0.0'`；`:125` `class WebServer extends Service`；`:198-201` fallback 二次注册抛错 | 同文件（无 UpgradeRoute） | VERIFIED + DRIFTED（新增） |
| 3 | `packages/host/webserver/src/injections.ts` | `:12` `:15` `IndexInjection`（结构化注入取代旧"裸 tapIndex"） | `client/modules` 的 `tapIndex` | **DRIFTED** |
| 4 | `packages/host/frontend-static/src/index.ts` | `:5-6` 头注释列出 404/403/octet-stream/405 四条规则；`:30` `Config`；`:31` `distIndex`；`:80-82` 越界 403；`:121` `ctx.webServer.registerFallback(...)`；`:124-125` 非 GET/HEAD → 405 | 目录级 | VERIFIED |
| 5 | `packages/client/connection/src/client/connection.ts` | `:77` `ConnectionController`（RPC/事件投递/重连状态机持有者）；`src/index.ts:144-158` 注册 `/api` prefix 路由（`src/api-path.ts:7` `API_PATH = '/api'`），`packages/api/gateway/src/index.ts:234` `rpc.intercept('/api', …)` 认领 endpoint | 旧 `packages/host/apiproxy` + `client/runtime/src` | **DRIFTED**（包拆分重组） |
| 6 | `packages/client/web/src/boot.ts` | `:23` `AppWebEntry` | `dsh-client-web` 导出面 | DRIFTED |
| 7 | `packages/client/{store,resources,ui-renderer}` | 三个包目录均存在，承接旧"对象层 + 渲染机制"职责 | `client/runtime` + `client/web-react` | **N-A@0.2.0**（旧包名） |
| 8 | `packages/client/ui-slots/src` | 包存在（slot 注册/渲染协议） | 同 | VERIFIED |
| 9 | `packages/extensions/cordis-client-runner/src/client/slot-catalog.ts` | `:69-70` `inject: ['slots']` + `ctx.slots.inject(key, () => ctx.slots.register(...))` —— 0.2.0 贡献 slot 的标准写法 | 旧文未列 | N/A@0.1.0 → VERIFIED@0.2.0 |

## 2.2 HOW 骨架

### 两座桥：浏览器 ↔ 主机

- **RPC 桥**：浏览器 → `/api`（`client/connection` 注册的 prefix 路由，见表 #5）→ Typert RPC → 宿主服务（digest-04 契约；wire 只传 endpoint + args）；0.2.0 另有 `/api/remote.mux` 事件流（`api/gateway/src/stream-protocol.ts:7`）。
- **事件桥**：浏览器经 SSE 观察 `session/event`（R4）；连接、事件投递、重连由 `ConnectionController` 统一维护（表 #5）。
- **载体侧**：`webserver` 只提供 named route 注册 + index.html 变换 + 一个 fallback 席位；`frontend-static` 认领 fallback 提供 SPA 服务，`/api` 等均是注册进来的插件路由（R1）。

### 路由与 index 注入的治理

- 三字段路由契约：`WebRouteKind` + `WebRoute` + 新增 `WebUpgradeRoute`（升级类通道，见表 #2）。
- **fallback 席位只有一个**：第二次注册 fallback 直接抛错（`:198-201`）——把"谁兜住未匹配请求"变成显式冲突，而不是隐式覆盖（D1）。
- index.html 的注入从旧"裸 tapIndex"升级为 **`IndexInjection` 结构化注入**（`injections.ts:12/:15`），由入口侧 `applyIndexInjections` 消费，因此可组合、可校验。
- SPA 锁定规则（N2）：非 GET/HEAD=405（`:124-125`）、越出 dist root=403（`:80-82`）、未知扩展走 octet-stream、miss 回 index.html=200。

### 三层分离与"声明即授权"的 slot

- 意图不变：**对象层管事实（无 React）→ 渲染机制管桥（ctx→React）→ 展示组件管画（纯 props）**；物理包名 0.2.0 重组。官方纪律 *"Business data lives in the object layer, never a store"*。
- slot 是**声明即授权**：`children` 声明哪些 hole 可被填，渲染只渲染声明过的 hole，冲突在加载期报错（D2）。
- 0.2.0 贡献写法（实锚 `slot-catalog.ts:69-70`）：服务声明 `inject: ['slots']`，然后用 **`ctx.slots.inject(key, () => ctx.slots.register(...))`** 包裹注册——直接调 `register` 的旧代码需要补这层 inject。
- UI 域间只共享 JSON 兼容数据与回调（N4）。

### 实时与重放

- 模型流式输出经事件流到浏览器（R4 验收：流式渲染，而非等最终结果）；展示组件吃 props，事件窗口按 `seq` 重放（N5）。
- **红线（R5）**：*"The web layer is pure presentation… a new model-visible input still requires a session event."* UI 直发模型 = 破坏 digest-02 的"模型可见 ⟺ 已记录"。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/api-gateway.md`（Remote 层权威）、`docs/subsystems/typert.md`
- `docs/subsystems/web-server.md`、`docs/subsystems/web-client.md`、`docs/subsystems/web.md`、`docs/subsystems/slots.md`
- `docs/subsystems/client-modules.md`、`docs/subsystems/client-resources.md`、`docs/subsystems/sidebar-right.md`
- `docs/subsystems/llm-streaming.md`（事件到浏览器的上游）、`packages/client/AGENTS.md`（三层与展示纪律的权威）
