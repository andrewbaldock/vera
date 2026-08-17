import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

/**
 * Automated rule scan. This is the floor, not the ceiling — axe catches the
 * mechanical failures (a control with no accessible name, a heading level
 * skipped, a contrast pair under the threshold) and cannot tell you whether
 * the page makes sense to listen to. That part is still a person with a screen
 * reader.
 *
 * Both routes, both themes. The theme matters because the palettes are
 * separate: a pair that clears the floor in one can fail in the other, which
 * is exactly what happened to secondary text before it was measured.
 *
 * Scoped to `wcag2a`/`wcag2aa`/`wcag21aa` rather than every rule axe ships.
 * The extras are largely best-practice advisories, and a suite that fails on
 * advice is a suite people learn to ignore.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa']

const ROUTES = [
  { name: 'the queue', path: '/documents', ready: 'link' as const },
  { name: 'a review', path: '/reviews/souj5sd12c8a3f', ready: 'grid' as const },
]

/**
 * Wait for anything mid-transition to land. A contrast rule reads the computed
 * background, and a trigger caught 96% of the way through a fade blends toward
 * the surface behind it — which axe correctly reports as a real 3.37:1 and is
 * gone a frame later. Infinite animations are excluded, or the shimmer and the
 * submit sweep would never resolve.
 */
async function settle(page: Page) {
  // Polled rather than awaited once: a dialog's entrance animation starts
  // after it becomes visible, so a single `finished` resolves before the
  // interesting transition has begun.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter(
            (a) =>
              a.playState === 'running' &&
              (a.effect as KeyframeEffect | null)?.getTiming().iterations !== Infinity,
          ).length,
      ),
    )
    .toBe(0)
}

async function scan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(TAGS)
    // pdf.js paints the document into a canvas with a text layer over it. It is
    // third-party output rather than our markup, and its inaccessibility is a
    // known limitation with a server-side fix -- see 06-accessibility.md. Rules
    // run against everything we author.
    .exclude('.react-pdf__Document')
    .analyze()
}

for (const theme of ['light', 'dark'] as const) {
  for (const route of ROUTES) {
    test(`${route.name} has no WCAG violations — ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.addInitScript((t) => localStorage.setItem('vera.theme', t), theme)
      await page.goto(route.path)

      // Wait for the real thing, not a loading state: scanning the skeleton
      // proves nothing about the page.
      if (route.ready === 'grid') {
        await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()
      } else {
        await expect(page.getByRole('link', { name: /annual compliance report/i })).toBeVisible()
      }

      await settle(page)
      const { violations } = await scan(page)

      // Named in the failure, so a red build says which rule and where rather
      // than only how many.
      expect(
        violations.map((v) => `${v.id} (${v.nodes.length}) — ${v.help}`),
        `axe violations on ${route.path} in ${theme} mode`,
      ).toEqual([])
    })
  }
}

test('the confirmation dialog is clean while open', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  // v3 is the version nothing is blocking, so submit is actually reachable.
  await page.goto('/reviews/souj5sd12c8a3f?v=3')
  await page.getByRole('button', { name: /submit review/i }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await settle(page)

  const { violations } = await scan(page)
  expect(violations.map((v) => `${v.id} — ${v.help}`)).toEqual([])
})
