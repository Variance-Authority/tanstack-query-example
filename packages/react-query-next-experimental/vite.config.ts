import { fileURLToPath } from 'node:url'
import { withTestSelection } from '@variance-authority/sense/vitest'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
})

export default withTestSelection(varianceConfig, {
  root: fileURLToPath(new URL('../..', import.meta.url)),
})
