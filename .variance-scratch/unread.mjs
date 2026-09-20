/** Which paths a replay could not answer for, and how often. */
import { execFileSync } from 'node:child_process'
import { narrowByExecution, testCoverageFile } from '@variance-authority/sense/test-selection'
const root = process.cwd()
const git = (...a) => execFileSync('git', a, { cwd: root, maxBuffer: 1 << 28 }).toString()
const cf = testCoverageFile(root)
const INERT = [/^docs\//, /^examples\//, /^media\//, /^\.github\//, /^integrations\//, /\.mdx?$/, /\.test-d\.tsx?$/]
const strip = (d) => d.split(/^(?=diff --git )/m).filter((s) => { const m = /^diff --git a\/(\S+)/.exec(s); return !m || !INERT.some((r) => r.test(m[1])) }).join('')
const tally = new Map()
for (const sha of git('log', '--format=%H', '-60').trim().split('\n')) {
  const t = strip(git('diff', `${sha}^`, sha))
  if (!t.trim()) continue
  const n = await narrowByExecution(cf, t)
  for (const p of n.unread) tally.set(p, (tally.get(p) ?? 0) + 1)
}
console.log('unread paths, by how many commits they widened:')
for (const [p, n] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${String(n).padStart(2)}  ${p}`)
console.log(`distinct ${tally.size}`)
