/**
 * What the last N commits would have cost, asked of the record we already have.
 *
 * The record was made at HEAD, so a commit's own line numbers are valid
 * coordinates into it only while every file that commit touched has stood
 * still since. A commit that fails that check is marked drifted and reported
 * separately rather than priced against coordinates that no longer mean
 * anything.
 *
 * The baseline is the project selector the repository ships: a change to a
 * package runs that package's tests and every dependent package's tests. It is
 * read here from the workspace manifests, which is where a task runner reads it
 * from too.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import {
  narrowByExecution, readTestCoverage, testCoverageFile,
} from '@variance-authority/sense/test-selection'

const root = process.cwd()
const git = (...a) => execFileSync('git', a, { cwd: root, maxBuffer: 1 << 28 }).toString()
const N = Number(process.argv[2] ?? 60)

const coverageFile = testCoverageFile(root)
const coverage = await readTestCoverage(coverageFile)
const tests = coverage.tests.map((t) => t.file)
const S = tests.length
const pct = (n) => `${Math.round((n / S) * 100)}%`

// The project graph, from the manifests.
const name = new Map(), deps = new Map()
for (const d of readdirSync('packages')) {
  const p = `packages/${d}/package.json`
  if (!existsSync(p)) continue
  const j = JSON.parse(readFileSync(p, 'utf8'))
  name.set(j.name, d)
  deps.set(d, Object.keys({ ...j.dependencies, ...j.devDependencies, ...j.peerDependencies }))
}
const byProject = (files) => {
  const seeds = new Set()
  for (const f of files) {
    const seg = f.split('/')
    if (seg[0] === 'packages' && deps.has(seg[1])) seeds.add(seg[1])
    else return S // a path outside any package is a root input: everything
  }
  for (let changed = true; changed; ) {
    changed = false
    for (const [d, ds] of deps) {
      if (seeds.has(d)) continue
      if (ds.some((x) => name.has(x) && seeds.has(name.get(x)))) { seeds.add(d); changed = true }
    }
  }
  return tests.filter((t) => seeds.has(t.split('/')[1])).length
}

// Paths this repository declares inert for its unit suite: prose, examples and
// CI. Nothing in them is imported by a test, and the record cannot know that
// on its own.
const INERT = [
  /^docs\//, /^examples\//, /^media\//, /^\.github\//, /^integrations\//, /\.mdx?$/,
  // Type tests are compiled, not executed, so no run can record one. They are
  // their own target here (`test:types`), and a change to one runs no unit test.
  /\.test-d\.tsx?$/,
]
const strip = (diff) =>
  diff.split(/^(?=diff --git )/m)
    .filter((s) => { const m = /^diff --git a\/(\S+)/.exec(s); return !m || !INERT.some((r) => r.test(m[1])) })
    .join('')

const sourceAt = (file, commit) => { try { return git('show', `${commit}:${file}`) } catch { return undefined } }

// The suite the record can speak for: a file that did not finish is not a file
// the record may skip.
const WHOLE = (await narrowByExecution(coverageFile, '')).whole.length

const rows = []
// The migration commits are the tool arriving, not work the tool was asked
// about; priced from a base that excludes them the answer is about this repo.
const FROM = process.argv[3] ?? 'HEAD';
for (const sha of git('log', '--format=%H', `-${N}`, FROM).trim().split('\n')) {
  const files = git('diff', '--name-only', `${sha}^`, sha).trim().split('\n').filter(Boolean)
  if (files.length === 0) continue
  const drifted = files.filter((f) => git('diff', '--name-only', sha, 'HEAD', '--', f).trim() !== '')
  const diff = git('diff', `${sha}^`, sha)
  const price = async (text) => {
    if (text.trim() === '') return { runs: 0, unread: 0, stale: 0 }
    const n = await narrowByExecution(coverageFile, text, { sourceAt })
    const entered = new Set(n.entered)
    const skip = n.unread.length > 0 ? [] : n.whole.filter((t) => !entered.has(t))
    return { runs: n.whole.length - skip.length, unread: n.unread.length, stale: n.stale.length }
  }
  const raw = await price(diff)
  const declared = await price(strip(diff))
  rows.push({
    sha: sha.slice(0, 8), subject: git('log', '-1', '--format=%s', sha).trim(),
    files: files.length, drifted: drifted.length,
    project: byProject(files), raw, declared,
    touchesSource: files.some((f) => /^packages\/[^/]+\/src\/.+\.(ts|tsx)$/.test(f) && !/\.test(-d)?\.tsx?$/.test(f)),
  })
}

const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const p90 = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length * 0.9)] : 0 }
const clean = rows.filter((r) => r.drifted === 0)

console.log(`suite ${S} test files; ${rows.length} commits of the last ${N}; ${clean.length} with every touched file unmoved since the recording\n`)
for (const [label, xs] of [['all priceable', rows], ['coordinates still valid', clean]]) {
  if (xs.length === 0) continue
  const line = (t, v) => console.log(`  ${t.padEnd(24)} total ${String(v.reduce((a, b) => a + b, 0)).padStart(6)}  median ${String(med(v)).padStart(3)} (${pct(med(v))})  p90 ${String(p90(v)).padStart(3)} (${pct(p90(v))})`)
  console.log(`${label} — ${xs.length} commits, ${xs.length * S} runs if you always run everything`)
  line('project selector', xs.map((r) => r.project))
  line('record as shipped', xs.map((r) => r.raw.runs))
  line('record + declared inert', xs.map((r) => r.declared.runs))
  console.log(`  whole suite: project ${xs.filter((r) => r.project >= WHOLE).length}, record ${xs.filter((r) => r.raw.runs >= WHOLE).length}, declared ${xs.filter((r) => r.declared.runs >= WHOLE).length}`)
  console.log(`  nothing at all: declared ${xs.filter((r) => r.declared.runs === 0).length}`)
  console.log(`  widened by unread ${xs.filter((r) => r.declared.unread > 0).length}, by stale ${xs.filter((r) => r.declared.stale > 0).length}\n`)
}
const src = rows.filter((r) => r.touchesSource)
if (src.length) {
  console.log(`commits that change a package's own source — ${src.length} of ${rows.length}`)
  const line = (t, v) => console.log(`  ${t.padEnd(24)} total ${String(v.reduce((a, b) => a + b, 0)).padStart(6)}  median ${String(med(v)).padStart(3)} (${pct(med(v))})  p90 ${String(p90(v)).padStart(3)} (${pct(p90(v))})`)
  line('project selector', src.map((r) => r.project))
  line('record + declared inert', src.map((r) => r.declared.runs))
  console.log('')
}
console.log('commit by commit (project → record → declared):')
for (const r of rows) {
  console.log(`  ${r.sha} ${String(r.files).padStart(3)}f  proj ${String(r.project).padStart(3)} ${pct(r.project).padStart(4)}  rec ${String(r.raw.runs).padStart(3)} ${pct(r.raw.runs).padStart(4)}  decl ${String(r.declared.runs).padStart(3)} ${pct(r.declared.runs).padStart(4)}${r.declared.unread ? ` u${r.declared.unread}` : ''}${r.declared.stale ? ` s${r.declared.stale}` : ''}${r.drifted ? ' ~drift' : ''}  ${r.subject.slice(0, 48)}`)
}
