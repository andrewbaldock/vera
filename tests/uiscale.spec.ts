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
   * reads the root size and puts a floor under its own scale instead.
   */
  test('the thumb strip trades the whole-document view for legible segments', async ({ page }) => {
    const strip = page.locator('[role="slider"][aria-label="Document pages"]')
    await expect(strip).toBeVisible()

    const measure = () =>
      strip.evaluate((el) => {
        const list = el.querySelector('ol')!
        const segment = list.children[0] as HTMLElement
        const number = list.querySelector('span') as HTMLElement | null
        return {
          segmentHeight: segment.getBoundingClientRect().height,
          scrolls: list.scrollHeight > list.clientHeight,
          numberPx: number ? parseFloat(number.style.fontSize) : 0,
        }
      })

    // At the shipped size the fit still wins on a 34-page document, so the
    // strip stays a map of the whole thing and never scrolls. This is the
    // assertion that keeps the floor from quietly changing v1.0 behavior.
    const before = await measure()
    expect(before.scrolls).toBe(false)

    await chooseSize(page, 'Large')
    await expect.poll(() => rootFontSize(page)).toBe(ROOT_FONT_PX.large)
    await expect.poll(async () => (await measure()).scrolls).toBe(true)

    const after = await measure()
    expect(after.segmentHeight).toBeGreaterThan(before.segmentHeight)
    expect(after.numberPx).toBeGreaterThan(before.numberPx)
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
