import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Two suites, two runners, no overlap.
 *
 * Unit tests sit beside the code they test in `src/`, because the rules are
 * pure functions and the shortest path between a function and its test is the
 * next file along. `tests/` belongs to Playwright — layout needs a real browser
 * and there is nothing vitest can say about it. Without this include, vitest
 * picks up the Playwright specs and fails on their `test.describe`.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
