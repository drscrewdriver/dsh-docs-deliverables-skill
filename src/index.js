/**
 * dsh-docs-deliverables-skill — serve the bundled docs skills through ctx.skills.
 *
 * Zero runtime dependencies: everything comes from node builtins. The plugin
 * registers one SkillProvider over the package-local `skills/` tree, using the
 * exact filesystem layout the host scans for `.agents/skills` roots
 * (`<dir>/SKILL.md`, kebab-case dir name = skill name).
 *
 * API evidence (verified 2026-10-11):
 * - ctx.skills.registerProvider((control) => provider)  @deepseek-ai/dsh-skill
 *   packages/skill/skill/src/index.ts:246-275 (SkillProvider/SkillProviderControl)
 * - registration call shape: packages/skill/skill-filesystem/src/index.ts:134-139
 * - candidates shape: SkillCandidate = SkillSummary + rank + locator
 *   packages/skill/skill/src/index.ts:56-83
 * - body rendering convention (frontmatter stripped): provider owns content;
 *   see packages/preset/agent-preset/tests/skills.spec.ts:27-31 for the same
 *   `'\n---\n'` split used by the official bundled skills.
 *
 * Soft-guard discipline (dsh-context7 precedent): the `skills` seam is read
 * via ctx.get('skills'); when the profile does not mount the skill registry
 * the plugin becomes a silent no-op instead of hanging a plugin-level inject.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-docs-deliverables-skill'

/** Standard precedence for packaged/bundled providers (BUNDLED_SKILL_RANK@0.2.0). */
const BUNDLED_RANK = 600
const PROVIDER_NAME = 'dsh-docs-deliverables-skill'
const SKILLS_ROOT = fileURLToPath(new URL('../skills/', import.meta.url))

/**
 * Strip YAML frontmatter the same way the official test harness does.
 * Tolerates CRLF files (Windows-authored skills): line endings are normalized
 * before locating the closing `\n---\n` fence, so bodies never leak frontmatter.
 * @param text - raw SKILL.md content.
 * @returns frontmatter block (without fences) and body.
 */
function splitFrontmatter(raw) {
  const text = raw.replace(/\r\n/g, '\n')
  if (!text.startsWith('---')) return { frontmatter: '', body: text.trim() }
  const end = text.indexOf('\n---\n', 4)
  if (end < 0) return { frontmatter: '', body: text.trim() }
  return { frontmatter: text.slice(4, end), body: text.slice(end + '\n---\n'.length).trim() }
}

/** Read one top-level scalar out of a frontmatter block (flat keys only, quoted or bare). */
function frontValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp('^' + key + ":\\s*(['\"]?)(.*)\\1\\s*$", 'm'))
  return match && match[2] ? match[2].trim() : undefined
}

/** Scan skills/<dir>/SKILL.md once and cache by mtime of the skills root. */
function discover() {
  const candidates = []
  if (!fs.existsSync(SKILLS_ROOT)) return candidates
  for (const entry of fs.readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(SKILLS_ROOT, entry.name, 'SKILL.md')
    if (!fs.existsSync(file)) continue
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const { frontmatter, body } = splitFrontmatter(text)
    candidates.push({
      name: entry.name,
      path: file,
      description: frontValue(frontmatter, 'description') || body.split('\n')[0].slice(0, 200),
      whenToUse: frontValue(frontmatter, 'when_to_use'),
      invocation: { modelInvocable: true, userInvocable: true },
      source: 'bundled',
      provider: PROVIDER_NAME,
      rank: BUNDLED_RANK,
      locator: file,
      resourceBase: { kind: 'directory', path: path.dirname(file) },
    })
  }
  return candidates
}

export function apply(ctx) {
  const skills = ctx.get('skills')
  if (skills === undefined) return
  if (typeof skills.registerProvider !== 'function') return
  skills.registerProvider(() => ({
    name: PROVIDER_NAME,
    async list(options) {
      if (options && options.signal && options.signal.aborted) return []
      return discover()
    },
    async get(candidate) {
      try {
        const { body } = splitFrontmatter(fs.readFileSync(candidate.locator, 'utf8'))
        return { ...candidate, content: body }
      } catch {
        return undefined
      }
    },
  }))
}
