> 溯源｜日期推导事故复盘（git 历史≠数据库） 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# 日期推导事故复盘：把 git 历史当数据库的一次翻车（人话版）

> 对象：`awesome-dsh-plugin/awesome-dsh-plugin`
> 事故：#2662（2026-09-08 合并）→ main 的构建连红两天 → 所有以当前 main 为基点的 PR 检查连带变红
> 已落地：#4821（上游修复）＋ #4687（投稿分支自带同一份补丁）
> 配套手册：`awesome-dsh-plugin-投稿步骤.md` 附录 B / 附录 C

---

## 0. 一句话版本

站点要给每个插件显示"加入日期"，但它**不存这些日期，而是每次构建都去 git 历史里现场考古**。
#2662 那三个条目**是在"合并"这个动作里被创建出来的**（改名 + 重写 README 都发生在 merge commit 内部），
而 `git log` **默认不展示 merge commit 的 diff** —— 三个考古来源同时扑空，脚本按设计拒绝构建；
又因为日期是"每次构建重算"，这笔坏账就一直躺在 main 上，于是全仓变红、merge 队列被冻住。

---

## 1. 人话：这个"加入日期"到底从哪来

打个比方：图书馆要给每本书标注"入馆日期"，但**没有登记簿**。它的做法是——每次开门前回看监控录像，
找"这本书第一次出现在书架上的那一刻"，用那一刻的时间当入馆日期。

`build-site.mjs` 就是这个图书馆管理员，它有**三份录像可查，按可信度排序**：

| 顺序 | 来源 | 相当于 |
|---|---|---|
| 1 | `data/added-dates.json` | 一张手写的补录单（历史遗留、人工迁移就写这儿） |
| 2 | README 的 diff 历史（`git log -p -- README.md`） | 正门口的录像：看"这行字第一次被加进去"是哪次提交 |
| 3 | 条目文件的历史（`git log --diff-filter=A -- data/plugins/xxx.yml`） | 库房登记录像：看"这个文件第一次被放进来"是哪次提交 |

三份都查不到，管理员**不会写今天的日期充数**（那样每次开门日期都在变，产物会来回抖），
而是直接拉闸：`no added-date derivable for: … refusing to build`。

这套设计本身没错，问题出在"录像"这一个环节。

---

## 2. 这起事故具体是怎么发生的

正常的投稿长这样（99% 的情况）：

```
分支提交 A：+ data/plugins/owner__repo.yml
           + README.md 里那一行
→ 录像里有清晰画面："A 这次提交第一次出现该 URL" → 日期 = A 的提交时间 ✅
```

#2662（`wwweljf/dsh-plugins` 三个子目录插件）特殊在两点，而且**两点凑在一起才致命**：

1. **分支上的提交用的是旧文件名**：`wwweljf__dsh-plugins--dsh-ding-sound.yml`（当时 URL 里还没有 `/plugins/` 段），
   4 个分支提交**一个都没碰 README**；
2. **合并的人在做合并时顺手做了整理**：把条目文件改成按最终 URL 推导出的 slug
   （`...--plugins-dsh-ding-sound.yml`），并重新生成了 README 的那 3 行。
   这两件事**全部发生在 merge commit `5599809cf` 里面**，没有任何一个普通提交包含它们。

于是三份录像同时失效：

| 来源 | 为什么查不到 |
|---|---|
| README 历史 | 那 3 行只作为 merge 的 diff 存在过，而 `git log -p` **默认不打印 merge 的 diff** |
| 条目文件历史 | 该路径唯一相关的提交就是那个 merge；merge 不参与 diff → `--diff-filter=A` 什么也返回不了 |
| 人工补录单 | 没人写过这 3 条 |

`git log --diff-merges=first-parent --diff-filter=A -- <file>` 空输出、README 遍历 0 命中 —— 用真实仓库和最小复现仓库都验证过。

一句话记住：**`git log` 默认"看不见" merge commit 改了什么**（要 `-m` / `--diff-merges=…`）。
所以"内容是在合并那一下被塞进去的"这类情况，传统 log 视图里等于没发生过。

---

## 3. 为什么一坏就坏全仓

- **日期是每次构建重算的**，不是一次性写进产物的：只要账本里没有这 3 条，任何一次构建都会卡在同一处；
- 出问题的不是"某个 PR"，而是 **main 自己的历史**：从 2026-09-08 15:01 那一刻起，
  main 的每次 push 构建、每晚的定时构建都失败，Pages 一直停在旧产物；
