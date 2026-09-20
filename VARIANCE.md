# Selecting tests from what the suite did

This clone of TanStack Query runs its unit tests through
[Variance Authority](https://github.com/machine-garden/variance-authority) instead of
through the task runner's affected-project graph. The suite is unchanged. What
changed is how the repository decides which of its 188 test files a given edit
can reach.

## The edit and the answer

Change one line inside `Query.fetch` in `packages/query-core/src/query.ts`:

```diff
-      if (observer) {
+      if (observer !== undefined) {
         this.setOptions(observer.options)
```

Then ask:

```bash
pnpm run test:lib:changed
```

```
variance: skipping 178 test file(s)
 Test Files  1 failed | 9 passed (10)
      Tests  22 failed | 758 passed (780)
   Duration  2.84s
```

Ten test files, in five packages: `query-core`, `react-query`, `preact-query`,
`vue-query`, `query-devtools`. The whole suite, for comparison, is `pnpm run
test:lib` — 188 files, 4523 tests, 11.6s of test time and 12.9s of wall clock.

A selector working from the project graph runs 168 of the 188, because 24 of
this workspace's projects depend on `@tanstack/query-core` and their tests all
belong to projects that were invalidated. That is the correct answer to the
question it asks. It is 16.8x the answer to the question you wanted asked.

The one failing file is `query-devtools`' `PiPContext.test.tsx`, which fails the
same 22 tests on an untouched clone of this repository. Selection kept it,
because the devtools embed a client and their tests do enter `query.ts`.

## Why the graph cannot get closer

`packages/query-core/src/query.ts` is 973 lines and 150 recorded regions. 149 of
the 188 test files in this workspace load it, across 23 packages. So 149 is the
floor for any selector that decides at the grain of a file: the moment the file
is touched at all, that is what it owes you.

Inside the file the picture is different. Of those 150 regions, the median is
entered by 29 test files, the 90th percentile by 86, and the cheapest by 1:

```
     1 files /  1 pkgs  621-623    Query/fetch · if#2/then/if#0/then
     1 files /  1 pkgs  759-766    Query/fetch · try#0/try/if#0/then
     3 files /  3 pkgs  670-676    Query/fetch/fetchFn · if#0/then
    96 files / 17 pkgs  822-904    Query/dispatch · entry
   149 files / 23 pkgs    1-973     · module
```

No region of this file is unentered. The suite covers it; it just does not cover
it uniformly, and the difference between the parts is two orders of magnitude.
That difference is only visible to something that was there while the tests ran.

The record for this workspace is one file: 259 modules, 5,409 regions, 332 KB.

## What sixty commits would have cost

`.variance-scratch/replay.mjs` prices each of the last sixty commits before the
migration against the record, by asking the same question the selector asks at
the same coordinates. It does not check the old code out, and it says so when a
commit's coordinates have drifted.

Always running everything is 11,280 test-file runs over those sixty commits.

| | total | median | p90 |
|---|---|---|---|
| project graph | 10,207 | 168 (89%) | 188 (100%) |
| record | 2,355 | 0 (0%) | 187 (99%) |

Thirty-one of the sixty commits touch only files that have not moved since the
recording, so their line numbers still mean what they meant. On those:

| | total | median | p90 |
|---|---|---|---|
| project graph | 5,105 | 168 (89%) | 188 (100%) |
| record | 502 | 0 (0%) | 15 (8%) |

Fourteen of the sixty change a package's own source — the commits where there is
real work to skip and real risk in skipping it. The project graph runs 2,612
files across them; the record runs 1,229, at a median of 149, which is that
hub file's floor showing up again.

Individual commits, for shape — all four are three-file `fix(…)` commits, and
all four have drifted since the recording, so read them as what a change of that
shape costs rather than as what that commit would cost today:

```
  3212966a  fix(query-core): preserve null streamed query re…    1  ( 1%)
  4c7cdbb8  fix(query-persist-client-core): restore falsy st…    3  ( 2%)
  cbf77bf8  fix(query-core): reject longer partial array keys   22  (12%)
  8330b2f2  fix(query-core): handle plain objects with const…   46  (24%)
```

## What the migration changed

**`vitest.config.ts`** (new, at the root) is one run over every package. The task
runner this replaces asked each package's tests as its own task. A record cannot
be made that way: a `react-query` test entering `query-core` is the entire point,
and two separate runs cannot see it.

**All 27 `packages/*/vite.config.ts`** are wrapped in `withTestSelection`. A
Vitest project inherits neither plugins nor setup files from the configuration
around it, so the wrap is on every project *and* at the root — the projects carry
the instrumentation, the root carries the reporter that folds one run into one
record. `.variance-scratch/migrate.mjs` is the codemod, kept so the edit is
reproducible rather than remembered.

**`scripts/test-changed.mjs`** is the dispatcher. It decides nothing:

```js
const skip = execFileSync('variance', ['select', '--format', 'vitest', ...])
  .split('\n').map((l) => l.trim()).filter(Boolean)
spawnSync('vitest', ['run', ...skip], { stdio: 'inherit' })
```

`variance select` prints a skip list and nothing else. Every reason the record
cannot answer — a changed file it holds no measurement of, a module recorded from
different text, no record at all — comes out as a *shorter skip list*, never a
shorter run, and an empty answer means run everything. That shape is the whole
safety argument, so the script asks, subtracts, and hands the rest to Vitest.

**`package.json`**:

| script | was | is |
|---|---|---|
| `test:lib` | `nx affected --target=test:lib …` | `vitest run` |
| `test:lib:dev` | `… && nx watch --all -- …` | `vitest` |
| `test:lib:changed` | — | `node scripts/test-changed.mjs` |

## What this does not replace

`test:build`, `test:types`, `test:eslint` and `build` still go through the task
runner, and should. Those are task orchestration over a dependency graph, which
is a different job from deciding which tests an edit can reach.

Three honest limits, all visible in the numbers above:

- **Manifests and the lockfile widen the answer to everything.** Eight of the
  sixty commits run the whole suite, and the cause is always a file no run
  enters: twenty-nine distinct such paths in the window, of which twenty-six are
  a `package.json`, plus `pnpm-lock.yaml`, `nx.json` and `scripts/generate-docs.ts`.
  The record cannot speak for a file it never saw executed, so it widens. That is
  the safe answer and it is not the useful one — a version bump in
  `packages/lit-query/package.json` is not a reason to run `query-core`'s tests.
- **Type tests are not executed.** `*.test-d.ts` files are compiled, not run, so
  no recording can hold one. This repository already runs them as a separate
  target; a record-based selector has to be told that, rather than discovering it.
- **Coordinates drift.** A commit is priceable against a record only while the
  files it touched have stood still since the recording. Twenty-nine of the sixty
  had moved on. In a repository this is not a concern — you record at the commit
  you are selecting from — but it is why the replay reports two tables.

## Reproducing this

```bash
pnpm install
pnpm run test:lib          # records; ~13s
# edit something
pnpm run test:lib:changed  # selects

node .variance-scratch/peek.mjs     # 188 test files, 259 modules, 5,409 regions
node .variance-scratch/regions.mjs  # the spread inside one module
node .variance-scratch/replay.mjs 60 HEAD
node .variance-scratch/unread.mjs 60 HEAD
```

Those four are tracked so that every number here can be re-derived rather than
believed. They are measurement: nothing in the suite runs them, and they are
not part of the migration.

`@variance-authority/sense` and `@variance-authority/cli` are linked into
`node_modules` from a checkout of the tool: this workspace needs two fixes that
are not in 0.2.0. Swap the links for a registry install once they release.

The record lands in `${XDG_CACHE_HOME:-~/.cache}/variance-authority/test-selection/`,
keyed by the absolute path of this checkout. It is not part of git: nothing in
the working tree moves when you record.
