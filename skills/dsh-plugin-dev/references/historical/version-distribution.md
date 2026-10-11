>= ⚠ HISTORICAL｜F3 dsh.plugin.json 段已被闸门裁决取代（宿主不读该文件）；engines 作为「加载器预检闸门」表述同案废止。分发矩阵本体仍可用。

# DSH 插件多版本分发策略

> 适用场景：一个插件需要同时支持 DSH 不同大版本（如 0.1.1 和 0.1.2+），且两者的客户端依赖包不兼容。

---

## 一、问题背景

DSH 在 0.1.2-alpha.2 做了客户端包重构：

| 版本 | 可用包 | 已废弃 |
|---|---|---|
| DSH ≤ 0.1.1-rc.2 | `dsh-client-runtime` | — |
| DSH ≥ 0.1.2-rc.1 | `dsh-client-store` | `dsh-client-runtime` |

**结果**：插件的客户端 bundle 在不同 DSH 版本中需要导入不同的包名，无法用单一版本同时兼容。

---

## 二、分发方案：同名多版本

### 2.1 核心思路

**同一 npm 包名** `dsh-session-search-toggle`，通过 semver 版本区分兼容范围：

```
npm 包名：dsh-session-search-toggle
├── 0.1.0  →  DSH ≤ 0.1.1  (使用 dsh-client-runtime)
└── 0.1.1  →  DSH ≥ 0.1.2  (使用 dsh-client-store)
```

用户通过 `dsh plugin add dsh-session-search-toggle@<version>` 选择版本。

### 2.2 版本锁定机制

每个版本通过以下元数据声明兼容范围：

| 元数据 | 0.1.0 | 0.1.1 |
|---|---|---|
| `package.json → engines.dsh` | 无限制 | `>=0.1.2-rc.1` |
| `package.json → peerDependencies` | `dsh-client-runtime >=0.1.0` | `dsh-client-store >=0.1.2-rc.1` |
| `dsh.plugin.json → engines.dsh` | `>=0.0.1` | `>=0.1.2-rc.1` |

### 2.3 字段源头：宿主版本要求写在哪三个地方

上表的三个字段就是**宿主版本要求的唯一真源**。一条版本线只有在三处**逐字符一致**时才是自洽的：

| 代号 | 字段 | 校验时机 |
|---|---|---|
| **F1** | `package.json → engines.dsh` | npm 安装时 |
| **F2** | `package.json → peerDependencies` 中的 `@deepseek-ai/dsh-client-*` | npm 安装时（`optional: true` 时仅提示） |
| **F3** | `dsh.plugin.json → engines.dsh` | ⚠️ **实测为惰性元数据——DSH 0.1.5-rc.2 宿主从不读取该文件**（见下方警告） |

外加一条一致性约束：`dsh.plugin.json → version` 应当等于 `package.json → version`。

> ### ⚠️ 实测更正：`dsh.plugin.json` 目前不被宿主读取
>
> 2026-09-20 对已安装宿主 `@deepseek-ai/*`（v0.1.5-rc.2）做了全树核查：
>
> 1. **全树 17,567 个文件、239 个宿主包，`dsh.plugin.json` 零命中**（含嵌套 `node_modules`）。
> 2. 宿主清单类型 `@deepseek-ai/dsh-package-manifest` 的 `DshManifest` 只描述
>    **`package.json → dsh`** 的 6 个字段：`bundle` / `profile` / `client` / `configTrees` /
>    `sessionFormatMigration` / `moduleFallback` —— **没有 `engines`，也没有 `version` / `id` / `contributes`**。
>    该包自述即为「Shared type declarations for `package.json.dsh` configuration fields」。
> 3. 插件清点只解析 `package.json`（`dsh-plugin-package-inventory-deepseek`）。
>
> **推论**：`dsh.plugin.json` 的 `engines.dsh` **不构成运行时校验**，装载与版本判定完全走
> `package.json → dsh`（`dsh.bundle.patch` + `dsh.client`）与 npm 安装期的 `engines` / peer 解析。
>
> **因此**：F3 与 manifest `version` 的对齐属于**元数据卫生**（对第三方目录站、`dshmarket`、
> 未来宿主版本可能有意义），**不要把它当成安全门**。真正生效的是 **F1（npm 安装期）
> 与 F2（peer 解析期）**。
>
> 若未来宿主版本开始读取 `dsh.plugin.json`，本条需重新实测后更新。

