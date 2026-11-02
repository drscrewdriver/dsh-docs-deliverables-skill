> 溯源｜插件跑在 DSH Desktop（Electron）里时的宿主侧限制——起源案例 dsh-prime-memory 的 macOS SIGTRAP / node:sqlite 装不上 / collector 装了不跑三次事故。本文只留**判据与处方**，已剥离原仓私有锚点；native 同名 DLL 的判定树与代码骨架**不在此文**，见 [native-module-isolation.md](./native-module-isolation.md)。

# Electron 宿主限制（作者判据）

## 0. 先分因，再开药

插件的「重活」出问题时有三个互不相干的归因层。混为一谈会导致开错药——最典型的错是**去调 onnxruntime 参数来治安装问题**。

| 层 | 归属 | 决定什么 | 典型表现 |
|---|---|---|---|
| **A. 引擎/库自身机制** | 第三方库（ORT、分词器、压缩器…） | 「峰值多大」 | 峰值随输入规模平方/线性增长；串行与并发差数倍 |
| **B. 运行时与加载面** | Electron / 宿主二进制 | 「同一次分配会不会被拒」「原生模块能不能加载、从哪加载」 | macOS 分配器 trap、同名 DLL 顶掉、asar 内 `.node` 打不开、ABI 不符 |
| **C. 宿主产品设计** | 宿主装配模型 | 「插件能不能自动装/自动启用依赖」 | CLI 改不动 desktop profile、声明了依赖但依赖不跑 |

一句话：**A 决定病有多重，B 决定这一下会不会致命，C 决定你能不能自动给药。**

判因顺序建议：先问「纯 node 下同样参数能不能过」——能过 ⇒ 归因在 B/C，别去调 A 的旋钮。

---

## 1. B 层：运行时与加载面

| # | 限制 | 成因（机制） | 对作者的含义 | 可自证性 |
|---|---|---|---|---|
| 1 | macOS 上被 **SIGTRAP**（`EXC_BREAKPOINT`，栈底 `libsystem_malloc \| _malloc_zone_memalign`）打死 | 崩溃点是「一次大块**对齐**分配被分配器拒绝」，不是 OOM（崩溃瞬间内存未满、writable resident 极小）。同代码纯 node 同参数全通过 ⇒ 差异在宿主运行时这条失败路径；具体单因未定论 | 不要在宿主主进程里逼峰值分配；把它挪进子进程。同一份代码在 Windows/Linux 只表现为 OOM 异常，**问题不可在本机复现** | ❌ 仅 macOS 宿主 |
| 2 | 打包后 PATH 里**没有 `node`** | 宿主二进制自带 Node 运行时；`fork()` 默认用的就是 `process.execPath` | **不能假定系统装了 node**，也不能用裸 `node` 起子进程。显式传 `execPath: process.execPath`，并把它连同 `pid`/`release.name` 落日志（否则崩了无法归因到「跑在哪种运行时下」） | ✅ 代码 |
| 3 | Electron 二进制默认以「**应用**」身份启动 | 要以 Node 语义跑脚本，惯例是注入 `ELECTRON_RUN_AS_NODE=1`；打包态能否继承该变量取决于宿主 | 若生产代码**依赖宿主环境继承**而非显式设置，这就是一条待核项。出现「子进程起不来」类故障时**优先查这一项** | ⚠️ 装机期 |
| 4 | 同进程**同名原生库**互相顶掉 | Windows `LoadLibrary` 按**模块名**在进程地址空间内去重，先加载者胜；`worker_threads` 共享地址空间 ⇒ **不隔离** | 插件 runtime 与宿主已加载的原生库同名 ⇒ 崩或静默损坏。判定树、宿主清单比对、子进程骨架 → [native-module-isolation.md](./native-module-isolation.md)（本节不重复） | ✅ 代码注释 + 真机 |
| 5 | 宿主提供的包**不在** profile 的 `node_modules` | 宿主类体在 `app.asar` 内、由 Electron 运行时提供；从 profile 目录解析看不见它们 | 不能假定「能 require 宿主的 `dsh-*` 运行时」。**`stub ctx` 那类测法对这类依赖无效**——要在进程内直调或走宿主注入 | ✅ 可写反证脚本 |
| 6 | **asar 打包**：原生 `.node` 不能从 asar 内 `dlopen` | asar 是虚拟文件系统，原生模块需要真实路径 | 原生绑定必须 unpacked 或位于真实目录；把运行时依赖装到**数据目录**而不是包内 asar | ✅ 代码注释 |
| 7 | 原生模块 **ABI** 必须匹配 Electron 的 `NODE_MODULE_VERSION` | Electron 自带 V8/Node 与系统 node 不同 | 用系统 node 编的 `.node` 装进 Electron ⇒ `NODE_MODULE_VERSION mismatch`。装机期验证，不要靠单测 | ⚠️ 装机期 |
| 8 | Node 运行时下限由**内置模块**决定 | 例如 `node:sqlite` 需要较新的 Node；宿主 Electron 自带的 Node 必须够新 | `engines.node` 声明 + **启动期能力探测**；探测不到就走降级路，而不是崩。注意：`node:sqlite` 是内置模块（无 ABI 问题，但有版本门槛），`sqlite-vec` 是原生绑定（有 ABI 问题）——两者别混为一谈 | ✅ `package.json` + 探测 |

