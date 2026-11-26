// check-anchor-map.mjs — 锚点台账机械闸（zero-dep）。
//
// 为什么存在：maintenance/skill-anchor-map.yaml 是「每条技术结论 → 源码锚点」的
// 唯一闸，但它长期处于 **YAML 解析失败** 状态却没人发现——
//   line 37: `- MAIN: 同文件同语义(callers: app-boot/profile.ts:675, …)`
//   plain scalar 里出现「冒号+空格」→ 解析器直接拒。
// 一份从来没被解析过的台账 ≠ 台账。本闸的存在理由就是「让台账每轮被真正解析一次」。
//
// 设计纪律（这是本文件最重要的一段）：
//   初版曾用「敏感序列启发式」（未加引号就报错）去猜哪些行会破坏 YAML，
//   结果对 20+ 行合法注释（`# …`）全部误报 —— 因为 `#` 前有空格时是合法注释，
//   真实解析器完全接受。**启发式闸比没有闸更坏**：它训练人忽略输出。
//   故本闸一律以**真实解析器**为准；解析器不可用时降级为结构检查，
//   并**明确打印降级说明**，绝不假装做过语法校验。
//
// 两道检查：
//   A. 语法：优先 python3 -c "import yaml"，其次 node 内置（无），最后降级
//   B. 结构（始终执行）：每条 claim 有 source + status，status 首词在枚举内
//
// 用法：node scripts/check-anchor-map.mjs [--file <path>]

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const argIdx = process.argv.indexOf('--file')
const rel = argIdx >= 0 ? process.argv[argIdx + 1] : path.join('maintenance', 'skill-anchor-map.yaml')
const file = path.resolve(root, rel)

const STATUS_ENUM = new Set([
  'VERIFIED', 'FARM', 'PENDING', 'CONFLICT-ADJUDICATED', 'UNVERIFIED', 'FAILED',
])

if (!fs.existsSync(file)) {
  console.error(`check-anchor-map FAILED: 台账不存在 ${rel}`)
  process.exit(1)
}

const fail = []
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')

/* ───────────────────────── A. 真实语法解析 ───────────────────────── */

/** 找一个能真正解析 YAML 的解释器；找不到返回 undefined。 */
function findParser() {
  const probe = 'import sys,yaml;yaml.safe_load(open(sys.argv[1],encoding="utf-8"));print("OK")'
  for (const cmd of ['python', 'python3']) {
    const res = spawnSync(cmd, ['-c', probe, file], { encoding: 'utf8' })
    if (res.error !== undefined) continue          // 该解释器不存在
    if (res.status === 0) return { cmd, ok: true }
    // 解释器在但解析失败，或没装 yaml：两种情况都可继续试下一个
    if (/ModuleNotFoundError|No module named/i.test(`${res.stderr ?? ''}`)) continue
    return { cmd, ok: false, stderr: `${res.stderr ?? ''}${res.stdout ?? ''}` }
  }
  return undefined
}

const parser = findParser()
let syntaxChecked = false
if (parser === undefined) {
  console.log('check-anchor-map: ⚠ 未找到可用的 YAML 解析器（python + PyYAML）→ 跳过语法校验，仅做结构检查')
} else if (!parser.ok) {
  // 把解析器的真实报错原样带出来，不自己猜
  fail.push(`YAML 解析失败（${parser.cmd}）:\n      ${parser.stderr.trim().split('\n').slice(0, 6).join('\n      ')}`)
  syntaxChecked = true
} else {
  syntaxChecked = true
}

/* ───────────────────── B. 结构检查（始终执行） ───────────────────── */

/** 只认 claims: 段下的二级键，meta: 段一律跳过（否则 baselines 会被当成 claim）。 */
const lines = text.split('\n')
let inClaims = false
const claims = []
let current = null

lines.forEach((line, i) => {
  if (/^claims:\s*$/.test(line)) { inClaims = true; return }
  if (/^[A-Za-z]/.test(line) && !/^claims:/.test(line)) { inClaims = false; current = null; return }
  if (!inClaims) return

  const head = /^  ([a-z0-9][a-z0-9-]*):\s*$/.exec(line)
  if (head !== null) {
    current = { id: head[1], line: i + 1, has: new Set(), statusValue: '' }
    claims.push(current)
    return
  }
  if (current === null) return
  const field = /^    (source|status|evidence|feeds|items):/.exec(line)
  if (field !== null) current.has.add(field[1])
  const sv = /^    status:\s*(.+)$/.exec(line)
  if (sv !== null) current.statusValue = sv[1].trim()
})

if (claims.length === 0) fail.push(`${rel}: claims: 段下一条 claim 都没解析到（缩进格式变了？）`)

for (const c of claims) {
  // 复合 status（`VERIFIED (写入侧) / PENDING (运行时可达性)`）只校验首词
  const head = c.statusValue.replace(/^["']|["']$/g, '').split(/[\s(（/]/)[0]
  if (!c.has.has('source')) fail.push(`${rel}:${c.line} claim "${c.id}" 缺 source`)
  if (!c.has.has('status')) fail.push(`${rel}:${c.line} claim "${c.id}" 缺 status`)
  else if (!STATUS_ENUM.has(head)) {
    fail.push(`${rel}:${c.line} claim "${c.id}" 的 status 首词 "${head}" 不在枚举内 (${[...STATUS_ENUM].join('/')})`)
  }
  if (!c.has.has('evidence') && !c.has.has('items')) {
    fail.push(`${rel}:${c.line} claim "${c.id}" 既无 evidence 也无 items（无法复核的结论不算台账）`)
  }
}

/* ───────────────────────────── 输出 ───────────────────────────── */

if (fail.length > 0) {
  console.error('check-anchor-map FAILED:\n  ' + fail.join('\n  '))
  process.exit(1)
}

const byStatus = {}
for (const c of claims) {
  const head = c.statusValue.replace(/^["']|["']$/g, '').split(/[\s(（/]/)[0]
  byStatus[head] = (byStatus[head] ?? 0) + 1
}
const summary = Object.entries(byStatus).map(([k, v]) => `${k}:${v}`).join(' ')
console.log(`check-anchor-map OK: ${claims.length} claims — ${summary}${syntaxChecked ? ' (YAML 语法已用真实解析器校验)' : ''}`)
