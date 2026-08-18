import { test, expect } from '@playwright/test'

/**
 * The interface size setting. Three stops applied as the root font size, which
 * is what moves type and spacing together, since Tailwind sizes both in rem.
 *
 * What is worth asserting is the chain end to end: the menu writes a
 * preference, the root font size changes, the preference survives a reload,
 * and it is applied before the app mounts. The last one is the reason for the
 * inline script in index.html, and it is invisible in a screenshot because the
 * reflow it prevents is over in one frame.
 *
 * The document is checked too. It is measured in px from its panel, so it must
 * not move when the interface does, and that separation is the whole reason
 * this setting exists instead of telling people to use browser zoom.
 */

const REVIEW = '/reviews/doc-1'

/** Percentages of a 16px browser default. Kept in step with index.css. */
const ROOT_FONT_PX = {
  compact: 14,
  comfortable: 16,
  large: 20,
} as const

function rootFontSize(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).fontSize),
  )
}

async function chooseSize(page: import('@playwright/test').Page, label: string) {
  await page.getByRole('button', { name: /account and settings/i }).click()
  await page.getByRole('menuitemradio', { name: label }).click()
  // The menu closes and returns focus; without settling here the next
  // measurement can race the class change.
  await expect(page.getByRole('menuitemradio', { name: label })).toBeHidden()
}

test.describe('the interface size setting', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(REVIEW)
  })

  test('ships at the middle stop', async ({ page }) => {
    await expect.poll(() => rootFontSize(page)).toBe(ROOT_FONT_PX.comfortable)
    await expect(page.locator('html')).toHaveAttribute('data-ui-scale', 'comfortable')
  })

  test('each stop moves the root font size', async ({ page }) => {
    await chooseSize(page, 'Large')
    await expect.poll(() => rootFontSize(page)).toBe(ROOT_FONT_PX.large)

    await chooseSize(page, 'Compact')
    await expect.poll(() => rootFontSize(page)).toBe(ROOT_FONT_PX.compact)
  })

  test('the choice survives a reload', async ({ page }) => {
    await chooseSize(page, 'Large')
    await page.reload()
    await expect.poll(() => rootFontSize(page)).toBe(ROOT_FONT_PX.large)
  })

  test('the size lands before any script runs', async ({ page }) => {
    await chooseSize(page, 'Large')

    // Every script blocked, so React never mounts and the hook never runs. What
    // is left is the inline script in index.html, which is the only thing that
    // can set the attribute — and the only thing that can set it *before first
    // paint*, which is the point. Without this the test passes either way:
    // `toHaveAttribute` retries for five seconds, React mounts inside that
    // window, and the provider's effect writes the attribute anyway.
    await page.route('**/*.js', (route) => route.abort())
    await page.goto(REVIEW, { waitUntil: 'commit' })

    const applied = await page.evaluate(() => document.documentElement.dataset.uiScale)
    expect(applied, 'set by the inline script, with no JS bundle at all').toBe('large')
  })

  test('a junk stored value falls back instead of becoming a selector', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('vera.uiScale', 'enormous'))
    await page.reload({ waitUntil: 'commit' })
    await expect(page.locator('html')).toHaveAttribute('data-ui-scale', 'comfortable')
  })

  /**
   * The thumb strip sizes itself from arithmetic, not from CSS, so it is the
   * one part of the interface the root font size cannot move on its own. It
   * reads the root size directly instead.
   *
   * Its segments are sized by the strip's width, which now has a default wide
   * enough that the rem floor never binds — so the size setting moves the page
   * numbers on the segments rather than the segments themselves.
   */
  test('the thumb strip page numbers follow the interface size', async ({ page }) => {
    const strip = page.locator('[role="slider"][aria-label="Document pages"]')
    await expect(strip).toBeVisible()

    const measure = () =>
      strip.evaluate((el) => {
        // The *rendered* list, not merely the first one in the DOM. When the
        // raster chunk suspends, React keeps the already-mounted copy mounted
        // and hides it with an inline `display: none !important`, rendering the
        // fallback list beside it — so there are two `<ol>`s, and the hidden one
        // comes first. Measuring that one reports a segment height of 0 and a
        // list that does not scroll, which is a fact about a hidden element
        // rather than about this strip.
        const list = [...el.querySelectorAll('ol')].find((ol) => ol.clientHeight > 0)
        if (!list) return { segmentHeight: 0, scrolls: false, numberPx: 0, ready: false }
        const segment = list.children[0] as HTMLElement
        // Selected by the inline size the component sets, not by being the
        // first span in the list: the segment holds other spans, and which one
        // comes first is not this test's subject.
        const number = list.querySelector('span[style*="font-size"]') as HTMLElement | null
        return {
          segmentHeight: segment.getBoundingClientRect().height,
          scrolls: list.scrollHeight > list.clientHeight,
          numberPx: number ? parseFloat(number.style.fontSize) : 0,
          ready: true,
        }
      })

    // The strip sizes itself from a measurement of its own column, so settle on
    // a measured strip before reading anything off it. This is a precondition,
    // not the subject.
    await expect.poll(async () => (await measure()).ready).toBe(true)

    // The default width is past the point where 34 pages fit the column, so the
    // strip scrolls from the start rather than shrinking them to a thread.
    const before = await measure()
    expect(before.scrolls).toBe(true)

    await chooseSize(page, 'Large')
    await expect.poll(() => rootFontSize(page)).toBe(ROOT_FONT_PX.large)
    await expect.poll(async () => (await measure()).numberPx).toBeGreaterThan(before.numberPx)

    // The segments do not move with it: their size comes from the strip's
    // width, and the reader sets that by dragging. Polled rather than sampled
    // once — the size change reflows the strip, and the claim is about where it
    // lands, not about every frame on the way there.
    await expect.poll(async () => (await measure()).segmentHeight).toBe(before.segmentHeight)
  })

  test('the document does not scale with the interface', async ({ page }) => {
    // Scoped to the viewer: the issues list carries `data-page` too, on the
    // row for the finding on that page.
    const page1 = page.locator('#document-panel [data-page="1"]')
    await expect(page1).toBeVisible()
    const before = await page1.boundingBox()

    await chooseSize(page, 'Large')
    await expect.poll(() => rootFontSize(page)).toBe(ROOT_FONT_PX.large)

    // The document panel gets narrower, because the interface around it grew,
    // so the page cannot be asserted identical. What must hold is that it did
    // not grow with the type.
    const after = await page1.boundingBox()
    expect(after!.width).toBeLessThanOrEqual(before!.width)
  })
})
