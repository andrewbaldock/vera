import { test, expect, type Page } from '@playwright/test'

/**
 * The issues list is a grid and moves like one. Twenty-five rows with three
 * focusable controls each is otherwise seventy-five tab stops. As a grid it is
 * one tab stop and the arrows move inside it: up and down through the issues,
 * Enter to open the page, right or Tab across to the note and then the Done box,
 * left or Shift+Tab back.
 *
 * The property that matters most is that focus stays put after Enter: read an
 * issue, open its page, arrow to the next, open that, without losing your place.
 */

const REVIEW = '/reviews/souj5sd12c8a3f'

test.use({ viewport: { width: 1440, height: 900 } })

const grid = (page: Page) => page.getByRole('grid', { name: 'Issues' })
const cell = (page: Page, row: number, col: number) =>
  grid(page).locator(`[data-cell="${row}-${col}"]`)

async function open(page: Page) {
  await page.goto(REVIEW)
  await expect(grid(page)).toBeVisible()
  // Wait for the document to paint before driving the keyboard. Seeking before
  // the pages have laid out is handled (the request is held until layout
  // arrives, covered in viewer.spec), but racing it here would make every
  // assertion in this file depend on that timing rather than the keyboard.
  await expect(page.locator('.react-pdf__Page__canvas').first()).toBeVisible({ timeout: 20_000 })
  await cell(page, 0, 0).focus()
}

test('the whole list is a single tab stop', async ({ page }) => {
  await open(page)
  // Roving tabindex: exactly one cell is reachable by Tab at any moment.
  await expect(grid(page).locator('[tabindex="0"]')).toHaveCount(1)
})

test('up and down walk the issues', async ({ page }) => {
  await open(page)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(cell(page, 2, 0)).toBeFocused()

  await page.keyboard.press('ArrowUp')
  await expect(cell(page, 1, 0)).toBeFocused()
})

test('right and left cross the row: issue, note, done', async ({ page }) => {
  await open(page)
  await page.keyboard.press('ArrowRight')
  await expect(cell(page, 0, 1)).toBeFocused() // the note

  await page.keyboard.press('ArrowRight')
  await expect(cell(page, 0, 2)).toBeFocused()
  await expect(cell(page, 0, 2)).toHaveRole('checkbox')

  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(cell(page, 0, 0)).toBeFocused()
})

test('Tab crosses the row, and still escapes at the edge', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Tab')
  await expect(cell(page, 0, 1)).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(cell(page, 0, 0)).toBeFocused()

  // From the last column, Tab is left alone so nobody is trapped in the grid.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(cell(page, 0, 2)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(cell(page, 0, 2)).not.toBeFocused()
})

test('Enter opens the page and leaves you where you were', async ({ page }) => {
  await open(page)
  const slider = page.getByRole('slider', { name: 'Document pages' })

  // Row 5 is "Missing Flood Zone Documentation", on page 7.
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  // Smooth scroll, plus measurement suppressed until it settles.
  await expect(slider).toHaveAttribute('aria-valuenow', '7', { timeout: 15_000 })
  // Read, open, arrow on, open the next.
  await expect(cell(page, 4, 0)).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(cell(page, 5, 0)).toBeFocused()
})

test('Space ticks the Done box without leaving the grid', async ({ page }) => {
  await open(page)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(cell(page, 0, 2)).toBeFocused()
  await page.keyboard.press('Space')

  await expect(cell(page, 0, 2)).toBeChecked()
  await expect(cell(page, 0, 2)).toBeFocused()
  await expect(
    page.getByRole('region', { name: 'Issues found' }).getByText('1 marked done'),
  ).toBeVisible()
})

/**
 * The document scroller is a scrollable area, and one a keyboard cannot reach
 * is one a keyboard user cannot read past the first screen. Caught by the axe
 * rule scan as `scrollable-region-focusable`; asserted here as the behavior it
 * actually protects.
 */
test('the document can be scrolled from the keyboard', async ({ page }) => {
  await open(page)
  const scroller = page.locator('[data-scroller="document"]')

  await scroller.focus()
  await expect(scroller).toBeFocused()

  const before = await scroller.evaluate((el) => el.scrollTop)
  await page.keyboard.press('PageDown')
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(before)
})
