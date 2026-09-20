/**
 * Wrap every package's Vitest config so one run records what it entered.
 *
 * Three edits per file, and the second two are Vitest's rules rather than ours:
 *
 *  - `withTestSelection` around the exported config, which installs the
 *    instrumenting transform and the setup shim. A project inherits neither
 *    from the configuration around it, so the wrap goes on every project and
 *    once more at the root for the reporter that folds the run.
 *  - `test.dir` made absolute. A project's relative `dir` is resolved against
 *    the root config, not the project's own file, once the project is loaded
 *    from a `projects` glob — so every package would look in the root's `src`
 *    and the run would find no tests at all.
 *  - `typecheck` off. Type tests are compiled, not executed, so no run can
 *    record one; they stay their own target.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'

const wrap = (text) => {
  if (text.includes('@variance-authority/sense/vitest')) return text
  let out = text.replace(
    /^(import .*\n)/m,
    "import { fileURLToPath } from 'node:url'\nimport { withTestSelection } from '@variance-authority/sense/vitest'\n$1",
  )
  out = out.replace(/^export default /m, 'const varianceConfig = ')
  out = out.replace(/dir:\s*'\.\/([^']+)'/g, "dir: fileURLToPath(new URL('./$1', import.meta.url))")
  out = out.replace(/typecheck:\s*\{\s*\n?\s*enabled:\s*true/g, 'typecheck: {\n      enabled: false')
  return `${out.trimEnd()}\n\nexport default withTestSelection(varianceConfig, {\n  root: fileURLToPath(new URL('../..', import.meta.url)),\n})\n`
}

let n = 0
for (const d of readdirSync('packages')) {
  const p = `packages/${d}/vite.config.ts`
  if (!existsSync(p)) continue
  const before = readFileSync(p, 'utf8')
  const after = wrap(before)
  if (after !== before) { writeFileSync(p, after); n += 1 }
}
console.log(`wrapped ${n} package configs`)
