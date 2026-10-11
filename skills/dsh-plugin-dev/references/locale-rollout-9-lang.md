> 溯源｜_locale_rollout_spec（9 语真源，取代四语规范 03/FILE-STRUCTURE 语言行） 的冻结副本（2026-10-11）。核验宿主基准：0.2.0-rc.2(MAIN deepseek-harness) + 0.1.7-rc.2(AUX .harness-017rc2-wt) + 0.1.5-rc.2(OLD dsh-repo)。三态断言台账见 `.agents/plans/skill-drafts/assertions-ledger-improve.md`；锚点唯一闸见 `.agents/prd/skill-anchor-map.yaml`。原文档冻结不改，本副本为 skill 唯一出口。

# Canonical multi-language locale rollout spec (VERIFIED)

Goal: give a DSH web-plugin repo a **complete, ACTIVE** multi-language setup — both
products the host consumes:
1. Client UI dictionary (`src/client/locales.ts` + `register`) → drives `t()` in the plugin UI.
2. Package metadata (`locale/<lang>.json`) → drives the plugin-manifest / market card title+description.

Verified against host source:
- `deepseek-harness/packages/client/locale/src/client/index.ts` — `register(ns, dicts)` untyped map
  overload accepts ANY BCP-47-style language id (`LOCALE_ID_PATTERN`), needs NO `addLanguage`,
  throws only on duplicate `(ns, locale)`. One map call activates every language.
- `deepseek-harness/packages/boot/app-boot/src/package-meta.ts` — `locale/en.json` is the ANCHOR;
  if absent the whole `locale/` dir is ignored. Each `<lang>.json` → `meta.title` / `meta.description`,
  each (if present) MUST be a non-empty string or it throws into the card `error`. Files resolved via
  `<pkg>/locale/<name>.json`, so `exports` MUST map `./locale/*.json`.

Working in-repo reference (named-export style, 7 langs, correct registration):
`<ws>/mine-dsh-plugins/dsh-brief-sidebar/src/client/locales.ts` + `index.tsx`（金模板路径已泛化，`<ws>`=工作区根）。

## TARGET LANGUAGES (9)
`zh`, `en` (base) + `ja`, `ko`, `fr`, `de`, `it`, `ru`, `es`.

---

## (1) `src/client/locales.ts`

### Named-export style (repo already has `export const zh = {...}` / `export const en: ... = {...}`)
- Keep `export const NS = '<existing value>'` UNCHANGED.
- `zh` is the KEY-SET SOURCE OF TRUTH. Preserve every existing `zh` key + value EXACTLY.
  Do NOT invent keys not already used in the repo's `src/**`; do NOT drop keys.
- PRESERVE existing `en` / `ja` / `ko` / `fr` / `de` / `it` / `ru` / `es` values EXACTLY —
  never re-translate or degrade what already exists. Only ADD what is missing.
- Keep any existing key-type alias (e.g. `export type XKey = keyof typeof zh`, or `PermissiveKey`).
- For EACH missing language in {ja,ko,fr,de,it,ru,es} add:
  `export const <lang>: Record<keyof typeof zh, string> = { ...every zh key, translated... }`
  (use the repo's existing alias instead of `keyof typeof zh` if it has one).
  Preserve placeholders (`{count}`, `{name}`, `{n}`, `{error}`, …) EXACTLY; reposition them
  naturally for the target language. Keep `«ёлочки»`/umlauts/accents correct — real orthography.
- Ensure a combined map with ALL 9:
  `export const dictionaries: Record<string, Record<string, string>> = { zh, en, ja, ko, fr, de, it, ru, es }`
  (if the repo already exports `dictionaries`, extend it to all 9).

### Map style (repo has `export const dictionaries: Record<string, Record<string,string>> = { en:{...}, zh:{...} }`)
- Add `<lang>: { ...same keys... }` entries INSIDE the existing `dictionaries` map for every
  missing language, so the map ends with all 9 keys: `en, zh, ja, ko, fr, de, it, ru, es`.
- Use the existing `en` (or `zh`) key set as the source of truth; mirror keys exactly.
- Confirm the registration loop iterates all map entries (e.g. `for (const [tag, dict] of Object.entries(dictionaries))`)
  so every added language auto-activates. If it registers a hardcoded subset, fix it to cover all keys.

## (2) Registration — ONE call activates ALL 9 (this is the "active" fix)
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
    There must be EXACTLY ONE registration covering all 9 languages (no duplicate-(ns,locale) throw,
    no dead dictionary). (Map-style repos that already loop over ALL entries may keep the loop.)
- If the client entry declares a hand-written ctx/locale interface (e.g. session-guard's `ClientCtx`),
  add a `locale` face: `register(ns: string, dicts: Record<string, Record<string,string>>): () => void`.
- `package.json` → `dsh.client.inject` array MUST include `"@deepseek-ai/dsh-client-locale"`.

## (3) `locale/<lang>.json` — create for ALL 9 (en, zh, ja, ko, fr, de, it, ru, es)
Each file (UTF-8, no BOM):
```json
{ "meta": { "title": "<localized short name>", "description": "<localized one-line summary>" } }
```
- Derive title/description from the repo's `package.json` `name`/`description`
  (title = short human name, not the npm id; description = one-line summary), translated per language.
- `en.json` MUST exist (anchor). title/description MUST be non-empty strings.

## (4) `package.json`
- `exports`: add `"./locale/*.json": "./locale/*.json"`. Ensure `"./package.json": "./package.json"` exists.
- `files`: add `"locale"`.

## (5) VERIFY (do not skip)
- Run the repo's typecheck (PowerShell; separate with `;` NOT `&&`):
  `cd <repo>; npm run typecheck` — MUST be green (this is the compile-time key-set gate).
  If no `typecheck` script: `npx tsc --noEmit` (or `npm run build`).
- If `node_modules` exists, also `npm run build` to regenerate `lib/` (so the shipped bundle carries new keys).
- FORBIDDEN: `pnpm install` / `npm install`, `git commit`, `git push`, `npm publish`, editing other repos.

## Tooling notes
- PowerShell 5.1 console mis-renders UTF-8 (CJK → mojibake). NEVER judge file content from console
  output. Use the Read tool to read; use SearchReplace (exact ASCII anchors) / Write to edit. Write UTF-8.
- Do not touch `lib/` by hand — let the build regenerate it.

## Report back (per repo)
- Final language list in `locales.ts`; the exact single registration line; list of `locale/*.json` created;
  the `package.json` exports/files/inject diff; and the literal typecheck (+build) output tail
  (success, or the exact error).
