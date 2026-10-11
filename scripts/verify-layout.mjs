// verify-layout.mjs — prepack gate for dsh-docs-deliverables (content package, no build).
// Catches: missing SKILL.md, kebab-case drift, absolute-path regression (portability gate).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const skillsRoot = path.join(root, 'skills')
const fail = []

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

// portability gate: no machine absolute paths in shipped skill content
const absPat = /[A-Za-z]:[\\/](?:test|Users)[\\/]/
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
for (const file of walk(skillsRoot).concat([path.join(root, 'src', 'index.js')])) {
  if (!/\.md$|\.js$|\.yaml$/.test(file)) continue
  if (absPat.test(fs.readFileSync(file, 'utf8'))) fail.push(`absolute machine path leaked: ${file}`)
}

if (fail.length) {
  console.error('verify-layout FAILED:\n' + fail.join('\n'))
  process.exit(1)
}
console.log(`verify-layout OK: ${fs.readdirSync(skillsRoot).length} skills, no absolute-path leaks`)
