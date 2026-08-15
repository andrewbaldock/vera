import { test, expect, type Page } from '@playwright/test'

/**
 * The reviewer's private worklist.
 *
 * The load-bearing property is what it *cannot* do: ticking issues off never
 * moves the gate. `canSubmit` takes a whole `Review`, and a checkbox is not part
 * of one, so the separation is structural rather than a rule someone remembers.
 * If a checkbox could open the gate, a defective mortgage file could be
 * submitted by lying to a checkbox.
 */

const REVIEW = '/reviews/souj5sd12c8a3f'

test.use({ viewport: { width: 1440, height: 900 } })

const list = (page: Page) => page.getByRole('list', { name: 'Issues' })
const rows = (page: Page) => list(page).getByRole('listitem')
const verdict = (page: Page) => page.getByRole('region', { name: 'Issues found' })
const doneLozenge = (page: Page) =>
  verdict(page).getByRole('list', { name: 'Severity breakdown' }).getByRole('button', {
    name: /marked done/,
  })

async function open(page: Page) {
  await page.goto(REVIEW)
  await expect(list(page)).toBeVisible()
}

async function markDone(page: Page, count: number) {
  const boxes = page.getByRole('checkbox', { name: /^Mark/ })
  for (let i = 0; i < count; i += 1) await boxes.nth(i).click()
}

test('there is no Done control until something is done', async ({ page }) => {
  await open(page)
  await expect(doneLozenge(page)).toHaveCount(0)
  await expect(verdict(page).getByText(/marked done/)).toHaveCount(0)
})

test('marking issues done reports progress without moving the gate', async ({ page }) => {
  await open(page)
  await markDone(page, 4)

  // Progress sits beside the verdict, never inside it.
  await expect(verdict(page).getByText('4 marked done')).toBeVisible()
  // And the verdict is untouched: four ticks changed nothing about what blocks.
  await expect(verdict(page).getByText('12 issues must be fixed')).toBeVisible()
  // Still blocked, so the available action is still a new version — ticking
  // things off is a worklist, not a key.
  await expect(page.getByRole('button', { name: 'Upload new version' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit review' })).toHaveCount(0)
})

test('the Done lozenge hides and shows the rows it counts', async ({ page }) => {
  await open(page)
  await markDone(page, 4)
  await expect(rows(page)).toHaveCount(25)

  await doneLozenge(page).click()
  await expect(rows(page)).toHaveCount(21)
  // Same rule as the severity lozenges: the count stays honest, the opacity
  // carries the state.
  await expect(doneLozenge(page)).toContainText('4')
  await expect(doneLozenge(page)).toHaveAttribute('aria-pressed', 'false')

  await doneLozenge(page).click()
  await expect(rows(page)).toHaveCount(25)
})

test('sorting by severity sinks the done ones', async ({ page }) => {
  await open(page)
  await markDone(page, 3)
  await expect(verdict(page).getByText('3 marked done')).toBeVisible()

  await page.getByRole('button', { name: 'Change sort order' }).click()
  await page.getByRole('menuitem', { name: 'Severity' }).click()

  const boxes = list(page).locator('[data-slot="checkbox"]')
  await expect(boxes).toHaveCount(25)
  const states = await boxes.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-state') === 'checked'),
  )

  // Page order is a map of the document, so handled issues keep their place.
  // Severity order is a worklist, so what is left to do belongs at the top.
  const firstDone = states.indexOf(true)
  const lastOutstanding = states.lastIndexOf(false)
  expect(firstDone).toBeGreaterThan(-1)
  expect(lastOutstanding).toBeLessThan(firstDone)
})

test('the marks survive a reload but do not cross versions', async ({ page }) => {
  await open(page)
  await markDone(page, 2)
  await expect(verdict(page).getByText('2 marked done')).toBeVisible()

  await page.reload()
  await expect(list(page)).toBeVisible()
  await expect(verdict(page).getByText('2 marked done')).toBeVisible()

  // v3 is a different issue list entirely. A tick carried over from v2 would
  // claim a defect was handled when the new review never raised it.
  await page.goto(`${REVIEW}?v=3`)
  await expect(list(page)).toBeVisible()
  await expect(verdict(page).getByText(/marked done/)).toHaveCount(0)
})
