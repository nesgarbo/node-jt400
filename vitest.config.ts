import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['ts-src/unit-test/**/*.ts'],
    testTimeout: 5000,
  },
})
