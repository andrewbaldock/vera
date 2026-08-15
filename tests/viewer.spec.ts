import { test, expect, type Page } from '@playwright/test'

/**
 * The viewer's three load-bearing behaviors.
 *
 * These are the evidence for acceptance criterion #1 and for the architecture
 * the mobile design turns on. They are asserted here rather than described in a
 * document, because "every text layer is mounted" is exactly the kind of claim
 * that quietly stops being true.
 */

const PAGE_COUNT = 34
const DEEP_IN_THE_DOCUMENT = 'RECONCILIATION'

test.use({ viewport: { width: 1440, height: 900 } })

async function gotoViewer(page: Page) {
  await page.goto('/reviews/souj5sd12c8a3f')
  await expect(page.getByRole('list', { name: 'Issues' })).toBeVisible()
  // The first canvas appearing means pdf.js has parsed and started painting.
  await expect(page.locator('.react-pdf__Page__canvas').first()).toBeVisible({ timeout: 20_000 })
}

test('every page has a text layer, so browser find can reach the whole document', async ({
  page,
}) => {
  await gotoViewer(page)

  await expect(page.locator('.textLayer')).toHaveCount(PAGE_COUNT)

  // The real assertion is not the count but the consequence: text from deep in
  // the document is in the DOM while the user is looking at page 1. That is
  // what CMD+F and iOS "Find on Page" actually search.
  //
  // Polled, because pdf.js fills the text layers one page at a time after the
  // elements themselves exist — asserting the moment the first canvas paints is
  // a race, and one that passes locally and fails on a slower machine.
  await expect
    .poll(async () => page.evaluate(() => document.body.innerText.toUpperCase()), {
      timeout: 30_000,
    })
    .toContain(DEEP_IN_THE_DOCUMENT)
})

test('canvases are windowed, so 34 pages do not cost 34 canvases', async ({ page }) => {
  await gotoViewer(page)

  // ~10 MB per full-width canvas at DPR 2 means all 34 approaches 350 MB, and
  // iOS Safari discards tabs for less. The text layer is what find needs; the
  // canvas is what costs memory. They are separable, and this proves it.
  const canvases = await page.locator('.react-pdf__Page__canvas').count()
  expect(canvases).toBeLessThan(10)
  expect(canvases).toBeGreaterThan(0)
})

test('clicking an issue scrolls the document, and the page in view reports back', async ({
  page,
}) => {
  await gotoViewer(page)

  const scrollTop = () =>
    page.locator('main div.overflow-y-auto').evaluate((el) => Math.round(el.scrollTop))

  // Polled throughout: scrolling is asynchronous and smooth scrolling is slow,
  // so a bare read is a race that passes on an idle machine and fails on a busy
  // one. Nothing here should need a retry to be true.
  await expect.poll(scrollTop).toBe(0)

  // "Appraiser Certification Unsigned" is on page 33 — far enough that landing
  // there by accident is not plausible.
  await page.getByRole('button', { name: /Appraiser Certification Unsigned/ }).click()

  // Nothing sets the page directly: the seek scrolls, the reading line measures,
  // and every other region follows from that single value.
  await expect(page.getByRole('slider', { name: 'Document pages' })).toHaveAttribute(
    'aria-valuenow',
    '33',
  )
  await expect(page.getByText(/Page 33/).first()).toBeVisible()
  await expect.poll(scrollTop, { timeout: 15_000 }).toBeGreaterThan(1000)

  // And the highlight in the list is the same one value, seen a third way.
  await expect(page.locator('[aria-label="Issues"] button[aria-current="page"]')).toHaveCount(1)
})
