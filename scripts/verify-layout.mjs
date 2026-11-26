// verify-layout.mjs — prepack gate for dsh-docs-deliverables (content package, no build).
// Catches: missing SKILL.md, kebab-case drift, absolute-path regression (portability gate),
// and **skill-content drift** (contentVersion/CHANGELOG/files 三处脱节，见 §drift 段).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const skillsRoot = path.join(root, 'skills')
const fail = []

const readFrontmatter = (text) => {
  const m = /^---\n([\s\S]*?)\n---/.exec(text)
  return m === null ? undefined : m[1]
}

for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) { fail.push(`skills/: unexpected file ${entry.name}`); continue }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.name)) fail.push(`skill dir not kebab-case: ${entry.name}`)
  const file = path.join(skillsRoot, entry.name, 'SKILL.md')
  if (!fs.existsSync(file)) { fail.push(`missing SKILL.md: ${entry.name}`); continue }
  const text = fs.readFileSync(file, 'utf8')
  if (!text.startsWith('---')) fail.push(`no frontmatter: ${entry.name}/SKILL.md`)
  const nameMatch = text.match(/^name:\s*(\S+)\s*$/m)
  if (!nameMatch) fail.push(`frontmatter name missing: ${entry.name}`)
  else if (nameMatch[1] !== entry.name) fail.push(`name/dir mismatch: ${nameMatch[1]} vs ${entry.name}`)
}

// ───────────────────── drift 段：技能内容与包元数据不得脱节 ─────────────────────
//
// 为什么加这段：0.1.0 期间本包改了内容（新增 reference + 两个闸脚本）却
// ① 版本号没动 ② 技能内无版本标记 ③ 无 CHANGELOG ④ scripts/ 不在 files 白名单
// —— 用户无法判断装的是哪一版内容，而且发出去的包里根本没有闸脚本。四处同时脱节。
// 本段把它们钉成机械判据：改内容就必须在这四处同步登记。

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// D1: 每个技能必须有 contentVersion + contentUpdated，且 SKILL.md 存在该字段
for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const file = path.join(skillsRoot, entry.name, 'SKILL.md')
  if (!fs.existsSync(file)) continue
  const fm = readFrontmatter(fs.readFileSync(file, 'utf8'))
  if (fm === undefined) continue
  if (!/^contentVersion:/m.test(fm)) fail.push(`drift D1: ${entry.name}/SKILL.md 缺 contentVersion`)
  if (!/^contentUpdated:/m.test(fm)) fail.push(`drift D1: ${entry.name}/SKILL.md 缺 contentUpdated`)
}

// D2: scripts/ 必须在 files 白名单里，否则装上的包跑不了 prepack/verify
if (fs.existsSync(path.join(root, 'scripts'))) {
  const listed = (pkg.files ?? []).some((f) => f === 'scripts/' || f === 'scripts')
  if (!listed) fail.push('drift D2: scripts/ 存在但不在 package.json files 白名单 → 发出去的包里没有闸脚本')
}

// D3: 打包后体积/文件数异常说明 files 白名单又漏了东西（粗粒度兜底）
//     由 npm pack --dry-run 覆盖；此处只保证关键目录都在白名单里
for (const need of ['skills/', 'maintenance/', 'src/']) {
  if (!(pkg.files ?? []).includes(need)) fail.push(`drift D3: files 白名单缺 ${need}`)
}

// D4: CHANGELOG 存在且首个版本节 == package.json version
const changelogPath = path.join(root, 'CHANGELOG.md')
if (!fs.existsSync(changelogPath)) {
  fail.push('drift D4: 缺 CHANGELOG.md（内容型包必须有变更记录）')
} else {
  const head = fs.readFileSync(changelogPath, 'utf8').slice(0, 4000)
  const first = /^##\s*\[?v?([0-9]+\.[0-9]+\.[0-9]+[^\s\]]*)\]?/m.exec(head)
  if (first === null) fail.push('drift D4: CHANGELOG.md 找不到首个版本标题（## [x.y.z]）')
  else if (first[1] !== pkg.version) {
    fail.push(`drift D4: CHANGELOG 首版 ${first[1]} ≠ package.json version ${pkg.version}`)
  }
}

// portability gate: no machine absolute paths in shipped skill content
const absPat = /[A-Za-z]:[\\/](?:test|Users)[\\/]/
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
for (const file of walk(skillsRoot).concat([path.join(root, 'src', 'index.js')])) {
  if (!/\.md$|\.js$|\.yaml$/.test(file)) continue
  if (absPat.test(fs.readFileSync(file, 'utf8'))) fail.push(`absolute machine path leaked: ${file}`)
}

if (fail.length) {
  console.error('verify-layout FAILED:\n  ' + fail.join('\n  '))
  process.exit(1)
}
console.log(`verify-layout OK: ${fs.readdirSync(skillsRoot).length} skills, v${pkg.version}, no drift, no absolute-path leaks`)