### 2.4 宿主档位：0.1.1 / 0.1.2-rc / 0.1.5-rc.2

按 DSH 的**严格 semver 预发布匹配**规则，宿主分成三个互斥档位：

| 档位 | 代表宿主 | 建议 F1 / F3 | 触发原因 |
|---|---|---|---|
| **0.1.1 档** | DSH `0.1.0-rc.7` ~ `0.1.1-rc.x` | `>=0.0.1 <0.2.0`（**不带** prerelease 标签） | 客户端包名仍为 `dsh-client-runtime` |
| **0.1.2 档** | DSH `0.1.2-rc.1` ~ `0.1.4-beta.1` | `>=0.1.2-rc.1 <0.2.0-0` | `0.1.2-alpha.2` 客户端包重构：`dsh-client-runtime` → `dsh-client-store` |
| **0.1.5 档** | DSH `0.1.5-rc.2` | `>=0.1.5-rc.2 <0.2.0-0` | `0.1.5` 移除 `session.events` 数组访问器，须改走 `snapshotEvents()` |

> ⚠️ **预发布匹配是这里最容易踩的坑**：一个预发布版本（如 `0.1.5-rc.2`）只有当范围里存在
> **元组相同**（此处 `[0,1,5]`）且带 prerelease 的比较器时才会被匹配。
> 因此 `>=0.1.2-rc.1 <0.2.0-0` **匹配不到** `0.1.5-rc.2`，`>=0.1.0-rc.7 <0.2.0-0`
> 也**匹配不到**任何已发布的 `0.1.1-rc.x` / `0.1.2-rc.x`。
> 结论：**0.1.2 档与 0.1.5 档必须拆成两条产物线**（各自的 git 分支 + 各自的 dist-tag），
> 不能靠一份产物「同时支持两版本」。

> ⚠️ **不是每个包都有三层**。新包可能**只做 0.1.5 档**（无 0.1.1 / 0.1.2 老档），
> 也可能从 0.1.2 档起。判断依据是该包 npm `dist-tags` 上**实际存在几个线标签**，
> 不是本文档的模板。写文档时不要替包发明不存在的档位。

---

## 三、awesome-dsh-plugins 分发

### 3.1 README 条目格式

awesome-dsh-plugins 的 README.md 中，插件条目应包含版本矩阵：

```markdown
### [dsh-session-search-toggle](/dsh-session-search-toggle)
DSH web 侧边栏会话搜索增强：标题/内容一键切换，按用户/回复/工具筛选。

| 版本 | DSH 兼容 | 安装命令 |
|---|---|---|
| 0.1.0 | ≤ 0.1.1 | `dsh plugin add dsh-session-search-toggle@0.1.0` |
| 0.1.1 | ≥ 0.1.2 | `dsh plugin add dsh-session-search-toggle@0.1.1` |
```

### 3.2 投稿 PR 模板

```markdown
## 插件信息

- **名称**：dsh-session-search-toggle
- **npm**：[`dsh-session-search-toggle`](https://www.npmjs.com/package/dsh-session-search-toggle)
- **仓库**：https://github.com/drscrewdriver/dsh-session-search-toggle
- **描述**：DSH web 侧边栏会话搜索增强：标题/内容一键切换
- **版本线**：0.1.0 (DSH ≤0.1.1) → 0.1.1 (DSH ≥0.1.2)

## 版本兼容

本插件提供两个版本以适配 DSH 不同大版本：

| 版本 | DSH 范围 | 核心依赖 |
|---|---|---|
| 0.1.0 | 0.0.x ~ 0.1.1 | `dsh-client-runtime` |
| 0.1.1 | 0.1.2+ | `dsh-client-store` |

安装时请指定版本号以匹配你的 DSH 版本。
```

---

## 四、dshmarket 分发

### 4.1 插件元数据（marketplace.json 或等效格式）

