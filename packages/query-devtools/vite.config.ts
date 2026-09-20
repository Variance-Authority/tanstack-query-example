import { fileURLToPath } from 'node:url'
import { withTestSelection } from '@variance-authority/sense/vitest'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

import packageJson from './package.json'

const varianceConfig = defineConfig({
  plugins: [solid()],
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
    dir: fileURLToPath(new URL('./src', import.meta.url)),
    watch: false,
    environment: 'jsdom',
    coverage: {
      enabled: !!process.env.CI,
      provider: 'istanbul',
      include: ['src/**/*'],
      exclude: ['src/__tests__/**'],
    },
    typecheck: {
      enabled: false },
    restoreMocks: true,
    setupFiles: ['test-setup.ts'],
  },
})

export default withTestSelection(varianceConfig, {
  root: fileURLToPath(new URL('../..', import.meta.url)),
})
