# Changelog

本包是**内容型**包（零运行时依赖、无 build 步骤）：版本号记录的是**技能内容**的修订，
不是代码行为。可追溯轴有两条：

1. **包版本 / 技能 `contentVersion`** —— 回答「装的是哪一版内容」；
2. **`maintenance/skill-anchor-map.yaml` 的锚点** —— 回答「这条结论对不对、宿主升级后还成不成立」。

`npm run verify` 会同时校验这两条轴的结构完整性（`scripts/verify-layout.mjs` 的 drift 段 +
`scripts/check-anchor-map.mjs`）。

---

## [0.2.0] - 2026-11-26

### 新增

- **`dsh-plugin-dev/references/settings-surface-wiring.md`** —— 设置面接线手册，7 条铁律：
  1. `writable: false` 只能来自真实读取（宿主 `get writable() { return true }` 恒可写）
  2. namespace 就是 profile entry id；区分 `unavailable` 与 `writable:false`
  3. 写入不传 `expectedRevision`（除乐观锁）；`update` → `replace` → `mutate` 三选一
  4. 一份快照驱动所有控件；一次性 fetch = 永不刷新
  5. 每个 className 必须在样式串里有定义
  6. 类名齐全 ≠ 样式到位（「样式全素」独立一因）
  7. 条件类名禁塞进插值

- **「样式全素」三因**（§4.4，起源 `dsh-progress-union` 设置卡裸奔）：
  - 因一 `<style>` 写在组件子树里 → 到不了另一个 React 根 → 必须进 `document.head`
  - 因二 等组件挂载才注入 → 头部 utilities / 提前 return 的 dock 先画出来就是无样式节点
  - 因三 幂等闸 `getElementById` 用同 id → 后续 CSS 被静默吞掉（每套 CSS 独立 id）

- **`scripts/check-surface-classes.mjs`** —— 设置面样式类名闸（零依赖，可拷进任何插件仓）：
  抓「className 用了但样式串没定义」，支持 `--root` / `--dir` / `--prefix` / `--allow` / `--ext`，
  单文件 JS 仓与 `src/client` TS 仓通吃。

- **`scripts/check-anchor-map.mjs`** —— 锚点台账闸：以**真实 YAML 解析器**为准做语法校验 +
  结构校验（每条 claim 需 source / status / evidence，status 首词在枚举内）。

- **`scripts/verify-layout.mjs` 的 drift 段**（D1–D4）—— 把「内容改了但元数据没跟」钉成机械判据：
  技能必须有 `contentVersion`/`contentUpdated`；`scripts/` 必须在 `files` 白名单；
  `skills/`、`maintenance/`、`src/` 不可缺；CHANGELOG 首版必须等于 `package.json` 版本。

- 每个技能的 frontmatter 新增 `contentVersion` / `contentUpdated` / `contentNote`
  —— 技能被裸拷进 `.agents/skills` 时也能自证是哪一版。

### 修复

- **`scripts/` 不在 `package.json` `files` 白名单** —— 发出去的包里从来没有闸脚本，
  `dsh plugin add` 装完之后 `npm run verify` 直接找不到文件。已补。
- **`maintenance/skill-anchor-map.yaml` 长期是非法 YAML**（line 37 `(callers: …)` 的
  「冒号+空格」让解析器拒收）—— 这份「防腐化唯一闸」从未被真正解析过一次。已修，
  并新增 `check-anchor-map.mjs` 让它每轮都被解析。

### 变更

- `dsh-plugin-dev` SKILL.md 的「设置面」相关内容从 §2 速查表扩成 §3 完整 7 铁律，
  原 §3–§6 顺延为 §4–§7。
- 锚点台账新增 9 条 `surface-*` claim（设置面接线 / 样式全素 / 闸覆盖边界）。

### 已知边界（不修复，写清）

- `check-surface-classes` **扫不到插值内部的字符串字面量**
  （`` `x${on ? ' hidden' : ''}` `` 里的 `hidden`）→ 条件类名请写成两个完整分支。
- 它只做「有没有定义」的集合判定，**不校验**令牌用错、颜色写死、暗色主题失配。
- 「样式注入的位置/时机」无法自动化，只能靠 §4.5 的四步自查。

---

## [0.1.0] - 2026-10-11

首个成型版本。四个技能：

| 技能 | 内容 |
|---|---|
| `dsh-plugin-dev` | 文件结构、双半架构、家族节契约、10 语本地化、判定语义四值档位 |
| `dsh-plugin-peer-adapt` | 六条宿主线跨版本适配、症状路由表、D/V/G 门禁、32 仓适配判例 |
| `dsh-plugin-release` | awesome 投稿流程、npm registry/dist-tag 纪律、stale-build 三层防线 |
| `dsh-host-internals` | 12 篇宿主子系统解读摘要 + 100 条源码指针 |

内容对 `deepseek-harness@0.2.0-rc.2`（主基准）与 `0.1.7-rc.2`（辅基准）做过源码核验，
带 VERIFIED / FARM / PENDING 三态标签。

### 0.1.0 期间未登记的漂移（2026-11-26 补记）

版本号停留在 0.1.0 期间，仓内实际发生过以下变更而**没有留任何记录**——这正是 0.2.0
新增 drift 闸的原因：

- `dsh-plugin-dev` 新增 `settings-nav-icon-override.md`、`generic-aggregation-section-playbook.md`、
  `native-module-isolation.md`、`electron-host-constraints.md`、`execution-scale-control.md`
- `dsh-plugin-peer-adapt` 扩充至 0.2.2 线（version-delta-ledger / host-matrix / case-law）

