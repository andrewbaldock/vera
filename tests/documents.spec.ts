import { test, expect, type Page } from '@playwright/test'

/**
 * The documents list and the version switch.
 *
 * The list exists so the gate can be exercised more than once — opened from
 * somewhere, returned to, and run again. That makes it demo infrastructure
 * rather than product, and the tests here are mostly about it being honest:
 * the placeholders must not pretend to be interactive, and the reset must
 * actually reset.
 */

const REVIEW = '/reviews/souj5sd12c8a3f'

test.use({ viewport: { width: 1440, height: 900 } })

async function openList(page: Page) {
  await page.goto('/documents')
  await expect(page.getByRole('list', { name: 'Documents' })).toBeVisible()
}

test('the app lands on the list', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/documents$/)
  await expect(page.getByRole('list', { name: 'Documents' })).toBeVisible()
})

test('exactly one row is a link, and the placeholders are not', async ({ page }) => {
  await openList(page)

  const rows = page.getByRole('list', { name: 'Documents' }).getByRole('listitem')
  await expect(rows).toHaveCount(4)

  // The whole point of the placeholders: nothing focusable that goes nowhere.
  // A div cannot be tabbed to or pressed, which is stronger than styling it to
  // look inert and hoping.
  await expect(page.getByRole('list', { name: 'Documents' }).getByRole('link')).toHaveCount(1)
  await expect(page.getByRole('list', { name: 'Documents' }).getByRole('button')).toHaveCount(0)
})

test('opening the document lands on the review, and the back link returns', async ({ page }) => {
  await openList(page)
  await page.getByRole('link', { name: /Annual Compliance Report/ }).click()

  await expect(page).toHaveURL(new RegExp(REVIEW))
  await expect(page.getByRole('list', { name: 'Issues' })).toBeVisible()

  await page.getByRole('link', { name: 'Documents' }).click()
  await expect(page).toHaveURL(/\/documents$/)
})

test.describe('versions', () => {
  test('the review opens on v2, where the gate is closed', async ({ page }) => {
    await page.goto(REVIEW)
    await expect(page.getByRole('region', { name: 'Issues found' })).toContainText(
      '12 issues must be fixed',
    )
    await expect(page.getByRole('button', { name: 'Change version' })).toContainText('v2')
  })

  test('switching version changes the review, and the URL says so', async ({ page }) => {
    await page.goto(REVIEW)
    await page.getByRole('button', { name: 'Change version' }).click()
    await page.getByRole('menuitem', { name: /v3/ }).click()

    // The version is in the URL because it is a different thing to look at, so
    // it deserves an address — this link can be pasted and reloaded.
    await expect(page).toHaveURL(/v=3/)
    await expect(page.getByRole('region', { name: 'Issues found' })).toContainText(
      'Ready to submit',
    )
  })

  test('a version link survives a reload', async ({ page }) => {
    await page.goto(`${REVIEW}?v=3`)
    await expect(page.getByRole('region', { name: 'Issues found' })).toContainText(
      'Ready to submit',
    )
    await page.reload()
    await expect(page.getByRole('region', { name: 'Issues found' })).toContainText(
      'Ready to submit',
    )
  })
})

test('the demo reset puts a submitted review back', async ({ page }) => {
  await page.goto(`${REVIEW}?v=3`)
  await page.getByRole('button', { name: 'Submit review' }).filter({ visible: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('region', { name: 'Issues found' })).toContainText('Submitted')

  await openList(page)
  await page.getByRole('button', { name: /Reset demo data/ }).click()

  // Without this, whoever is evaluating the build gets one shot at the most
  // important interaction in it.
  await page.goto(`${REVIEW}?v=3`)
  await expect(page.getByRole('region', { name: 'Issues found' })).toContainText('Ready to submit')
})

test('issue descriptions are rendered, not just titles', async ({ page }) => {
  await page.goto(REVIEW)
  // The title names the problem; only the description says what is wrong. It
  // was in the type and in the fixture and on screen nowhere.
  await expect(
    page.getByText(/match the inspection date on the cover page/).first(),
  ).toBeVisible()
})
