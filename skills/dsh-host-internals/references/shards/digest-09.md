# digest-09 · 应用层：cli 入口与 boot 启动器

> **来源**：`dsh-study-docs/详解/第09篇-应用层cli与boot.md`
> **快照声明**：源文档锁定 **v0.1.0-rc.5**（219 包 / 49 分组）。
> **⚠️ 代际警示**：MAIN = **v0.2.0-rc.2**。四处漂移：① 旧文的守卫函数 **`assertEntriesLoaded` / `assertEntriesActivated` 在 MAIN grep 0 命中**，启动条目校验改为 **`auditStartupEntries`（`packages/boot/app-boot/src/index.ts:925`）**；② 旧导航表第 6 项 **`apps/cli/config/agent-presets` 已不存在**——`apps/cli/config/` 现在只有 `examples/`（`github-review`、`mcp-memory`），agent 预设迁到 **`packages/preset/agent-presets`**（并新增兄弟包 `agent-preset`、`agent-preset-registry`、`persona`）；③ cli 侧新增 `dump-config-schema.ts`、`startup-diagnostics.ts`、`process-shutdown.ts`、`sdk-source.cordis.patch.yml`；④ 顶层 `examples/` 目录在 MAIN 不存在（见 digest-12）。凡旧文写"assertEntries* 断言"的句子，一律按 `auditStartupEntries` 重读。

## 0 WHY（一段）

前八篇讲的是零件，用户不组装零件——用户只敲一个命令（`dsh web` / `dsh --profile headless "把 tests 跑一遍"`）。这一篇是**产品启动器**，管三件事：一个命令四种形态（profile 启动 / headless 一次性任务 / plugin 管理 / `--dump-config` 审计）；多层配置叠成插件树（bundle 补丁 → profile 补丁 → 用户补丁 → `--patch` 覆盖）要正确合并；启动失败必须给出一行可诊断错误 + 非零退出码，**且先把部分启动的上下文清理干净（终端恢复）再退出**——半启动比不启动更危险。核心哲学：**入口要少、打印即启动、失败要响、配置与安装分离**。

## 1 WHAT：职责边界

- **拥有**：`apps/cli/src`（bin 分发壳、`args.ts` 参数语法、`profile-boot.ts` 主路径、`dump-config.ts` 审计路径、`plugin.ts` 管理转发）、`packages/boot/app-boot`（`boot()`、`mountRootInclude`、`renderConfigDump`、`installFailLoud`、profile 目录与模板自举、分层环境加载）。
- **不拥有**：任何产品功能（全在 `packages/`）、GUI 前端源码（`apps/web`，见 digest-10）、发布流程（`scripts/`，见 digest-12）、插件装配算法本体（vendor/loader + vendor/include，见 digest-01）。
- **需求面**：R1 命令入口统一 · R2 启动组合可复现（dump 与 boot 共用 include 算法）· R3 失败大声且干净（标签错误 + `exit(1)` + release 清理超时兜底）· R4 profile 即目录（`$DSH_HOME/profiles/<name>` = package.json 的 `dsh.profile` bundles 顺序 + 用户 `cordis.patch.yml`；web/headless 首次自动初始化，其余名字必须 `dsh plugin` 创建）、N1 模式隔离（按模式动态 import）· N2 环境分层（继承 > 项目 .env > 用户 .env）· N3 清理超时不取消退出 · N4 解析一致 · N5 退出码契约。
- **原则**：P1 一个入口按模式分发 · P2 打印即启动 · P3 失败大声且干净 · P4 配置与安装分离。

## 2.1 文件导航表（已按 MAIN 重锚）

