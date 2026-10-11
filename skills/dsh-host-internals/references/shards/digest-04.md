# digest-04 · packages/llm/ 与 typert：模型适配缝与类型系统

> **来源**：`dsh-study-docs/详解/第04篇-llm与typert.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示**：MAIN = **v0.2.0-rc.2**。词汇层稳定（`ContentBlockMap`/`Message`/`LlmAdapter` 均在原文件），但**行号已漂**：`ContentBlockMap` → `types.ts:137`、`Message` → `message.ts:196`、`LlmAdapter` → `index.ts:208`、`LlmRuntime` → `index.ts:342`（且现在是 `extends TypertRemoteService`——两条通道在 0.2.0 已相接）。`packages/llm/` 分组新增 `llm-deepseek-account`、`llm-deepseek-api-key`、`deepseek-llm-api-extensions`；旧文所举 `llm-pi-ai` 在 MAIN 实测存在（包目录命中，且有专属 CI `pi-ai-provider-e2e.yml`）。

## 0 WHY（一段）

core 的循环"流式获取模型响应"，但 core **不拥有**模型协议——消息词汇、流式协议、适配器契约全部属于 `packages/llm/`。切这一刀由两个场景驱动：其一，同一产品要接 DeepSeek、其他提供商与用户自建网关，每次请求都不同而循环代码必须**一行不改**，所以循环只认 `LlmAdapter` 契约；其二，GUI 前端与 SDK 客户端要调用宿主能力（查会话、查工具），走的是**生成式类型契约** typert——"远程方法"在编译期就有类型，而不是手写 JSON。选型结论与第 02 篇同构：**一份权威类型，其余全派生**；真相只有一个，视图全部派生。

## 1 WHAT：职责边界

- **拥有**：`dsh-llm`（`Message` / `ContentBlockMap` / `MessageSourceMap` / `LlmAdapter` / `LlmRuntime`）、providers（`llm-deepseek` 及 0.2.0 的 account / api-key 分包）、`llm-retry`（挂在请求上的守卫插件）、`packages/typert`（protocol / generator / registry / loader）、`packages/api/gateway`（远程通道 Host 端出口）。
- **不拥有**：会话与循环（→ core）、工具执行（`tool-call` 只是词汇块，执行仍走 `ctx.tools`）、具体业务 RPC 对象（各自包声明 `TypertLookupMap` 扩展）、模型选择 UI（→ `client/ui-model-selection`）。
- **需求面**：R1 词汇统一（投递 / 持久历史 / 模型请求三处同一类型）· R2 适配可插拔 · R3 元数据权威单点（contextWindow、reasoningEffort 由服务该路由的适配器解析）· R4 类型安全远程调用；N1 `replayState` 无损重放 · N2 `inputModalities` 可声明 · N3 advisory 目录与权威解析分离 · N4 跨边界 id 一律 Branded。
- **原则**：P1 一份词汇三处共用 · P2 契约优于实现 · P3 **权威在拥有者** · P4 声明合并扩展 · P5 品牌化边界。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `packages/llm/llm/src/types.ts` | `:137` `export interface ContentBlockMap` | 同文件（无行号） | VERIFIED（行号新增） |
| 2 | `packages/llm/llm/src/message.ts` | `:110` `MessageSourceMap`；`:167` `AssistantMessage extends MessageBase`；`:196` `type Message = MessageRoleMap[keyof MessageRoleMap]` | 同文件 | VERIFIED |
| 3 | `packages/llm/llm/src/index.ts` | `:208` `export abstract class LlmAdapter`；`:342` `export class LlmRuntime extends TypertRemoteService` | 同文件 | VERIFIED（且揭示 llm↔typert 相接） |
| 4 | `packages/typert/protocol/src/types.ts` | `:36` `interface TypertLookupMap {}`；`:39` `interface TypertContextMap {}`；`:270` `type TypertCodec =`（strict / src-json 两模式） | 同文件 | VERIFIED |
| 5 | `packages/api/gateway/src/types.ts` | `:138` `TypertGateway`；`:11` `InvokeRemoteRequest`；`:48` `TypertRemoteEventOutcome`；`:70` `TypertRemoteEventDispatch`；`:84` `TypertGatewayWireStream` | 同文件 | VERIFIED |
| 6 | `packages/api/gateway/src/index.ts` | `:199` `class TypertGatewayService extends Service implements TypertGateway`；`:163` `TypertGatewayError`；`:146` `Config` | 旧文只列 types.ts | VERIFIED（新增锚） |
| 7 | `packages/api/gateway/src/stream-protocol.ts` · `stream-server.ts` | `REMOTE_STREAM_MUX_PATH = '/api/remote.mux'`（`stream-protocol.ts:7`）、`REMOTE_EVENT_STREAM_ENDPOINT = '$events'`（`:10`）、`:13` `$events/result`；`RemoteStreamMuxServer`（`stream-server.ts:43`） | 旧文未列 | VERIFIED（0.2.0 新增多路复用流） |
| 8 | `packages/llm/llm-deepseek/src`、`packages/llm/llm-retry/src` | 目录存在 | 同 | VERIFIED（路径） |
| 9 | `packages/llm/llm-pi-ai` | 包目录实测存在（`packages/llm` 分组清单：`deepseek-llm-api-extensions`、`llm`、`llm-deepseek`、`llm-deepseek-account`、`llm-deepseek-api-key`、`llm-pi-ai`、`llm-retry`、`plugin-package-inventory-deepseek`、`token-meter`）；配套 `.github/workflows/pi-ai-provider-e2e.yml` | 旧文举例 | VERIFIED（路径） |

## 2.2 HOW 骨架

### 会话词汇：Message 只有四个字段，每个都有讲究

- `ContentBlockMap` 五块：`text` / `reasoning`（与可见文本区分）/ `image` / `tool-call` / `tool-result`；新模态靠声明合并加入。
- 官方纪律：**新核心块必须同时带来 adapter、UI、compaction 支持**——加类型不等于加模态（决策 D1）。
- `Message { id, role, content, source }`：`id` 跨投递/日志/请求三个表示边界保持稳定；`role` 提供商中立；`source` 记录"从哪来"，本身也是合并可扩展的。

### 元数据权威单点

- contextWindow / reasoningEffort 这类"精确路由"元数据由**服务该路由的适配器**解析；消费者复用同一解析结果，不重复解析、不自行猜测。
- 模型目录（catalog）是 **advisory** 的，不参与请求校验；目录与解析不一致时以解析为准（N3）。
- `AssistantProvenance { provider, model, replayState? }`：`LlmRuntime` 只有当目标适配器实例**同时拥有**历史 provider 与目标 provider 时才暴露 `replayState`——重放数据不外泄给无关适配器（D2）。

### typert：wire 只传 endpoint + 命名参数

- `TypertLookupMap` / `TypertContextMap` 是**空接口 + 声明合并**的扩展点：Host 对象与 wire 身份的映射是编译期声明，不靠手写 JSON。
- `TypertCodec`（`:270`）给出两种编解码模式（strict / src-json）。
- 生成器从类型声明产出 Host 端与消费者端两套契约，漂移在编译期暴露——手写 JSON-RPC 的调用方与实现方必然漂移，这就是被替换掉的路径 D。

### 远程通道的 0.2.0 形态

- Host 出口 = `TypertGatewayService`（`api/gateway/src/index.ts:199`），错误统一为 `TypertGatewayError` 的品牌码枚举（`types.ts:116`）。
- 事件流走多路复用：`/api/remote.mux` + `$events` / `$events/result` 端点常量、`RemoteStreamMuxServer` 承载（0.1.0 文档未描述这一层）。
- GUI 与 SDK 因此共用同一套类型化远程调用；`LlmRuntime` 自身也 `extends TypertRemoteService`——模型能力同样是一条类型化的可远程调用对象。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/llm-streaming.md`（"One immutable message representation shared by delivery, durable history, and model requests" 的出处）
- `docs/subsystems/typert.md`、`docs/subsystems/web.md`、`docs/subsystems/client-resources.md`
- `docs/subsystems/token-meter.md`（流块 → compaction 输入）、`docs/subsystems/credentials.md`（api-key / account 分包）
