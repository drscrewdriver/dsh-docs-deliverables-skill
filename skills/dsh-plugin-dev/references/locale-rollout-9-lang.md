> 溯源｜`_locale_rollout_spec`（9 语真源，取代四语规范 03/FILE-STRUCTURE 语言行）的冻结副本（2026-10-11），**2026-11-18 扩为 10 语真源（+ pt-BR）**。文件名中的 `9-lang` 为历史命名，内容以本页为准。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# Canonical multi-language locale rollout spec (VERIFIED, 10 languages)

Goal: give a DSH web-plugin repo a **complete, ACTIVE** multi-language setup — both
products the host consumes:
1. Client UI dictionary (`src/client/locales.ts` + `register`) → drives `t()` in the plugin UI.
2. Package metadata (`locale/<lang>.json`) → drives the plugin-manifest / market card title+description.
3. Doc mirrors (`README.<lang>.md` / `INSTALL.<lang>.md` / `CHANGELOG.<lang>.md`) → npm page + human reading.
4. Gates (in-repo `LANGS` arrays in `scripts/*` + tests) → parity of all of the above is enforced, not hoped for.

Verified against host source:
- `deepseek-harness/packages/client/locale/src/client/index.ts` — `register(ns, dicts)` untyped map
  overload accepts ANY BCP-47-style language id (`LOCALE_ID_PATTERN`), needs NO `addLanguage`,
  throws only on duplicate `(ns, locale)`. One map call activates every language.
- `deepseek-harness/packages/boot/app-boot/src/package-meta.ts` — `locale/en.json` is the ANCHOR;
  if absent the whole `locale/` dir is ignored. Each `<lang>.json` → `meta.title` / `meta.description`,
  each (if present) MUST be a non-empty string or it throws into the card `error`. Files resolved via
  `<pkg>/locale/<name>.json`, so `exports` MUST map `./locale/*.json`.

## HOST LANGUAGE REALITY (2026-11-19 实测 app.asar — 决定为什么是这 10 语)
- `@deepseek-ai/dsh-client-locale`: `LOCALE_IDS = ['zh','en']` (`locale-settings.ts:15`) — 宿主 UI 目前只能切这两种。
- `BUILT_IN_LOCALE_METADATA = { zh:{label:'中文', fallback:'en'}, en:{label:'English'} }` — 回落链 zh→en。
- 宿主包内 `locale/` 资源目录实发 8 语：de en es fr ja **pt** ru zh。**无 it、无 ko。**
- 推论①：`pt` 是宿主资源集里唯一长期被插件族 9 语门禁遗漏的语言 → 补 pt 是向官方生态对齐，不是扩边。
- 推论②：`it`/`ko` 属**生态外·保留待治理**——门禁保留（既有 README/CHANGELOG 译本有消费面），但无宿主 UI 消费路径，
  是否摘除是独立治理决策，本规范不擅自删。
- 推论③：插件注册 `pt` 运行时字典**当前不会被任何宿主 UI 加载**（locale 服务按 `LOCALE_IDS` 消费）。
  这是事实约束、不是阻塞项：`dsh-client-locale` peer 声明 + `register(ns, dicts)` 全量映射属无害前向兼容，
  宿主一旦开放语言集即刻生效。写规范/评审时按「已注册待宿主放行」表述，不要写成「已可切换」。

Working in-repo reference (named-export style, correct single registration):
`<ws>/mine-dsh-plugins/dsh-brief-sidebar/src/client/locales.ts` + `index.tsx`（金模板路径已泛化，`<ws>`=工作区根）。

## TARGET LANGUAGES (10)
`zh`, `en` (base) + `ja`, `ko`, `fr`, `de`, `it`, `ru`, `es`, `pt`。
（其中 `it`/`ko` = 生态外·保留待治理，见上推论②；`pt` = 2026-11-18 新入。）

**`pt` 拼写规范：巴西葡语（pt-BR）**——`não`/`você`/`arquivo`/`configuração` 一类；欧洲葡语形（`está`→pt-PT 偏好、`ficheiro`、`ecrã`）不用。全仓 pt 产物（字典/JSON/文档）拼写口径一致。

---

## (1) `src/client/locales.ts`

### Named-export style (repo already has `export const zh = {...}` / `export const en: ... = {...}`)
- Keep `export const NS = '<existing value>'` UNCHANGED.
- `zh` is the KEY-SET SOURCE OF TRUTH. Preserve every existing `zh` key + value EXACTLY.
  Do NOT invent keys not already used in the repo's `src/**`; do NOT drop keys.
- PRESERVE existing `en` / `ja` / `ko` / `fr` / `de` / `it` / `ru` / `es` values EXACTLY —
  never re-translate or degrade what already exists. Only ADD what is missing.
