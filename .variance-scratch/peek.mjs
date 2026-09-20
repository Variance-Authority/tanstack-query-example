/** What the record holds: test files, modules, regions, and where they live. */
import { readTestCoverage, testCoverageFile } from '@variance-authority/sense/test-selection'
const root = process.cwd()
const file = testCoverageFile(root)
const cov = await readTestCoverage(file)
console.log('file', file)
console.log('tests', cov.tests.length, 'modules', cov.modules.length)
let regions = 0
for (const m of cov.modules) regions += m.blocks.length
console.log('regions', regions)
const byPkg = new Map()
for (const m of cov.modules) {
  const seg = m.file.split('/')
  const i = seg.indexOf('packages')
  const k = i >= 0 ? seg[i + 1] : '(other)'
  byPkg.set(k, (byPkg.get(k) ?? 0) + 1)
}
console.log([...byPkg].sort((a, b) => b[1] - a[1]))
console.log('sample module', cov.modules[0]?.file)
console.log('sample test', cov.tests[0]?.file)
