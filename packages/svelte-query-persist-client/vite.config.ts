import { fileURLToPath } from 'node:url'
import { withTestSelection } from '@variance-authority/sense/vitest'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { svelteTesting } from '@testing-library/svelte/vite'

import packageJson from './package.json'

const varianceConfig = defineConfig({
  plugins: [svelte(), svelteTesting()],
  // fix from https://github.com/vitest-dev/vitest/issues/6992#issuecomment-2509408660
  resolve: {
    conditions: ['@tanstack/custom-condition'],
  },
  environments: {
    ssr: {
      resolve: {
        conditions: ['@tanstack/custom-condition'],
      },
    },
  },
  test: {
    name: packageJson.name,
    dir: fileURLToPath(new URL('./tests', import.meta.url)),
    watch: false,
    environment: 'jsdom',
    setupFiles: ['./tests/test-setup.ts'],
    typecheck: {
      enabled: false },
    restoreMocks: true,
  },
})

export default withTestSelection(varianceConfig, {
  root: fileURLToPath(new URL('../..', import.meta.url)),
})