- Keep any existing key-type alias (e.g. `export type XKey = keyof typeof zh`, or `PermissiveKey`).
- For EACH missing language in {ja,ko,fr,de,it,ru,es,pt} add:
  `export const <lang>: Record<keyof typeof zh, string> = { ...every zh key, translated... }`
  (use the repo's existing alias instead of `keyof typeof zh` if it has one).
  Preserve placeholders (`{count}`, `{name}`, `{n}`, `{error}`, …) EXACTLY; reposition them
  naturally for the target language. Keep `«ёлочки»`/umlauts/accents correct — real orthography.
- **导出顺序 = 门禁数组顺序**：新语言（pt）必须是文件里**最后一个**语言 export；`dictionaries` 映射里同样排在最后。
  按 `LANGS[i]` 做 `indexOf(`export const <lang>`)` 切段的门禁（sidebar-fold `scripts/lint.mjs`）对顺序敏感，
  插错位置会静默错切键段。
- Ensure a combined map with ALL 10:
  `export const dictionaries: Record<string, Record<string, string>> = { zh, en, ja, ko, fr, de, it, ru, es, pt }`
  (if the repo already exports `dictionaries`, extend it to all 10).

### Map style (repo has `export const dictionaries: Record<string, Record<string,string>> = { en:{...}, zh:{...} }`)
- Add `<lang>: { ...same keys... }` entries INSIDE the existing `dictionaries` map for every
  missing language, so the map ends with all 10 keys: `en, zh, ja, ko, fr, de, it, ru, es, pt`.
- Use the existing `en` (or `zh`) key set as the source of truth; mirror keys exactly.
- Confirm the registration loop iterates all map entries (e.g. `for (const [tag, dict] of Object.entries(dictionaries))`)
  so every added language auto-activates. If it registers a hardcoded subset, fix it to cover all keys.

### 逐语言注册/语言清单面（部分仓另有第四面）
除 `dictionaries` 外，这些写法也算运行时面，漏一处即少一语：
- `ctx.locale.register(NS, 'es', es)` 逐语言列表 → 追加 `'pt', pt`（实案 dsh-thinking-levels）。
- `{ id: 'es', label: 'Español', dict: es }` 语言数组 → 追加 `{ id: 'pt', label: 'Português', dict: pt }`
  （实案 dsh-media-lens、dsh-context-compression-improved 的 selector 包）。
- `export const languages = [...] as const` / `export type SettingsLanguage = 'zh'|...|'es'` 及其
  `['zh','zh'], ['en','en'], …` 映射数组 → 两处各加 pt（实案 dsh-sidebar-fold、dsh-tidy-display）。

## (2) Registration — ONE call activates ALL 10 (this is the "active" fix)
- In the client entry (`src/client/index.ts` OR `index.tsx`):
  - import `{ NS, dictionaries }` from the locales module — MATCH the repo's existing import
    specifier/extension style (some use `'./locales'`, some `'./locales.ts'`).
  - Ensure `export const inject = [ ... ]` includes `'locale'`.
  - Register inside an effect, guarded so a throw can never escape the effect body:
    ```ts
    const locale = ctx.get('locale')      // OR ctx.locale — MATCH how this repo already reads services
    if (locale) ctx.effect(() => locale.register(NS, dictionaries), '<pkg-name>: dictionaries')
    ```
  - REMOVE/REPLACE every older partial registration: `locale.register(NS, { zh, en })`,
    per-lang `locale.register(NS, 'ja', ja)` / `'ko'` lines, or per-tag loops over a subset.
    There must be EXACTLY ONE registration covering all 10 languages (no duplicate-(ns,locale) throw,
    no dead dictionary). (Map-style repos that already loop over ALL entries may keep the loop.)
- If the client entry declares a hand-written ctx/locale interface (e.g. session-guard's `ClientCtx`),
  add a `locale` face: `register(ns: string, dicts: Record<string, Record<string,string>>): () => void`.
- `package.json` → `dsh.client.inject` array MUST include `"@deepseek-ai/dsh-client-locale"`.

## (3) `locale/<lang>.json` — create for ALL 10 (en, zh, ja, ko, fr, de, it, ru, es, pt)
Each file (UTF-8, no BOM):
```json
{ "meta": { "title": "<localized short name>", "description": "<localized one-line summary>" } }
```
- Derive title/description from the repo's `package.json` `name`/`description`
  (title = short human name, not the npm id; description = one-line summary), translated per language.
- `en.json` MUST exist (anchor). title/description MUST be non-empty strings.
- 若该仓由脚本生成这些产物（实案 sidebar-fold `scripts/gen-locale-meta.mjs` 的 `META` 表），
  **改源表 + 重跑脚本**，勿手改产物（手改会被下次 gen 覆盖）。
- 完全没有 `locale/` 目录的仓属既有缺口：按本节整套建 10 语（不止补 pt），并做本节末尾的自检。

## (4) `package.json`
- `exports`: add `"./locale/*.json": "./locale/*.json"`. Ensure `"./package.json": "./package.json"` exists.
- `files`: add `"locale"`.
- 白名单若逐文件枚举 `README.xx.md`/`INSTALL.xx.md`/`CHANGELOG.xx.md`，新增的 pt 镜像必须补进 `files`；
  已是目录项或通配的记录「通配已覆盖」不改。
- 版本 bump 双清单陷阱：`package.json` 与 manifest（`dsh.plugin.json` / `dsh-plugin.json` 两种命名都存在）
  的 version 必须同步同值；manifest 的 `description`/`displayName` 若是 `{en, zh, …}` 多语对象，按既有键序补 `pt` 键。

## (5) 文档镜像 — 「既有镜像语言集 ∪ pt」
- `README.pt.md`：全量必做。以该仓**最大的一份非中文 README 镜像**为结构枢轴（无镜像则以 `README.md` 中文为枢）忠实全文翻译；
  标题下语言导航行照抄并在末尾追加 `| [Português](README.pt.md)`，**同时**给所有其它 `README*.md`（含 `README.md`）的导航行补同一链接——
  漏一处即出现「pt 页读不到别的语、别的语页链不到 pt」的单向断链。
- `INSTALL.pt.md` / `CHANGELOG.pt.md`：仅当该仓**已有**该文档的多语镜像体系时才建。**单语仓不开新头**
  （凭空引入镜像体系 = 新增长期维护负担）；此时把 pt 的安装/更新要点写进 `README.pt.md` 章节即可。
- 每个受影响仓的 `CHANGELOG.md` 顶部最新版本小节加一条 i18n bullet（记「add Portuguese (pt-BR) locale —
  runtime dictionary / package metadata / doc mirrors」按该仓实际面裁剪）；有镜像体系时在 pt 版对应小节记等价句。
- CHANGELOG 译本必须**全版本条目覆盖**（版本标题/日期/号原文照录，过长正文压 1–3 bullet），不许只译近几条。

## (6) GATES — 门禁数组与断言（漏改 = 门禁继续假装 9 语）
每仓 grep 并更新这些硬编码语言清单（口径 `'ru', 'es'` / `LANGS` / `langs =` / `languages` / 语言数 9）：
- `scripts/lint.mjs` 的 `const LANGS = ['zh','en','ja','ko','fr','de','it','ru','es']`（实案 sidebar-fold:118）→ 末尾 `'pt'`。
- `scripts/verify.mjs` 的 `for (const lang of [...])`、`scripts/check-artifacts.mjs` 的 `const langs = [...]`（双引号风格，实案 bash-terminal-ts）。
- `scripts/gen-locale-meta.mjs` 的 `META` 表（见 (3)）。
- tests 里断言语言数/清单的用例（`Object.keys(dictionaries)`、`toHaveLength(9)`、purity 类引用键校验）→ 10 / 含 pt。
- 门禁数组顺序须与 (1) 的 export 顺序一致（pt 最后）。

## (7) VERIFY (do not skip)
- Run the repo's `npm run typecheck` + `npm run lint` + `npm test`（脚本存在才跑；不存在记录）。
  typecheck 是编译期键集对齐闸（named-export 式 `Record<keyof typeof zh, string>` 多/少键即编译失败），
  lint 是 locale-parity/死文案闸，test 是渲染面。三门禁**全绿才提交**，逐仓增量执行、禁攒批。
  PowerShell/niu 下命令用 `;` 分隔（`cd <repo>; npm run typecheck`）。
- If no `typecheck` script: `npx tsc --noEmit` (or `npm run build`).
- If `node_modules` exists, also `npm run build` to regenerate `lib/`（tracked lib 的仓，产物须一并提交）。
- locale/ 新建或补建的仓：跑一次性 `JSON.parse` 自检，逐文件断言 `meta.title`/`meta.description` 为非空字符串
  （宿主 `package-meta.ts` 对空串直接 throw 进卡片 error）。
- FORBIDDEN: `pnpm install` / `npm install`, `git commit`, `git push`, `npm publish`, editing other repos.
  （发版是远端落盘：合入 main 后须停下、列待发版清单、等显式确认才 publish。）

## Tooling notes
- PowerShell 5.1 console mis-renders UTF-8 (CJK → mojibake). NEVER judge file content from console
  output. Use the Read tool to read; use SearchReplace (exact ASCII anchors) / Write to edit. Write UTF-8.
- Do not touch `lib/` by hand — let the build regenerate it.
- CRLF 陷阱：niu bash 下 sed/`[` 判断遇 `\r` 会静默失效，先 `tr -d '\r'` 或直接用编辑器工具。

## Report back (per repo)
- Final language list in `locales.ts`（含 export 顺序）；the exact single registration line；list of `locale/*.json` created；
  文档镜像新建/修改清单（含导航行补链的每个文件）；门禁数组命中与改动位置（file:line）；
  the `package.json` exports/files/version diff；三门禁的 literal 输出 tail（success 或确切 error）；
  push 结果一行；以及工作区里先于本次存在的改动及处置。
