/** The spread inside one module: how many test files entered each region. */
import { readTestCoverage, testCoverageFile } from '@variance-authority/sense/test-selection'
const cov = await readTestCoverage(testCoverageFile(process.cwd()))
const target = process.argv[2] ?? 'packages/query-core/src/query.ts'
const m = cov.modules.find((m) => m.file === target)
if (!m) { console.log('not recorded:', target); process.exit(1) }
const suite = cov.tests.length
const pkgOf = (f) => f.split('/')[1]
const rows = m.blocks
  .filter((b) => b.source)
  .map((b) => ({ name: b.name, path: b.path, lines: `${b.startLine}-${b.endLine}`, n: b.testFiles.length,
                 pkgs: new Set(b.testFiles.map(pkgOf)).size }))
  .sort((a, b) => a.n - b.n)
console.log(`${target}: ${m.blocks.length} regions, suite ${suite} test files`)
const ns = rows.map((r) => r.n).sort((a, b) => a - b)
const q = (p) => ns[Math.floor((ns.length - 1) * p)]
console.log(`entered-by: min ${q(0)} median ${q(0.5)} p90 ${q(0.9)} max ${q(1)}  (suite ${suite})`)
console.log(`regions nobody entered: ${ns.filter((n) => n === 0).length}`)
console.log('\ncheapest / dearest named regions:')
for (const r of [...rows.filter(r=>r.n>0).slice(0, 8), null, ...rows.slice(-6)]) {
  if (!r) { console.log('  …'); continue }
  console.log(`  ${String(r.n).padStart(4)} files / ${String(r.pkgs).padStart(2)} pkgs  ${r.lines.padEnd(10)} ${r.name}${r.path ? ' · ' + r.path : ''}`)
}
