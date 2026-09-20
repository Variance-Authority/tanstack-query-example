import { fileURLToPath } from 'node:url'
import { withTestSelection } from '@variance-authority/sense/vitest'
import { defineConfig, mergeConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { tanstackViteConfig } from '@tanstack/vite-config'

import packageJson from './package.json'

const config = defineConfig({
  plugins: [vue()],
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
  },
})

const varianceConfig = mergeConfig(
  config,
  tanstackViteConfig({
    entry: ['src/index.ts', 'src/production.ts'],
    srcDir: 'src',
  }),
)

export default withTestSelection(varianceConfig, {
  root: fileURLToPath(new URL('../..', import.meta.url)),
})