- 每个 PR 检查都要跑一遍这个构建 → **所有以新 main 为基点的 PR 一起变红**，
  merge 队列从 2026-09-09 03:13 之后没有任何合并 —— 仓库事实上被冻住；
- 最坑的是**红的是别人的 PR**：#4687 只是加两个自己的插件，报错却在说三个 `wwweljf` 的 URL。
  贡献者拿到这条日志，第一反应必然是怀疑自己的提交。

---

## 4. 高频 PR 的仓库，为什么会反复踩这一类坑

这类问题不是"某个人手滑"，而是几个结构性问题叠在一起：

1. **把 git 历史当数据库用**。
   git 记的是"内容快照 + 拓扑"，不是"这笔业务事实发生在哪天"。
   一旦用它做业务语义的查询（谁先来的、哪天入的库），答案就会随**历史形状**变化：
   rebase、squash、merge、改名、浅克隆，任何一种整理手法都可能让同一个问题得到不同答案。

2. **"顺手整理"被藏进 merge commit**。
   合并是唯一一个"作者看不见、reviewer 也不逐行看 diff"的动作。
   往里面塞改名、重新生成、补字段，等于把事实写进了一个**默认不打印**的地方。

3. **生成物（README）参与合并**。
   README 是生成物，却在 main 上被每个 PR 重写一次 → 迟到两天提交的 PR 一定撞车，
   于是又出现"靠合并时的整理来救场"的动机 → 回到第 2 条，形成闭环。

4. **fail-closed 的爆炸半径太大**。
   为了不让日期漂移而"宁可拒绝构建"是对的；但**一条条目的日期推不出来 → 整站不建**，
   等于一个小数据缺口能冻住整个仓库。方向对，粒度错了。

5. **只在"自己这条时间线"里测试**。
   本地浅克隆 / 单条分支上跑得好好的，换到 CI 的全历史 + merge ref 就变样。
   凡是"读 git 历史"的逻辑，都必须拿**真实形状的历史**（含 merge、改名、浅克隆边界）来测。

---

## 5. 防复发清单

按"最根本 → 最治标"排序，每条给出**改什么**与**怎么验证**。

### A. 账本层：别考古，直接记账（最根本）

- 让"加入日期"成为**提交的一部分**，而不是事后考古的结论：
  最省事的做法是让合并后的机器人（仓库已有 `sync-readme.yml` 这个钩子）在**合并时**补一行
  `data/added-dates.json`（用 merge 的时间），并顺手把"改名/重新生成"的整理工作也放在这个**普通提交**里。
  这样：内容在普通提交里、日期在账本里，两者都不依赖历史形状。
- 更彻底的版本：日期随条目文件走（per-entry），`data/added-dates.json` 只作为历史遗留补录。
- **验证**：`git log --oneline -1 -- data/added-dates.json` 应该是一条 bot 提交；
  对任意新合并的条目，账本里应立刻有键值，而不是等到构建去推。

### B. 工具层：考古要考古得对

本次补丁（#4821）就是这一层：给条目文件的那次查询加 `--diff-merges=first-parent`，
让 merge 也算"引入该路径的提交"，并把输出过滤成日期行（否则 merge 带出的 patch 会让 `new Date('+url: …')` 抛错被 catch 吞掉）。

写"从 git 历史里找事实"的脚本，至少过一遍这张清单：

| 陷阱 | 表现 | 开关 |
|---|---|---|
| merge 不打印 diff | 合并引入的内容"查无此人" | `-m` / `--diff-merges=first-parent` |
| 改名/copy 不跟随 | 改名后 `--diff-filter=A` 返回空 | `--follow`（单路径）/ `-M` / `-C` |
| 历史简化剪枝 | 侧支的提交被跳过 | `--full-history` |
| 浅克隆截断 | "need full git history" | `fetch-depth: 0` |
| 排序与语义混淆 | 取到"最新"而不是"最早" | `--reverse` vs `-1`、`out[out.length-1]` |
| 输出解析想当然 | 开启 diff 后多出 patch 文本 | 只匹配 `^\d{4}-\d{2}-\d{2}T` 之类的行 |

**验证**：给这段逻辑写 fixture 测试——用脚本造出"普通提交引入 / merge 引入 / 改名后再合并 / repoint / 浅克隆"
四种历史形状（`_daterepro.ps1` 就是最小版），断言每种形状下推导出的日期。

### C. 流程层：把不变式变成机器人的活

