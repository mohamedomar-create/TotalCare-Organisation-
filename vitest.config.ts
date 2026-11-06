import { defineConfig } from 'vitest/config'

// Only this app's tests; crm-builder/ is a separate project with its own tests.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } })
