/**
 * Run the test files a change could have reached, and skip the rest.
 *
 * `variance select` prints a skip list and nothing else: paths on stdout, one
 * per line, and an empty answer means run everything rather than nothing. That
 * shape is the whole safety argument — every reason the record cannot answer
 * (a changed file it holds no measurement of, a module recorded from different
 * text, no record at all) comes out as a shorter skip list, never a shorter run.
 *
 * So this script does not decide anything. It asks, subtracts, and hands what
 * is left to Vitest.
 */
import { execFileSync } from 'node:child_process'

const since = process.argv[2] ?? process.env.VARIANCE_SINCE

const skip = execFileSync(
  'variance',
  ['select', '--format', 'plain', ...(since ? ['--since', since] : [])],
  { encoding: 'utf8' },
)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

if (skip.length === 0) {
  console.log('variance: nothing to skip, running the whole suite')
  execFileSync('vitest', ['run'], { stdio: 'inherit' })
} else {
  console.log(`variance: skipping ${skip.length} test file(s)`)
  execFileSync('vitest', ['run', ...skip.flatMap((file) => ['--exclude', file])], {
    stdio: 'inherit',
  })
}