- **不变式**：`data/plugins/` 里每个条目文件都必须能在账本里找到日期。
  CI 加一条检查：`git log --diff-merges=first-parent --name-status` 扫 merge 提交里
  `data/plugins` 的 A/R/D —— 一旦发现"在 merge 里新增/改名/删除条目"，就**自动补账本**（bot 直接提交或开 PR）。
  这样即使合并时又顺手整理了，账本也会自动跟上，人不需要记得。
- 修 CI 的同时把"谁该负责"写进 CONTRIBUTING：**改名、重新生成、补字段，一律不放进 merge**。

**验证**：故意在本地造一个"merge 里改名"的历史，跑一遍 CI 检查，应当自动补账本而不是变红。

### D. 合并层：让"整理"没有存在的必要

- 上 **merge queue**：排队时自动把 PR 合到最新 main 并跑全套检查，只有绿了才真的合并。
  这一条同时干掉：陈旧 fork 重加旧条目、生成物冲突、"合并时手工整理"这三类问题。
- 或者退一步：合并前强制 `Update branch` + 重跑检查（把"整理"提前到普通提交里完成）。
- 生成物（README）继续由 `sync-readme.yml` 在合并后生成 —— 这条设计是对的，别回退到"PR 里带生成物"，
  否则又是"迟到必撞车 → 靠合并救场"的循环（仓库里曾出现 218/296 个 PR 卡在生成物冲突上）。

**验证**：随机抽 5 个已合并 PR，`git log --diff-merges=first-parent --name-status -1 <merge-sha> -- data/plugins README.md`
应当只看到"新增条目文件"，看不到改名/重新生成。

### E. 观测层：红要红得能定位，且别把别人的锅甩给贡献者

- **区分"你的改动导致"与"main 本来就坏"**：PR 检查里先构建 base，再构建 merge；
  base 也失败 → 这条检查标 neutral（或直接跳过并留言"main 当前不可构建，请等修复"），不要判 PR 死刑。
  这是通用手段（pre-existing failure detection），一次改造长期受益。
- 错误信息要 actionable：不仅列出推不出日期的 URL，还要写"这不是你改的条目 / 已开 issue / 修复 PR 链接"。
- main 的健康度要能被看见：nightly 变红自动开 issue 并打 `ci-broken` 标签；
  仓库首页/PR 模板里放"最近一次成功构建时间"。

**验证**：构造一个 main 故意坏掉的场景，随便开一个无关 PR，确认它显示 neutral 而不是 red。

---

## 6. 只做三件事的话

1. **合并时就记账**（A）：`sync-readme.yml` 顺带补 `added-dates.json`，并在普通提交里完成改名/重新生成。
2. **考古要看得见 merge**（B）：`--diff-merges=first-parent`（本次 #4821 已做）＋ fixture 测试。
3. **PR 检查区分"main 已坏"**（E）：base 红 → neutral，别让贡献者替基础设施背锅。

---

## 7. 附：本次事故证据链

| 事实 | 命令/来源 |
|---|---|
| 引入者是一个 merge commit（2 个父） | `gh api repos/…/commits?path=data/plugins/wwweljf__dsh-plugins--plugins-dsh-ding-sound.yml` → 只有 `5599809cf`，`parents=2` |
| 分支上的文件是另一个名字（现已 404） | 同上的分支提交 `62f9749cf` / `f44633075` / `34cb88381` 文件列表 |
| 4 个分支提交都没碰 README | PR #2662 的 commits 列表（每个 commit 的 files） |
| merge 自己写了 README 那 3 行 | `gh api repos/…/commits/5599809cf` → files: `README.md +3`、`README.zh.md +3` |
| 三处来源都空 | 本地全历史：`git log --diff-filter=A -- <file>` 空；README 遍历 0 命中；账本无键 |
| 影响面 | `gh run list --workflow build-site.yml`：2026-09-08 15:01 起连续失败；上游 2026-09-09 03:13 后无任何合并 |
| 修复有效 | 本地 `SKIP_PUBLISH_CHECKS=1 node scripts/build-site.mjs` → `site built: 3433 rows × 2 locales`（exit 0）；#4687 `check` pass / `Submission gate` pass |

时间线：

| 时间 (UTC) | 事件 |
|---|---|
| 2026-09-08 15:01 | #2662 以 merge commit `5599809cf` 合并（改名 + 重生成都藏在 merge 里）；同一秒触发的构建开始失败 |
| 2026-09-09 / 09-10 | 两次 nightly 失败，Pages 停在旧产物；merge 队列冻结 |
| 2026-09-10 19:17 | #4687 的 `check` 因这 3 个 URL 失败 —— 投稿本身无罪 |
| 2026-09-11 | 定位 → 补账本（#4821 / #4687）+ 让考古看得见 merge |
