import { fileURLToPath } from 'node:url'
import { withTestSelection } from '@variance-authority/sense/vitest'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import packageJson from './package.json'

const varianceConfig = defineConfig({
  plugins: [react()],
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
    setupFiles: ['test-setup.ts'],
    coverage: {
      enabled: !!process.env.CI,
      provider: 'istanbul',
      include: ['src/**/*'],
      exclude: ['src/__tests__/**'],
    },
    typecheck: {
      enabled: false },
    restoreMocks: true,
  },
})

export default withTestSelection(varianceConfig, {
  root: fileURLToPath(new URL('../..', import.meta.url)),
})