| # | MAIN 路径 | 实证锚点 | 旧锚 | 状态 |
|---|---|---|---|---|
| 1 | `apps/cli/src/bin.ts` | `:55-56` `case 'dump-config'` → 动态 `await import('./dump-config.ts')`；`:65-66` 引 `dump-config-schema`；顶部注释保留"per-mode dynamic import"意图 | 第 27~50 行 switch | **DRIFTED**（行号） |
| 2 | `apps/cli/src/args.ts` | `:10-13` 参数族注释（`--profile` / `--patch` / `--dump-config`）；`:34` `:45` `:120` `:129` `:135` `:168` `:171` 解析落点 | 目录级 | VERIFIED |
| 3 | `apps/cli/src/profile-boot.ts` | 存在；主路径消费 `resolveProfileDir` / `loadProfile` / `boot` | 目录级 | VERIFIED |
| 4 | `apps/cli/src/dump-config.ts` | 存在（新快照另配套 `dump-config-schema.ts`） | 单文件 | DRIFTED（文件增加） |
| 5 | `packages/boot/app-boot/src/index.ts` | `:234` `loadLayeredEnv`；`:430` `renderConfigDump`；`:538` `mountRootInclude`；`:637` `FAIL_LOUD_RELEASE_TIMEOUT_MS = 2_000`；`:679` `installFailLoud`；**`:925` `auditStartupEntries`**；`:972` `boot`；`:1041` `HARNESS_SOURCE_SECTION` | README 第 12~22 行 + `assertEntries*` | **DRIFTED**（函数名） |
| 6 | `apps/cli/src/plugin.ts` | `:4` `import { DEFAULT_PROFILE_BUNDLES, initProfile, PROFILE_TEMPLATES, readProfileCompatibility, resolveProfileDir }` —— R4 模板自举的实际入口 | 未列 | N/A@0.1.0 → VERIFIED@0.2.0 |
| 7 | `packages/boot/app-boot/src/profile.ts` | `:169` `:179` `:704` `:731` profile 目录/模板/兼容性落点 | 目录级 | VERIFIED |
| 8 | `packages/preset/agent-presets` | 包存在（**仅 `lib/` + `node_modules/`，无 `src/`**，即纯预设产物包）；兄弟包 `agent-preset` / `agent-preset-registry` / `persona` | `apps/cli/config/agent-presets` | **DRIFTED**（路径 + 结构） |
| 9 | `apps/cli/README.md` | 第 5 行"product launcher for profiles…"引文位置随文档再生成变动 | 第 5 行 | UNVERIFIED（行号未逐字复验） |

## 2.2 HOW 骨架

### 一条命令的五段旅程（bin → args → 分发 → boot → 运行树）

- `bin.ts` 是**薄分发壳**：`parseDshArgs` 解析参数 → `switch (invocation.mode)` → **按模式动态 import**（N1：启动 web 不加载 plugin/dump 代码）。
- `profile` 模式 → `runProfile()`：加载 profile（bundles 顺序）→ `boot()` 建根上下文、装 Loader、prepare、挂 include 树、校验启动条目。
- `dump-config` 模式 → `runDumpConfig(profile, defaultOnly, patches)`：离线组合并打印，不启动任何服务。
- `plugin` 模式 → 转发给 pnpm 在 profile 目录安装/移除（`plugin.ts:4` 的一组 profile API）。
- MAIN 增量：`startup-diagnostics.ts` 与 `process-shutdown.ts` 把"失败诊断"和"退出清理"从 bin 里拆成独立模块。

### 打印即启动：renderConfigDump 复用 include 算法

- `renderConfigDump`（`:430`）**不自己实现合并**，而是复用 vendor/include 导出的 `entryListSchema` / `applyEntryPatches`——组合、标志派生、配置 dump 与 `boot()` 挂载的树出自同一段代码（R2/N4，"永不与启动漂移"）。
- 旧文动手任务里看到的 `# == ...` 分层注释就是它给每个 overlay 层打的标签。
- 0.2.0 新增 `dump-config-schema.ts`：dump 的输出面本身也有 schema（可被程序消费，不只是给人看的 YAML）。

### 失败大声且干净：fail-loud 三段

- `installFailLoud`（`:679`）把 Loader 失败 / 插件未解析 / 激活失败转成**带标签的一行错误 + 非零退出**（N5）。
- 旧文的 `assertEntriesLoaded` / `assertEntriesActivated` 在 MAIN 已被 **`auditStartupEntries`（`:925`）** 取代：审计启动条目集合而非分两次断言。写迁移代码时不要照抄旧名。
- 退出前先 release（恢复终端 raw mode 等）；release 有超时兜底 `FAIL_LOUD_RELEASE_TIMEOUT_MS = 2_000`（`:637`）——**卡住则延迟退出，但绝不取消退出**（N3）。

### profile 即目录 + 分层环境

- profile = `$DSH_HOME/profiles/<name>` 下一个目录：`package.json` 里的 `dsh.profile` 声明 bundles 顺序，叠加用户 `cordis.patch.yml`；产品安装在安装目录、用户配置在 home（P4，升级产品不碰用户配置）。
- `PROFILE_TEMPLATES` 只有 web / headless 两个模板首次使用自动初始化；其他名字必须先 `dsh plugin` 创建（R4）。`readProfileCompatibility` 负责跨版本兼容判定。
- `loadLayeredEnv`（`:234`）实现 N2：继承环境 > 项目 `.env` > 用户 `.env`，bootstrap 文件里的变量被拒；`HARNESS_SOURCE_SECTION`（`:1041`）标记配置来源段落。

## 6 延伸阅读（MAIN 一手文档指针）

- `docs/subsystems/boot.md`（启动器权威）、`docs/subsystems/extensions.md`、`docs/subsystems/scope.md`
- `docs/architecture.md`、`docs/capability-seams.md`、`docs/config-catalog.md`（生成物，等于 dump 的目录面）
- `apps/cli/README.md`、`packages/boot/app-boot/README.md`、`packages/boot/*/README.md`
