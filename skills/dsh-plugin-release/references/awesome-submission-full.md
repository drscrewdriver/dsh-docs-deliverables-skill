> 溯源｜awesome-dsh-plugin 投稿步骤（PR #2658/#2660 实证全流程） 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# awesome-dsh-plugin 插件投稿步骤

> 记录 2026-08-22 向 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 投稿 dsh 插件的完整可复现流程。
> 本次实际投稿：`dsh-session-search-toggle`（PR #2658）与 `dsh-thinking-levels`（PR #2660），均已通过 CI。

---

## 0. 前置条件

- 本机已登录 GitHub CLI（`gh auth status`，token 带 `repo` scope，Git operations 协议用 **https**）。
- 本机 GitHub 走代理：`http://127.0.0.1:30987`（用 SSH 时 publickey 失败，**必须用 https remote + 代理**）。
- 本地已 clone **fork**：`git clone https://github.com/<you>/awesome-dsh-plugin.git`，并已添加上游：
  ```sh
  git remote add upstream https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git
  ```

## 1. 准备插件条目 YAML

在 `data/plugins/` 新建 `<owner>__<repo>.yml`：

```yaml
url: https://github.com/<owner>/<repo>
name: <owner>/<repo>
category: <cat>        # 见下方分类对照
description:
  en: '...'            # 含 ": " 时必须用单引号包裹，否则 YAML 解析失败
  zh: ...
```

分类 `CAT_IDS`（`scripts/lib/entries.mjs`）：

```
ui | usage | theme | model | identity | session | memory | tools | browser |
vision | voice | docs | skill | workflow | git | notify | dev | security |
remote | market | fun
```

常用对照：会话类 → `session`；LLM/推理 → `model`（README 显示为 "Models & Providers"）。

## 2. 重建干净分支（关键！fork main 必须与上游同步）

> 踩坑记录：fork 的 main 若与上游 diverged，直接建 PR 会带上几百上千个 commit。
> 本次 fork main 曾 ahead 1443 / behind 2154，首次 PR #1 因此是错的（建在 fork 内部 + 1444 commits）。

```sh
git fetch upstream main
git checkout -b add/<repo> upstream/main     # 基于上游最新 main 建分支
```

## 3. 重新生成 README（CI 强制）

CI 用 `node scripts/generate-readme.mjs --check` 校验 README 与 `data/plugins/` 同步，**必须**重跑：

```sh
npm ci                              # 装 devDependencies（js-yaml / marked）
node scripts/generate-readme.mjs    # 写模式：重新生成 README.md + README.zh.md
node scripts/generate-readme.mjs --check   # 校验，输出 "up to date" 即通过
```

验证条目落对分类：`grep -n '<repo>' README.md`，对照 `^### ` 标题确认区块。

## 4. 提交 + 推送 fork

```sh
git add data/plugins/<owner>__<repo>.yml README.md README.zh.md
git commit -m "add <owner>/<repo> (<cat>)"
git push -u origin add/<repo>       # 走代理：$env:HTTPS_PROXY/HTTP_PROXY
```

## 5. 创建跨仓库 PR（建到上游）

> **每个 PR 最多 3 条。** 超量 CI 拒绝。多个插件是自己的话，挑质量最好的提交。

```sh
gh pr create --repo awesome-dsh-plugin/awesome-dsh-plugin \
  --head "<you>:add/<repo>" --base main \
  --title "add <owner>/<repo> (<cat>)" \
  --body-file pr-body.md
```

PR body 参考：