---

## 2. C 层：安装与装配面

| # | 限制 | 成因（机制） | 处方 |
|---|---|---|---|
| 9 | `dsh plugin --profile desktop add` **必被拒**（`profile "desktop" is managed exclusively by the Electron application`） | desktop profile 所有权在 Electron 应用侧，CLI 只是外部进程。**这是产品边界，不是权限 bug** | 别在报错上纠缠。给用户**唯一可行链路**：手改 profile `package.json`（dependencies + `dsh.profile.bundles`）→ `pnpm install` → 重启 |
| 10 | **声明依赖 ≠ 依赖会跑** | 宿主 boot 层可能**从不读取** `dsh.pluginDependencies`；是否 `apply()` 由 profile 的 `dsh.profile.bundles` → 合并各包 `cordis.patch.yml` 的 `insert` 决定 | ⛔ 不要设计「装了 A 就自动启用 B」。改为**把「装了没启用」显式暴露给用户**（设置页 banner / 状态项），并明确告知「只开启 X 不会自动启用 Y」。**「功能静默为空」是这类设计最常见的交付缺陷** |

> 第 10 条的判定信号要去**运行时**取，不要只看文档：对宿主 `app.asar` 全文扫描目标键名，0 命中即证明该键无运行时效果。

---

## 3. 三个「本机不可终判」项

写进边界，不要写成结论——这是本类文档最容易越界的地方。

| 项 | 为什么不可自证 | 裁决方式 |
|---|---|---|
| macOS 分配器 trap（B1） | Windows/Linux 的分配器对「大块对齐分配失败」返回 NULL（变成普通异常），不产生 SIGTRAP；`process.kill(pid,'SIGTRAP')` 在 Windows 抛 `EINVAL`，连伪造都做不到 | 报告人在 macOS 跑本仓 repro 脚本 |
| `ELECTRON_RUN_AS_NODE`（B3） | 本机跑的是仓库源码 + 系统 node，**没有「打包态 Electron 二进制」这个对象** | 装机后看子进程能否拉起（日志有 `execPath=` / `pid=`） |
| 原生模块 ABI（B7） | 本机 `node_modules` 是按当前 node 装的，换 Electron 才暴露 | 装机期加载成功率 + desktop 冒烟 |

---

## 4. 可复用结论

1. **在 Electron 宿主里，任何「原生重活」默认放子进程**：一举解决 DLL 撞名、事件循环冻结、崩了拖死宿主三件事；代价是协议化（请求/响应/进度/结算 + ack）。
2. **子进程启动参数要显式、可归因**：`execPath`、`process.release.name`、`pid`、生效预算全落日志。没有这组数，崩溃报告里的毫秒时间戳无法对齐到「哪次拉起、跑在哪种运行时」。
3. **不要把库自身的问题算到 Electron 头上**：峰值与高水位用库自己的旋钮（输入帽、内存模式）；Electron 侧只能通过「不把分配逼到极限」间接帮忙。
4. **「装了没启用」「降级了」都必须可观测**：依赖声明不产生运行时行为、内置模块缺失退降级——两种情况下用户看到的是「功能静默为空」。宁可在设置页多一条 banner，也不要让用户自己猜。
5. **不可自证的部分写进边界，不要写成结论**：不写「消除崩溃」、不写「自愈不丢数据」、不把经验值写成证明。

---

## 5. 与其它分片的关系

| 想知道 | 去哪 |
|---|---|
| 同名原生 DLL 怎么判定、宿主清单怎么比对、子进程代码骨架 | [native-module-isolation.md](./native-module-isolation.md) |
| 一次处理多少条、崩了怎么自愈、慢了怎么退、谁先跑 | [execution-scale-control.md](./execution-scale-control.md) |
| 判定语义四值（ok/warn/fail/skipped）与「无法判定不当异常」 | [judgment-and-delivery-traps.md](./judgment-and-delivery-traps.md) |
| 装了但界面上什么都没有的四层注册链 | 非 skill 仓 `plugin-framework/plugin-install-and-client-seams.md` |
| 完整成因、实测口径与复跑入口（案例快照） | 非 skill 仓 `plugin-framework/electron-host-constraints-case.md` |

## Maintenance

- 宿主升 rc 后重跑：`engines.node` 门槛、desktop profile 独占报错文案、`dsh.pluginDependencies` 是否仍无运行时效果。
- 未命中的段落加「⚠ 待重新核实」，不要静默保留。
