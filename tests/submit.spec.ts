import { test, expect, type Page } from '@playwright/test'

/**
 * The submit rule: acceptance criteria #2 and #3. Both halves are tested, because a
 * build that can only demonstrate the blocked branch proves half the rule.
 * `?v=3` loads the same document re-uploaded with the blockers resolved; the
 * rule itself is unchanged, it just has different issues to read.
 */

const BLOCKED = '/reviews/souj5sd12c8a3f'
// v3 is the same document re-uploaded with the blockers resolved.
const CLEAN = '/reviews/souj5sd12c8a3f?v=3'

/**
 * No localStorage clearing here. Every test gets a fresh browser context, so it
 * starts empty, and an `addInitScript` that cleared it would re-run on *every*
 * navigation, wiping the submission the reload test exists to check.
 */
async function open(page: Page, url: string) {
  await page.goto(url)
  await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()
}

/**
 * Submitting lands on the queue, and the queue starts rendering a cover page per
 * row. Navigating out of that while pdf.js is still working crashed WebKit on CI
 * — `page.goto: WebKit encountered an internal error`, a browser-process fault
 * rather than a failed assertion. Waiting for the queue to finish gives the
 * navigation a settled page to leave from.
 */
async function backToReview(page: Page, url: string) {
  await expect(page).toHaveURL(/\/documents/)
  // The cover pages are the pdf.js work — wait for one to have painted.
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.goto(url)
}

const submitButton = (page: Page) =>
  page.getByRole('button', { name: 'Submit review' }).filter({ visible: true })

/**
 * The verdict renders in two places, the panel in the full layout and the bottom
 * bar in the compact one, and the inactive one stays in the DOM. Scoping to the
 * region keeps these assertions about one of them.
 */
const verdict = (page: Page) => page.getByRole('region', { name: 'Issues found' })

test.describe('while something is blocking', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('says what is blocking, and how much of it', async ({ page }) => {
    await open(page, BLOCKED)
    await expect(verdict(page).getByText('12 issues must be fixed')).toBeVisible()
    // The breakdown is part of the answer: 12 blocking is 4 critical + 8 major.
    const breakdown = verdict(page).getByRole('list', { name: 'Severity breakdown' })
    await expect(breakdown.getByRole('listitem').filter({ hasText: 'Critical' })).toContainText('4')
    await expect(breakdown.getByRole('listitem').filter({ hasText: 'Major' })).toContainText('8')
  })

  test('offers the action that is actually available, not the one that is not', async ({
    page,
  }) => {
    await open(page, BLOCKED)

    // A control labeled with something it refuses to perform is a lie told on
    // every render, and disabling it only makes the lie quieter. While blockers
    // remain, the available action is a new version of the document.
    await expect(submitButton(page)).toHaveCount(0)

    const action = page.getByRole('button', { name: 'Upload new version' }).first()
    await expect(action).toBeVisible()
    // Still explains itself: the reason is one keystroke away.
    await expect(action).toHaveAttribute('aria-describedby', 'submit-blocked')
    await expect(page.locator('#submit-blocked')).toBeVisible()

    // Enabled and focusable: no dead control anywhere on the page.
    await expect(action).toBeEnabled()
    await action.focus()
    await expect(action).toBeFocused()

    // And it opens the handoff rather than pretending this app uploads.
    await action.click()
    await expect(page.getByRole('dialog', { name: 'Upload a new version' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upload', exact: true })).toBeDisabled()
  })
})

test.describe('once nothing is blocking', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('says so, in the opposite direction', async ({ page }) => {
    await open(page, CLEAN)
    // The build must not be overfitted to the supplied mock: hand it a clean
    // document and it declares the document good.
    await expect(verdict(page).getByText('Ready to submit')).toBeVisible()
    // The action swaps identity with the state: no upload prompt once there is
    // nothing left to fix.
    await expect(submitButton(page)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Upload new version' })).toHaveCount(0)
  })

  test('asks for confirmation, naming the minors being ignored', async ({ page }) => {
    await open(page, CLEAN)
    await submitButton(page).click()

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    // A number is something you can decide against; "some issues" is not.
    await expect(dialog.getByText(/6 minor issues/)).toBeVisible()
    await expect(dialog.getByText(/can’t be undone/)).toBeVisible()
  })

  test('cancelling leaves the review exactly as it was', async ({ page }) => {
    await open(page, CLEAN)
    await submitButton(page).click()
    await page.getByRole('button', { name: 'Keep reviewing' }).click()

    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(verdict(page).getByText('Ready to submit')).toBeVisible()
    await expect(submitButton(page)).toBeVisible()
  })

  test('confirming submits and returns you to the queue', async ({ page }) => {
    await open(page, CLEAN)
    await submitButton(page).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Submit review' }).click()

    // Having just finished one, the useful next screen is the list you came
    // from, where the row landing as finished is the confirmation.
    await expect(page).toHaveURL(/\/documents\?submitted=/)
    await expect(
      page.getByRole('list', { name: 'Documents' }).getByText('Submitted').first(),
    ).toBeVisible()
  })

  test('and the review itself now reads as submitted', async ({ page }) => {
    await open(page, CLEAN)
    await submitButton(page).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Submit review' }).click()
    await backToReview(page, CLEAN)
    await expect(verdict(page).getByText('Submitted')).toBeVisible()
    await expect(verdict(page).getByText(/accepted as-is/)).toBeVisible()
    // Gone, not disabled. The page has answered its own question.
    await expect(submitButton(page)).toHaveCount(0)
  })

  test('a submitted review renders as submitted on a cold load', async ({ page }) => {
    await open(page, CLEAN)
    await submitButton(page).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Submit review' }).click()
    await backToReview(page, CLEAN)
    await expect(verdict(page).getByText('Submitted')).toBeVisible()

    // The case that matters: status: 'submitted' is a value the API can return,
    // so this has to be a state you can arrive in, not only one you click into.
    await page.reload()
    await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()
    await expect(verdict(page).getByText('Submitted')).toBeVisible()
    await expect(submitButton(page)).toHaveCount(0)
  })
})