```markdown
Add [<owner>/<repo>](url) to the **<分类名>** category.

- url: <url>
- category: `<cat>`
- description.en + description.zh included
- READMEs regenerated (N entries)
- Repo declares `dsh.bundle` manifest, published on npm as `<npm-name>`
- `@deepseek-ai/*` packages declared as optional peerDependencies
- `dsh-plugin` topic added to repo
```

## 6. 验证

```sh
gh pr view <num> --repo awesome-dsh-plugin/awesome-dsh-plugin \
  --json mergeable,mergeStateStatus,commits,changedFiles,additions,deletions
# 期望：MERGEABLE / CLEAN / 1 commit / 3 files / +N -0

gh pr checks <num> --repo awesome-dsh-plugin/awesome-dsh-plugin
# 期望：check pass + Submission gate pass（awesome-lint 在跨仓库上下文跑，读上游 topics 才通过）
```

> 教训：`awesome-lint` 的 `awesome-github` 规则读**当前 git remote 仓库**的 topics。
> 上游已有 `awesome` + `awesome-list` topics；fork topics 为空 → 在 fork 里跑 CI 必挂
> （`should have "awesome" as a GitHub topic`）。所以 PR 必须建到上游仓库（跨仓库 PR）。

> 另一种红法：`check → Build (locale parity, date derivation, templates)` 失败，日志里
> `no added-date derivable for: …` 报的 URL **不是你这次加的条目**。那是 main 侧的历史/数据问题，
> 改自己的分支没有意义 —— 见文末 **附录 B**。

## 7. 收尾

- 关闭误建的 fork 内部 PR（`gh pr close <num> --repo <you>/awesome-dsh-plugin`）。
- 清理临时文件（pr-body.md）、本地多余分支。

---

## 附加：npm 包 README 安装说明（input-traffic 风格）

投稿后记得让仓库与 npm 包的 README 包含 **npm 安装说明**（参考 `dsh-input-traffic` 风格）。

```sh
# 方式一：从 npm 安装（推荐）
#   （profile 是 pnpm workspace root，add 需带 -w 参数）
dsh plugin --profile web add <npm-name> -w

# 方式二：git 或本地路径组装
# dsh plugin --profile web add github:<owner>/<repo>#<tag> -w
#    （git 安装后需在 profile 的 node_modules 内现场构建：npm install --legacy-peer-deps && npm run build）

# 确认组合树包含新行
dsh web --dump-config | grep -B1 -A2 '<repo>'

# 重启 dsh web —— 必做！运行中实例不热载 bundle 层
dsh web
```

发布 npm（README 跟随发布）：

```sh
npm whoami                 # 确认登录
npm version patch --no-git-tag-version
npm publish --dry-run      # 预览
npm publish                # 正式发布（走代理）
git add package.json && git commit -m "chore: bump to x.y.z" && git push
npm view <npm-name> version readme   # 验证 README 已更新
```

> 踩坑记录：dsh-session-search-toggle 曾以 `dsh-switch-search` 为 GitHub remote（SSH），
> SSH publickey 不通；改 `git remote set-url origin https://...` 后经代理正常推送。

## B.1 投稿前仓库自查清单（contributing.md 强制要求）

| 条目 | 说明 | 检查命令 |
|------|------|----------|
| `dsh.bundle` manifest | `package.json` 必须声明 `dsh.bundle`（仅 `dsh.client` 会被 CI 拒绝） | 见下方 §B.2 |
| `@deepseek-ai/*` peerDeps | 必须 `peerDependencies`（非 `dependencies`），推荐 `optional` 标记避免宿主版本硬约束 | 见下方 §B.3 |
| `dsh-plugin` topic | 仓库必须添加此 topic，否则 CI 不通过 | `gh api repos/<owner>/<repo>/topics | ConvertFrom-Json | names` |
| 仓库年龄 ≥ 1 天 | CI 自动检查，新仓会被拒绝 | `git log --format=%ai -1` |
| 真实可运行代码 | 占位仓 / 纯 README 仓不收 | — |
| 描述与代码一致 | 夸大理是主要拒稿原因（写了 "46 个工具" 就必须真有 46 个） | 人工核对 |
| 每个 PR ≤ 3 条 | 超量 CI 拒绝，需拆分 | — |

## B.2 `dsh.bundle` manifest 完整示例

> 常见拒稿原因：只声明了 `dsh.client`。这还不够，`dsh.bundle` 是必需的。

```jsonc
{
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }     // 仅带前端 UI 时需要
  }
}
```

旁边必须放 `cordis.patch.yml`：

```yaml
- insert:
    - id: your-plugin-id
      name: your-package-name
```

## B.3 `@deepseek-ai/*` peerDependencies — 版本支持声明（关键！）

> 来源：[awesome-dsh-plugin/contributing.md — @deepseek-ai/* packages as peerDependencies](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md#how-submissions-are-reviewed--%E6%94%B6%E5%BD%95%E5%A6%82%E4%BD%95%E8%AF%84%E5%AE%A1)
> 参照实战：[drscrewdriver/dsh-input-traffic](https://github.com/drscrewdriver/dsh-input-traffic)（通过审核的 cordis bundle 插件）

**必须**把 `@deepseek-ai/*` 官方包声明为 `peerDependencies`（不是 `dependencies`）。

### 版本适配机制

DSH 插件的宿主版本兼容性**不由 peerDependencies 控制**，而是由插件使用的 cordis API 稳定性决定。peerDependencies 的真正用途是：

1. **开发期类型检查**（TypeScript / IDE 解析）
2. **npm 安装时提示版本不匹配**（仅当 `optional` 标记关闭时才会报错）

### 两种写法

**写法 A — `optional: true`（主流，如 dsh-input-traffic）**
所有 `@deepseek-ai/*` 标为 optional，用户装在任何 DSH 版本都不会因 peer 解析失败。`^x.y.z-rc.N` 范围足以。

```jsonc
"peerDependencies": {
  "@deepseek-ai/cordis": "^4.0.1",
  "@deepseek-ai/dsh-client-locale": "^0.1.0-rc.5",
  "@deepseek-ai/dsh-client-runtime": "^0.1.0-rc.5",
  "@deepseek-ai/dsh-client-ui-conversation": "^0.1.0-rc.5"
},
"peerDependenciesMeta": {
  "@deepseek-ai/cordis":          { "optional": true },
  "@deepseek-ai/dsh-client-locale": { "optional": true },
  "@deepseek-ai/dsh-client-runtime": { "optional": true },
  "@deepseek-ai/dsh-client-ui-conversation": { "optional": true }
}
```

**写法 B — 非 optional（需要强制版本匹配时使用）**
contributing.md 的 prerelease 建议**仅在非 optional 时生效**。`^0.1.0-rc.5` 展开为 `>=0.1.0-rc.5 <0.2.0`，不含 prerelease 标签的稳定版本（如 `0.1.0`）会被静默排除。

```jsonc
// ❌ 稳定版 0.1.0 无法匹配（ERESOLVE）
"peerDependencies": { "@deepseek-ai/dsh-tools": "^0.1.0-rc.5" }

// ✅ 用 || 分支覆盖 stable + prerelease
"peerDependencies": {
  "@deepseek-ai/dsh-tools": ">=0.0.1-rc.1 <0.1.0 || >=0.1.0-rc.1 <0.2.0-0"
}
```

> **趋势**：实际被收录的 cordis bundle 插件（如 `dsh-input-traffic`）全部采用 optional 写法，不强制版本约束。你的插件用哪种取决于你是否需要保证用户宿主版本一致——大多数情况下不需要。

### 版本范围速查

| 范围写法 | 匹配示例 | 稳定版匹配 | 说明 |
|---------|---------|-----------|------|
| `^0.1.0-rc.5` | `0.1.0-rc.5` ~ `0.1.9-rc.x` | ❌ | caret + prerelease，stable 被排除 |
| `>=0.0.1 <0.2.0` | `0.0.1` ~ `0.1.999` | ✅ | 无 prerelease 标签，stable 和 rc 都行 |
| `>=0.0.1-rc.1 <0.1.0 \|\| >=0.1.0-rc.1 <0.2.0` | 所有 rc | ✅ | 显式分支，最安全 |
| `~0.1.0` | `0.1.0` ~ `0.1.999` | ✅ | patch-level 兼容 |
| `>=0.1.2-rc.1 <0.2.0-0` | `0.1.2-rc.1` ~ `0.1.4-beta.x` | ✅ | 0.1.2 档；**匹配不到 `0.1.5-rc.2`** |
| `>=0.1.5-rc.2 <0.2.0-0` | `0.1.5-rc.2` | ✅ | 0.1.5 档；范围里必须含同元组 prerelease 比较器 |

### 宿主档位与「字段源头」三处

DSH 的宿主版本要求写在**三个地方**，一条线只有三处**逐字符一致**才自洽：

| 代号 | 字段 | 校验时机 |
|---|---|---|
| **F1** | `package.json → engines.dsh` | npm 安装时 |
| **F2** | `package.json → peerDependencies` 中的 `@deepseek-ai/dsh-client-*` | npm 安装时 |
| **F3** | `dsh.plugin.json → engines.dsh` | ⚠️ **实测为惰性——DSH 0.1.5-rc.2 宿主从不读该文件** |

外加 `dsh.plugin.json → version` 应与 `package.json → version` 保持一致。

> ⚠️ **实测更正（2026-09-20）**：对已安装宿主 `@deepseek-ai/*` v0.1.5-rc.2 全树核查，
> **17,567 个文件 / 239 个宿主包中 `dsh.plugin.json` 零命中**；宿主清单类型 `DshManifest`
> 只描述 `package.json → dsh` 的 6 个字段（`bundle`/`profile`/`client`/`configTrees`/
> `sessionFormatMigration`/`moduleFallback`），**不含 `engines` / `version`**。
> 因此 **F3 不是运行时校验**，只是元数据卫生；真正生效的是 **F1（npm 安装期）与 F2（peer 解析期）**。
> 发版时漏 bump `dsh.plugin.json` 不会导致宿主行为异常，但会让第三方目录站/工具读到错的版本号。

宿主按严格 semver 预发布匹配分成三个**互斥**档位：

| 档位 | 代表宿主 | 建议 F1 / F3 |
|---|---|---|
| 0.1.1 档 | `0.1.0-rc.7` ~ `0.1.1-rc.x` | `>=0.0.1 <0.2.0`（不带 prerelease 标签） |
| 0.1.2 档 | `0.1.2-rc.1` ~ `0.1.4-beta.1` | `>=0.1.2-rc.1 <0.2.0-0` |
| 0.1.5 档 | `0.1.5-rc.2` | `>=0.1.5-rc.2 <0.2.0-0` |

> ⚠️ 因为预发布匹配要求范围里存在**同元组**的 prerelease 比较器，
> `>=0.1.2-rc.1 <0.2.0-0` 匹配不到 `0.1.5-rc.2` —— **0.1.2 档与 0.1.5 档必须拆成两条产物线**
> （各自 git 分支 + 各自 dist-tag），不能靠一份产物支援两代宿主。
> 同理 `>=0.1.0-rc.7 <0.2.0-0` 匹配不到任何已发布的 `0.1.1-rc.x` / `0.1.2-rc.x`。
>
> ⚠️ 也**不是每个包都有三层**：新包可能只做 0.1.5 档，或从 0.1.2 档起。
> 以该包 npm `dist-tags` 上**实际存在的线标签**为准，不要替包发明不存在的档位。

## B.4 不发 npm 时的 tarball 方案

如果不发布到 npm，可以把预构建 tarball 附加到 GitHub Release，在条目 YAML 中用 `tarball:` 字段指向它：

```yaml
tarball: https://github.com/owner/repo/releases/latest/download/your-plugin.tgz
```

规则：
- 必须是 GitHub Release 托管的 `https` `.tgz`
- `latest/download/` 只在请求时解析 `latest`，**文件名照字面取**
  - 如果资产名带版本号，`latest/download/plugin-1.0.0.tgz` 在下一次发版后 404
  - 要么资产名不带版本（如上方），要么钉住 release tag：

```yaml
# 钉住 tag —— 不会腐烂，文件名带版本也没关系
tarball: https://github.com/owner/repo/releases/download/v1.2.0/your-plugin-1.2.0.tgz
```

## B.5 多版本插件投稿（DSH 大版本不兼容时）

> 来源：`dsh-session-search-toggle` 实战——DSH 0.1.2 移除了 `dsh-client-runtime`，
> 插件客户端 bundle 需要导入不同包名，无法用单一版本同时兼容。

### 问题场景

DSH 在 0.1.2-alpha.2 做了客户端包重构：

| DSH 版本 | 可用包 | 已废弃 |
|---|---|---|
| ≤ 0.1.1-rc.2 | `dsh-client-runtime` | — |
| ≥ 0.1.2-rc.1 | `dsh-client-store` | `dsh-client-runtime` |

**结果**：插件的 `import defineStore` 在不同 DSH 版本中需要指向不同包名，单一 npm 版本无法同时兼容。

### 解决方案：同名多版本

**同一 npm 包名**，通过 semver 版本区分兼容范围：

```
npm 包名：dsh-session-search-toggle
├── 0.1.0  →  DSH ≤ 0.1.1  (dsh-client-runtime)
└── 0.1.1  →  DSH ≥ 0.1.2  (dsh-client-store)
```

用户通过 `dsh plugin add <pkg>@<version>` 选择版本。

### 操作步骤

#### 1. 锁定旧版（关键！先打 tag 再改代码）

```sh
# 在旧版代码上 commit + tag
git tag -a v0.1.0 -m "v0.1.0: DSH ≤ 0.1.1"
git push origin v0.1.0

# ⚠️ npm 版本不可变——已发布的 0.1.0 无法覆盖
# 如果还没发布，先 npm publish --access public
```

#### 2. 叠加新版修改

```sh
# 修改 src/client/index.ts 的 import
# 旧：import { defineStore } from '@deepseek-ai/dsh-client-runtime/client'
# 新：import { defineStore } from '@deepseek-ai/dsh-client-store'

# 修改 package.json
# - version: 0.1.1
# - peerDependencies: dsh-client-runtime → dsh-client-store
# - dsh.client.inject: 移除 dsh-client-runtime

# 修改 dsh.plugin.json
# - version: 0.1.1
# - engines.dsh: >=0.1.2-rc.1

# 修改 tsdown.config.ts
# - externals: 替换为 dsh-client-store，删除死外部依赖
```

#### 3. commit + tag 新版

```sh
git add -A
git commit -m "v0.1.1: 迁移到 dsh-client-store，支持 DSH 0.1.2+"
git tag -a v0.1.1 -m "v0.1.1: DSH ≥ 0.1.2"
git push origin v0.1.1
```

#### 4. 发布新版 npm

```sh
npm publish --access public
npm view dsh-session-search-toggle versions
# 应显示: ["0.1.0", "0.1.1"]
```

#### 5. 更新 awesome-dsh-plugin 条目

在 `data/plugins/<owner>__<repo>.yml` 中添加版本说明：

```yaml
url: https://github.com/<owner>/<repo>
name: <owner>/<repo>
category: session
description:
  en: 'DSH web sidebar session search: title/content toggle with type filters'
  zh: 'DSH web 侧边栏会话搜索增强：标题/内容一键切换，按用户/回复/工具筛选'
notes: |
  **版本兼容**：
  - 0.1.0 → DSH ≤ 0.1.1（`dsh plugin add dsh-session-search-toggle@0.1.0`）
  - 0.1.1 → DSH ≥ 0.1.2（`dsh plugin add dsh-session-search-toggle@0.1.1`）
```

### 版本锁定机制

每个版本通过两处元数据声明兼容范围：

| 元数据位置 | 字段 | 作用 |
|---|---|---|
| `package.json → peerDependencies` | `dsh-client-store >=0.1.2-rc.1` | npm 安装时版本校验 |
| `dsh.plugin.json → engines.dsh` | `>=0.1.2-rc.1` | DSH 运行时版本校验 |

### 验证清单

- [ ] v0.1.0 tag 存在，package.json 版本正确
- [ ] v0.1.1 tag 存在，package.json 版本正确
- [ ] 0.1.1 的 `engines.dsh` 声明为 `>=0.1.2-rc.1`
- [ ] 0.1.1 的 peerDependencies 使用新包名
- [ ] 0.1.1 的 dsh.client.inject 不包含旧包名
- [ ] README 顶部版本兼容矩阵已更新
- [ ] awesome-dsh-plugin 条目包含版本矩阵
- [ ] npm publish 成功（`npm view` 验证）
- [ ] 在旧版 DSH 上测试 0.1.0 安装成功
- [ ] 在新版 DSH 上测试 0.1.1 安装成功

---

## B.6 npm 包与仓库关联（非必须但推荐）

- 已发布包的 `repository` 字段**必须**指回 awesome-dsh-plugin 列表中的仓库，否则两者不关联
- 映射从 registry 自动采集，条目 YAML 里手写 `npm:` 会被拒绝
- 没有 npm 包也一样：条目照常工作，只是没有下载量数据

---

# 附录 A：目录卡片截图 / 图片投稿指南（screenshots）

> 依据 `BananaSoldier01/dsh-tidychat` 的落地方式 + 目录仓库 `scripts/build-site.mjs` /
> `scripts/probe-screenshots.mjs` / `scripts/prune-legacy-screenshots.mjs` 的规则整理，
> 供给目录条目加卡片截图时参考。图片放在「插件自己仓库」优于「目录仓库」，后者只是兼容旧条目。

## A.1 两条硬规则（build-site / probe-screenshots 强制）

1. **key 必须与 README 条目链接完全一致**，否则 build 报
   `"<url>" is not a listed entry URL (keys must match the README entry link exactly)`。
   - 例：README 链接是 `https://github.com/BananaSoldier01/dsh-tidychat`，
     则 screenshots 的 key 必须是这同一个 URL；多一个 `/dshmobile-plugin` 尾巴都不行（dshmobile 因此 CI 红）。
2. **每条目最多 8 张**（`MAX_SHOTS=8`）；图片必须 HTTPS 且托管在 GitHub：
   `raw.githubusercontent.com / user-images.githubusercontent.com / camo.githubusercontent.com / github.com`。
   非法 host 或超数量会被拒绝（数多为「死链」也会被 `probe-screenshots` 标出并剔除）。

## A.2 两种声明方式（优先装上面那种）

### 方式一：插件自己仓库声明（推荐，新机制，可覆盖目录侧）
在插件仓库**根目录**（包目录，`screenshots.json` 放 `package.json` 旁）放一个文件，合法形态任选其一：
```jsonc
// 1) 纯路径数组
["assets/navigator.png", "assets/settings.png"]
// 2) {"screenshots": [...]}
{ "screenshots": ["assets/navigator.png"] }
// 3) 单 key map：key = 条目 URL
{ "https://github.com/<owner>/<repo>": ["assets/navigator.png"] }
```
`probe-screenshots.mjs` 从 `https://raw.githubusercontent.com/<repo>/HEAD/<sub>/screenshots.json`
读取并校验存活；**有效则覆盖**目录侧的 legacy 条目。此时图片用相对路径，会解析成 raw 绝对链接。

### 方式二：目录仓库 centralized（legacy，仅旧条目/不声明者）
在 `awesome-dsh-plugin/data/screenshots.json` 加一条（`key = README 链接`，值是 raw 绝对数组）：
```json
"https://github.com/BananaSoldier01/dsh-tidychat": [
  "https://raw.githubusercontent.com/BananaSoldier01/dsh-tidychat/main/assets/navigator.png"
]
```
一旦作者走方式一，`prune-legacy-screenshots.mjs` 会把这条移除。

## A.3 落地步骤（以本插件为例）

```sh
# 1) 把真图放进插件仓库 assets/（当前只有 .gitkeep 占位，需放真实截图）
#    e.g. assets/chat-vision.png  assets/settings-capability.png
# 2) 在插件仓库根提交 screenshots.json（方式一，推荐）
#    ["assets/chat-vision.png", "assets/settings-capability.png"]
# 3) 推送插件仓库 main
# 4) 目录侧无需改 data/screenshots.json（方式一自动读插件仓库）
# 5) 重新生成并校验 README：node scripts/generate-readme.mjs --check
# 6) 提交/推送目录分支，PR CI 会跑 probe-screenshots 校验图片存活
```

## A.4 现状与待办（dsh-llm-openai-completions）

- 目前 `assets/` 只有 `.gitkeep`（无真实截图），目录条目也**未关联任何图片**。
- 待做：放 2–3 张说明截图到 `assets/`，按 A.3 方式一提交 `screenshots.json`，让投稿卡片带图。
- 注意：`package.json` 的 npm `files` 列表不含 `screenshots.json`，但目录探测读的是 git 仓库的
  `raw.githubusercontent.com/<repo>/HEAD/screenshots.json`，与 npm 发布无关，无需把它加进 files。

---

# 附录 B：CI 红在 `no added-date derivable`，但报的 URL 不是你加的条目

> 记录 2026-09-11 定位的 main 侧故障（PR [#4821](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/4821) 修复）。
> 触发场景：自己的 PR 内容完全没问题，CI 却在 `Build` 步骤报别人条目的日期推不出来。
> 想看"为什么会这样"的通俗解释和防复发清单，见同目录 `日期推导事故复盘-人话版.md`。

## B.1 症状

```
3433 entries parsed across 2 locales
no added-date derivable for: https://github.com/wwweljf/dsh-plugins/tree/master/plugins/dsh-ding-sound, https://github.com/wwweljf/dsh-plugins/tree/master/plugins/dsh-wx-push, https://github.com/wwweljf/dsh-plugins/tree/master/plugins/dsh-wx-remote
need full git history (fetch-depth: 0) and committed entries — refusing to build
##[error]Process completed with exit code 1.
```

- 固定失败在 `check → Build (locale parity, date derivation, templates)`（即 `node scripts/build-site.mjs`），
  它前面的 `Stale-fork guard` / `Entry files live in data/plugins/` / `READMEs match data/plugins` / `awesome-lint` 全绿；
- 这类失败**不是**"README 分号/分隔符/双语不一致"那类贡献者可修的问题，报错文本里的 URL 就是答案。

## B.2 先判断是不是自己的问题（30 秒）

| 观察 | 结论 |
|---|---|
| 报错 URL 不是自己 PR 里的条目 | 与你的提交无关，是 main 侧的历史/数据洞。**不要**为了变绿去动自己的分支或手改 README |
| 同一时间别人的 PR 也在红，且失败步骤相同 | main 已经坏了，不是你的锅 |
| 老 PR 的 re-run 反而是绿的 | re-run **复用旧的 merge ref**（那时 main 还没坏）；新建 merge ref 的 PR 才红 |

判断 main 是否坏了：

```sh
gh run list --repo awesome-dsh-plugin/awesome-dsh-plugin --workflow build-site.yml --limit 8
# 若 main 上连续的 push / schedule build 全是 failure → 故障在 main，贡献者无从绕过
```

## B.3 根因：日期有三个来源，而 `git log` 默认不看 merge

`added`（卡片上的"加入日期"）在 `scripts/build-site.mjs` 里按顺序取三处：

1. `data/added-dates.json` —— 人工基线 / 人工迁移（文件头注释写明了它的职责）；
2. README 历史：`git log -p -- README.md`，某 URL 第一次以 `+` 行出现的那个 commit；
3. 条目 yml 历史：`git log --diff-filter=A -- data/plugins/<file>.yml`。

关键点：**`git log` 对 merge commit 默认不输出 diff**（需要 `-m` / `--diff-merges=…`）。
当某条目"是在 merge commit 里被创建出来的"，第 2、3 处就同时失效 → 若它也不在第 1 处 → `refusing to build`（脚本故意不拿 "now" 兜底，否则产物每次构建都会漂）。

本次实例 —— #2662（2026-09-08T15:01:39Z，merge commit `5599809cf`，`parents=2`）：

| | 分支上的 commit | main 上的结果 |
|---|---|---|
| 条目文件 | `wwweljf__dsh-plugins--dsh-ding-sound.yml`（如今在 main 上 404） | `...--plugins-dsh-ding-sound.yml`（URL 是 `/tree/master/plugins/…`，slug 不同） |
| README 行 | 4 个分支 commit **一个都没碰 README** | 由 **merge commit 本身**写入（`README.md` +3） |

即：合并时的 resolution 完成了"改名到正确 slug + 重生成 README 那几行"，而这两件事都只存在于 merge 里。

一条命令自查（命中即此坑）：

```sh
gh api "repos/awesome-dsh-plugin/awesome-dsh-plugin/commits?path=data/plugins/<slug>.yml" \
  | jq '.[] | {sha: .sha[0:9], date: .commit.committer.date, parents: (.parents|length)}'
# 期望：只有一条记录，且 parents=2
```

## B.4 修复（两层：先解封，再防复发）

**A. 人工基线（立刻解封，推荐先做）** —— 往 `data/added-dates.json` 补 URL → 日期（用条目真正落到 main 的那天）：

```json
 "https://github.com/wwweljf/dsh-plugins/tree/master/plugins/dsh-ding-sound": "2026-09-08",
 "https://github.com/wwweljf/dsh-plugins/tree/master/plugins/dsh-wx-push": "2026-09-08",
 "https://github.com/wwweljf/dsh-plugins/tree/master/plugins/dsh-wx-remote": "2026-09-08"
```

**B. 让推导穿得过 merge（防复发）** —— 第 3 处来源加 `--diff-merges=first-parent`：

```js
const out = execSync(`git log --diff-merges=first-parent --diff-filter=A --format=%cI -- ${JSON.stringify(file)}`,
  { encoding: 'utf8' }).split('\n').map((l) => l.trim()).filter((l) => /^\d{4}-\d{2}-\d{2}T/.test(l))
const iso = out[out.length - 1]
```

两个必须注意的点：

- 加了 `--diff-merges=first-parent` 之后，merge 会**顺带把 patch 一起打出来**。原来的
  `.filter(Boolean)` 会把 `+url: https://…` 当成日期 → `new Date(...)` 抛错 → 外层 `catch` 静默吞掉 →
  **依旧是 `no added-date derivable`**（看起来像 shallow clone，极难查）。所以必须只保留 `^\d{4}-\d{2}-\d{2}T` 的行。
- 只改第 3 处（yml 兜底），**不要**给 README 遍历也加这个 flag：那会让每个 merge 的 patch 进入输出，
  体积/耗时不可控；而且"已发布日期的值不要变"本身就是这段代码的既有原则。

**本地验证（不必等 CI）**：造最小仓库复现形状 —— 分支 commit 加文件（旧名）+ README 行 → main 前进
→ `git merge --no-commit --no-ff` 后改名并重写 README 行 → 提交 merge。实测：

| | 旧代码 | 打完补丁 |
|---|---|---|
| `git log --diff-filter=A -- <条目文件>` | 空 | merge 的日期 |
| README 遍历（同一 URL） | `<NONE>` | 不变（故意不改） |

本机脚本：`<ws>\_daterepro.ps1`（原为机器绝对路径，2026-10-11 按可移植纪律泛化；`<ws>`=知识库所在工作区根。会在 `_tmp_datederive\` 造一个临时仓库并打印上面这张表）。

## B.5 修好之后，红着的 PR 怎么变绿

- **re-run 没用**：GitHub 会复用同一个 merge ref（里面还是坏掉的 main）。必须让分支产生新事件：
  push 一个空 commit，或 PR 页面点 **Update branch**，`refs/pull/N/merge` 才会重算。
- 贡献者没有 upstream push 权限时只能开 PR。本次：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/4821
  （`data/added-dates.json` 补 3 条 + `scripts/build-site.mjs` 打补丁；维护者也可只 cherry-pick 前者）。

## B.6 时间线（本次事故）

| 时间 (UTC) | 事件 |
|---|---|
| 2026-09-08 15:01 | #2662 以 merge commit `5599809cf` 合并；同一秒触发的 `build-site` push build 失败 |
| 2026-09-09 / 09-10 | 两次 nightly `Build site from README` 失败 —— Pages 一直停在旧产物 |
| 2026-09-10 19:17 | PR #4687（`dsh-perm-gate` + `dsh-date-wrapper`）的 `check` 因这 3 个 URL 失败，PR 本身无罪 |
| 2026-09-11 | 定位（merge-only 引入）→ 补基线 + 打补丁 → PR #4821 |

## B.7 把红掉的投稿分支修回"可合并"

## 判断顺序（先别急着 rebase）

1. `gh pr view <num> --json mergeable,mergeStateStatus` —— 只看 check 红、`mergeable: MERGEABLE` 的话不用动分支历史；
2. 若 `CONFLICTING`，先确认冲突出在哪个文件（`git merge-tree --write-tree origin/main <pr-head>`，无冲突时只打印一个 tree hash，有冲突会列出 stage 1/2/3 条目）。**投稿分支带 README 改动**是最常见的冲突源：README 是生成物，main 每合一个 PR 就重写一遍；
3. 修分支（本次 #4687 实录）：

```sh
git fetch origin main
git checkout -B fix <原 PR head 的第一个 commit>   # 只取"作者自己的那个提交"
git rebase origin/main                            # 冲突时用 main 的 README，随后重新生成
node scripts/generate-readme.mjs --check           # 期望 up to date（顺序不对就先跑一次不带 --check 的）
```

4. **往 `data/added-dates.json` 之类的"末尾追加型"文件加行时，一定要基于当前 main 的版本再加**：
   否则两边都在文件尾追加 → `merge-tree` 直接报 `data/added-dates.json` 三段冲突（本次第一版补丁正是这么踩的）。
   做法：`git checkout origin/main -- data/added-dates.json` 之后再追加、再提交；
5. 本地跑一遍 CI 的那条命令（有完整历史时才有意义），绿了再推：

```sh
npm ci
$env:SKIP_PUBLISH_CHECKS='1'; node scripts/build-site.mjs   # 期望 "site built: N rows × 2 locales"
```

6. 推送（`--force-with-lease` 的旧 sha 必须从远端读，别手拼）：

```sh
gh api repos/<you>/awesome-dsh-plugin/git/ref/heads/<branch> --jq .object.sha
git push --force-with-lease="refs/heads/<branch>:<远端 sha>" <fork> HEAD:refs/heads/<branch>
```

> 推完 head 变了 → merge ref 重算 → check 才会用新 main/新内容重跑；只看 `gh pr view --json mergeable,mergeStateStatus` 确认回到 `MERGEABLE`（`UNSTABLE` 表示 checks 还在跑）。
> 本次 #4687 的最终形状：rebased 到当前 main + 额外一个 `fix(date-ledger)` 提交，5 files / +20 -1 / 2 commits，本地 build 全绿。

---

# 附录 C：让 fork 的 main 与 upstream 可同步

fork 的 main 一旦与 upstream diverged，GitHub 的 **Sync fork** 就只能"丢弃提交"，而从它建分支开会带上上千个 commit（见 §2 踩坑：ahead 1443）。

**先量差距**（跨 fork 比对，一条命令）：

```sh
gh api "repos/<you>/awesome-dsh-plugin/compare/awesome-dsh-plugin:main...main" \
  | jq '{status, ahead_by, behind_by}'
```

本机实测（2026-09-11 之前）：`diverged / ahead_by 1443 / behind_by 5465`。
把 ahead 的提交捞出来看，全是 **2026-08-16 的旧快照**（都是带 PR 号的 upstream 合并，之后 fork main 再没动过）
→ 没有独有工作，可以安全对齐：

```sh
git fetch https://github.com/<you>/awesome-dsh-plugin.git main
# 用 --force-with-lease 钉住"我看到的旧 sha"，避免覆盖期间别人的推送
git push --force-with-lease=refs/heads/main:<旧 sha> \
  https://github.com/<you>/awesome-dsh-plugin.git <upstream>/main:refs/heads/main
```

验证：

```sh
gh api "repos/<you>/awesome-dsh-plugin/compare/awesome-dsh-plugin:main...main" | jq '{status, ahead_by, behind_by}'
# 期望：identical / 0 / 0 —— 此后 Sync fork 就是 fast-forward
```

> 注意两点：① 没权限的话别 force —— 用 GitHub 网页的 **Sync fork → Discard commits** 等价；
> ② force 之前先确认 fork 上没有正在用的分支基于旧 main（`gh pr list --repo <you>/awesome-dsh-plugin --state open`），
> 本次检查结果为空，所以直接对齐。

