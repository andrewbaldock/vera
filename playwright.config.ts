import { defineConfig, devices } from '@playwright/test'

/**
 * Layout tests run in a real browser because they have to.
 *
 * jsdom has no layout engine — it will happily report that a 900px panel fits
 * in a 320px window — so the one class of bug these tests exist to catch is
 * exactly the class jsdom cannot see. That is the whole argument for Playwright
 * here rather than another vitest file.
 *
 * Chromium and WebKit only. WebKit is what Safari is built on, which is the
 * closest we can get in CI to the target browser — but it is not Safari, and
 * its "Mobile Safari" is emulation. It will not reproduce `dvh` against the
 * real toolbar, safe-area insets, or momentum scrolling. The iOS Simulator
 * stays the mobile truth; this suite is the regression net underneath it.
 *
 * Firefox is deliberately absent: it isn't a target, and it's the least
 * representative of the three.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : [['list']],

  use: {
    baseURL: 'http://localhost:1337',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:1337',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
