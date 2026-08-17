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
  /**
   * One retry, not zero. These tests drive a real PDF renderer through smooth
   * scrolls in two engines at once, and on a loaded machine a scroll that
   * normally settles in 1.6s does not — which is a fact about the laptop, not
   * about the app. Zero retries means whoever runs this while a build is going
   * sees red on a suite that is green, and that is the wrong first impression to
   * hand someone.
   *
   * One, deliberately, not three: a test that needs two retries is telling you
   * something and should not be able to hide.
   */
  retries: 1,
  reporter: process.env.CI ? 'github' : [['list']],

  /**
   * Five seconds is the default and is plenty on a laptop. It is not on a shared
   * CI runner, which serves these tests from the Vite dev server on one worker:
   * whichever test reaches a route first pays for transforming its whole module
   * graph, pdf.js included, before anything renders. That cost lands on one
   * arbitrary test per run, which is why CI kept failing somewhere new each time
   * on a suite that is green everywhere else.
   *
   * Raised only under CI, so a genuine hang still surfaces quickly in
   * development rather than taking fifteen seconds to say so.
   */
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },

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
