/** Which paths a replay could not answer for, and how often. */
import { execFileSync } from 'node:child_process'
import { narrowByExecution, testCoverageFile } from '@variance-authority/sense/test-selection'
const root = process.cwd()
const git = (...a) => execFileSync('git', a, { cwd: root, maxBuffer: 1 << 28 }).toString()
const cf = testCoverageFile(root)
const INERT = [/^docs\//, /^examples\//, /^media\//, /^\.github\//, /^integrations\//, /\.mdx?$/, /\.test-d\.tsx?$/]
const strip = (d) => d.split(/^(?=diff --git )/m).filter((s) => { const m = /^diff --git a\/(\S+)/.exec(s); return !m || !INERT.some((r) => r.test(m[1])) }).join('')
const tally = new Map()
let widened = 0
for (const sha of git('log', '--format=%H', `-${Number(process.argv[2] ?? 60)}`, process.argv[3] ?? 'HEAD').trim().split('\n')) {
  const t = strip(git('diff', `${sha}^`, sha))
  if (!t.trim()) continue
  const n = await narrowByExecution(cf, t)
  if (n.unread.length > 0) widened += 1
  for (const p of n.unread) tally.set(p, (tally.get(p) ?? 0) + 1)
}
console.log(`${widened} commits widened; ${tally.size} distinct unread paths`)
for (const [p, n] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${p}`)
