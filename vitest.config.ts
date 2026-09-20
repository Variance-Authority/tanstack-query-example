/**
 * One run over every package, so one record covers the workspace.
 *
 * The task runner this replaces asked each package's tests as its own task and
 * decided between them from the project graph. The record answers the same
 * question from what the suite did, and it can only do that if the suite is one
 * run: a `react-query` test that enters `query-core` is the whole point, and two
 * separate runs cannot see it.
 *
 * The wrap is here as well as on every project because a Vitest project
 * inherits neither plugins nor setup files from the configuration around it.
 * The projects carry the instrumentation; this one carries the reporter that
 * folds the run into a single record.
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { withTestSelection } from '@variance-authority/sense/vitest'

export default withTestSelection(
  defineConfig({
    test: {
      projects: ['packages/*'],
    },
  }),
  { root: fileURLToPath(new URL('.', import.meta.url)) },
)
