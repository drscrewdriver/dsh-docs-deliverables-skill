# registry 与 dist-tag 契约条款页

> 溯源｜自 `improve-dsh-plugins/13-发版计划-2026-10-家族节批次.md` §0「零号发现」（2026-10-08 双源复核，npmjs 权威）+ compat-0.2.0 批次审计抽出的**契约条款**；13 号其余一次性批次内容不收录。核验日期 2026-10-11。

## R1 registry 双钉（runtime 事故级）

- 现象前提：`~/.npmrc` 默认 `registry=https://registry.npmmirror.com`，而 auth token 只配置在 `//registry.npmjs.org/`。
- **条款**：`publish` 与 `view` 一律显式 `--registry=https://registry.npmjs.org`；`publishConfig` 无 registry 字段的仓裸 `npm publish` 会打向镜像（失败或错投）。
- 镜像同步延迟 ⇒ fresh publish 后查镜像 404/旧值：**publish 输出不可信、view 为准、view 必须钉源**。
- 读侧同理：`npm view <pkg> versions/dist-tags` 判发布态必须钉 npmjs，否则「未发布」误判（先例：guard 4.1.x 曾据镜像误判从未上线，10-08 双源复核勘误）。
- 代理污染案（llama.cpp 评测期实证）：环境代理可劫持 registry 流量——凡 registry 结论与本地文件状态矛盾，先查代理再改结论。

## R2 dist-tag 矩阵（分发层，安装 runtime 门禁无关——见 peer-adapt 裁决 1）

- `publishConfig.tag` 决定**不带 tag 的 install 拉到哪条线**；带旧线 tag 发新构建 = 该 tag 错指（实案：patch-edit-plus `tag=dsh-0.1.7` 若随 0.3.0 发布会把 dsh-0.1.7 指向 0.2.0 线构建）。
- 多线支持优先「单版本宽 peer + 枚举清单」（supportedHosts 模型），dist-tag 仅作选版指引，**不承担兼容性门禁**（门禁唯一开关=peer range）。
- 通用插件 `latest` 语义核对：stable 版本若 engines/peer 锁死单线（实案 steward 0.5.1 仅 0.2.0），推 latest 会断老线回归——pre-release 多线版反而是安全现状。发版批次逐仓核对后再动 latest。

## R3 发版批次流程（先例范式）

`发布闸=用户 2FA（人工）` → 依赖面小的先（IT→guard→TL→steward）→ 每仓 publish 后钉源 view 复核 → 下一仓。回滚纪律见 `rollback.md`（compat 批次）。
