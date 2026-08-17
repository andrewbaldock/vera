import { test, expect, type Page } from '@playwright/test'

/**
 * Document zoom. Pinch itself is not synthesised here — dispatching two
 * pointers tests the synthesiser more than the app — but everything the gesture
 * shares with the buttons is, and that is most of the risk: the bounds, the
 * controls, the keyboard path, and the promise that the page you were reading
 * is still the page you are on afterwards.
 */

const REVIEW = '/reviews/souj5sd12c8a3f'
const DOC = '[data-scroller="document"]'

const zoomIn = (page: Page) => page.getByRole('button', { name: 'Zoom in' })
const zoomOut = (page: Page) => page.getByRole('button', { name: 'Zoom out' })

/** Presses until the control disables itself, which is how the bound is stated. */
async function pressToLimit(button: ReturnType<typeof zoomIn>) {
  for (let i = 0; i < 20 && (await button.isEnabled()); i += 1) await button.click()
}

/** The rendered width of the first page, which is what zoom actually changes. */
function pageWidth(page: Page) {
  return page
    .locator('#document-panel [data-page="1"]')
    .evaluate((el) => Math.round(el.getBoundingClientRect().width))
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(REVIEW)
  await expect(page.locator('.react-pdf__Page__canvas').first()).toBeVisible({ timeout: 20_000 })
})

/**
 * The readout is generated content, so it has no text node to match on — which
 * is the point: browser find must not reach the app's own chrome. Selected by
 * the percent suffix, since the page counter is a readout too.
 */
const readout = (page: Page) =>
  page.locator('#document-panel [data-readout$="%"]').getAttribute('data-readout')

test('the controls exist, and say where you are', async ({ page }) => {
  await expect(zoomIn(page)).toBeVisible()
  await expect(zoomOut(page)).toBeVisible()
  expect(await readout(page)).toBe('100%')
  // WCAG 2.5.1: pinch is multipoint, so there has to be a single-pointer path.
  await expect(zoomIn(page)).toBeEnabled()
  await expect(zoomOut(page)).toBeDisabled()
})

test('zooming in makes the page bigger, and out brings it back', async ({ page }) => {
  const fit = await pageWidth(page)

  await zoomIn(page).click()
  await expect.poll(() => pageWidth(page)).toBeGreaterThan(fit)

  await zoomOut(page).click()
  await expect.poll(() => pageWidth(page)).toBe(fit)
})

test('it stops at both ends rather than running away', async ({ page }) => {
  await pressToLimit(zoomIn(page))
  await expect(zoomIn(page)).toBeDisabled()
  expect(await readout(page)).toBe('400%')

  await pressToLimit(zoomOut(page))
  await expect(zoomOut(page)).toBeDisabled()
  expect(await readout(page)).toBe('100%')
})

test('the page you were reading is the page you are still on', async ({ page }) => {
  // Land somewhere well into the document, where a bad anchor is obvious.
  await page.locator('#document-panel [data-page="14"]').evaluate((el) =>
    el.scrollIntoView({ block: 'start', behavior: 'instant' }),
  )
  await expect.poll(() => page.locator('main').innerText()).toContain('PAGE 14')

  await zoomIn(page).click()
  await zoomIn(page).click()

  // Every reserved height changed, so the scroll offset that meant page 14
  // before means something else now. The anchor is what puts it back.
  await expect.poll(() => page.locator('main').innerText()).toContain('PAGE 14')
})

test('zoomed pages can be panned to, not clipped', async ({ page }) => {
  await pressToLimit(zoomIn(page))

  const overflow = await page.locator(DOC).evaluate((el) => ({
    scrollable: el.scrollWidth > el.clientWidth,
    reachable: (() => {
      el.scrollLeft = el.scrollWidth
      return el.scrollLeft > 0
    })(),
  }))
  expect(overflow.scrollable, 'a page wider than its panel').toBe(true)
  expect(overflow.reachable, 'and the far edge can be scrolled to').toBe(true)
})

test('the canvas stays inside the platform limit at full zoom', async ({ page }) => {
  await pressToLimit(zoomIn(page))
  await expect(zoomIn(page)).toBeDisabled()

  // iOS Safari refuses a canvas over 4096px on a side and hands back a blank
  // one, so exceeding it does not throw — the pages simply go white.
  await expect
    .poll(
      async () =>
        page.locator('.react-pdf__Page__canvas').first().evaluate((c) => {
          const el = c as HTMLCanvasElement
          return Math.max(el.width, el.height)
        }),
      { timeout: 20_000 },
    )
    .toBeLessThanOrEqual(4096)
})


test('the readout is the way back to 100%', async ({ page }) => {
  await zoomIn(page).click()
  await zoomIn(page).click()
  expect(await readout(page)).not.toBe('100%')

  await page.getByRole('button', { name: 'Reset zoom to 100 percent' }).click()
  expect(await readout(page)).toBe('100%')
})
