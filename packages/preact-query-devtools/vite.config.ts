import { fileURLToPath } from 'node:url'
import { withTestSelection } from '@variance-authority/sense/vitest'
import preact from '@preact/preset-vite'
import { defineConfig } from 'vitest/config'
import packageJson from './package.json'
import type { UserConfig as ViteUserConfig } from 'vite'

const varianceConfig = defineConfig({
  plugins: [preact() as ViteUserConfig['plugins']],
  resolve: { conditions: ['@tanstack/custom-condition'] },
  environments: {
    ssr: { resolve: { conditions: ['@tanstack/custom-condition'] } },
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