```json
{
  "id": "dsh-session-search-toggle",
  "name": "会话搜索增强",
  "description": "DSH web 侧边栏会话搜索增强：标题/内容一键切换",
  "repository": "https://github.com/drscrewdriver/dsh-session-search-toggle",
  "npm": "dsh-session-search-toggle",
  "versions": [
    {
      "version": "0.1.0",
      "dshRange": ">=0.0.1 <=0.1.1-rc.2",
      "description": "旧版，使用 dsh-client-runtime"
    },
    {
      "version": "0.1.1",
      "dshRange": ">=0.1.2-rc.1",
      "description": "新版，使用 dsh-client-store"
    }
  ],
  "defaultVersion": "0.1.1"
}
```

### 4.2 自动版本匹配逻辑

marketplace 安装脚本伪代码：

```python
def install_plugin(plugin_id, dsh_version):
    versions = get_available_versions(plugin_id)
    
    # 按 DSH 版本降序排列，找到第一个兼容的版本
    for v in sorted(versions, reverse=True, key=parse_version):
        if dsh_version_matches(v.dshRange, dsh_version):
            run(f"dsh plugin add {plugin_id}@{v.version}")
            return
    
    raise Error(f"No compatible version of {plugin_id} for DSH {dsh_version}")
```

---

## 五、Git 分支策略

```
master (main)
├── v0.1.0 tag   ← 旧版锁定点
├── v0.1.1 tag   ← 新版（OldLigant cherry-pick）
└── 未来 v0.1.2  ← 新功能，继续基于 dsh-client-store
```

### 5.1 发布流程

```bash
# 1. 旧版 0.1.0 已发布（npm 上已存在）
# 无需重复发布，npm 版本不可变

# 2. 新版 0.1.1 发布
git checkout v0.1.1
pnpm install
pnpm build
npm publish --access public

# 3. 验证
npm view dsh-session-search-toggle versions
# 应显示: ["0.1.0", "0.1.1"]
```

### 5.2 未来版本规划

```
v0.1.2  ← 新功能（如高级搜索语法），继续 dsh-client-store
v0.2.0  ← 可能的大重构，评估是否需要新的依赖变更
```

---

## 六、常见问题

### Q: 两个版本共享同一 npm 包名，会冲突吗？

不会。npm 的 semver 机制天然支持多版本共存。用户通过 `@<version>` 指定安装哪个版本。

### Q: awesome-dsh-plugins 的 CI 如何验证两个版本？

CI 应在不同 DSH 版本环境下分别测试：
- DSH 0.1.1 + 插件 0.1.0 → 应成功
- DSH 0.1.2 + 插件 0.1.1 → 应成功
- DSH 0.1.2 + 插件 0.1.0 → 应失败（peerDep 不匹配）

### Q: 如果 DSH 未来又做了大的包重构怎么办？

重复上述流程：
1. 在当前版本打 tag
2. 适配新依赖，发布新版本
3. 更新 README 兼容矩阵
4. 更新 marketplace 的 versions 列表

### Q: 旧版本还会维护吗？

0.1.0 是"锁定"状态——不加新功能，只修安全漏洞。用户应尽快升级 DSH 到 0.1.2+ 并使用 0.1.1+。

---

## 七、验证清单

发布前逐项检查：

- [ ] 0.1.0 tag 已创建，package.json 版本正确
- [ ] 0.1.1 tag 已创建，package.json 版本正确
- [ ] 0.1.1 的 `engines.dsh` 声明为 `>=0.1.2-rc.1`
- [ ] 0.1.1 的 peerDependencies 使用 `dsh-client-store`
- [ ] 0.1.1 的 dsh.client.inject 不包含 `dsh-client-runtime`
- [ ] README 顶部版本兼容矩阵已更新
- [ ] awesome-dsh-plugins README 条目包含版本矩阵
- [ ] dshmarket 的 versions 列表已更新
- [ ] npm publish 成功（`npm view` 验证）
- [ ] 在 DSH 0.1.1 上测试 0.1.0 安装成功
- [ ] 在 DSH 0.1.2 上测试 0.1.1 安装成功

---

*参考：OldLigant/dsh-session-search-toggle@456909f，DSH 0.1.2-alpha.2 客户端包重构*
