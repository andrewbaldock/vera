import { test, expect, type Page } from '@playwright/test'

/**
 * The issues list is a grid, and moves like one.
 *
 * Twenty-five rows with two focusable controls each is fifty tab stops if you
 * do nothing — a keyboard user's afternoon. As a grid it is one tab stop, and
 * the arrows move inside it: up and down through the issues, Enter to open the
 * page, right or Tab across to the Done box, left or Shift+Tab back.
 *
 * The property that matters most is the last one: focus stays put after Enter.
 * Read an issue, open its page, arrow to the next, open that — without ever
 * reaching for the mouse or losing your place in the list.
 */

const REVIEW = '/reviews/souj5sd12c8a3f'

test.use({ viewport: { width: 1440, height: 900 } })

const grid = (page: Page) => page.getByRole('grid', { name: 'Issues' })
const cell = (page: Page, row: number, col: number) =>
  grid(page).locator(`[data-cell="${row}-${col}"]`)

async function open(page: Page) {
  await page.goto(REVIEW)
  await expect(grid(page)).toBeVisible()
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
  // The point of the whole pattern: read, open, arrow on, open the next.
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
