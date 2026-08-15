import { test, expect, type Page } from '@playwright/test'

/**
 * The gate — acceptance criteria #2 and #3.
 *
 * Both halves are tested, because a build that can only demonstrate the blocked
 * branch of its own most important rule is proving very little. `?fixture=clean`
 * loads a second payload with no critical or major issues; the gate itself is
 * unchanged, it just has different issues to read.
 */

const BLOCKED = '/reviews/souj5sd12c8a3f'
// v3 is the same document re-uploaded with the blockers resolved.
const CLEAN = '/reviews/souj5sd12c8a3f?v=3'

/**
 * No localStorage clearing here on purpose. Every test gets a fresh browser
 * context, so it starts empty — and an `addInitScript` that clears it would
 * re-run on *every* navigation, wiping the submission the reload test exists to
 * check.
 */
async function open(page: Page, url: string) {
  await page.goto(url)
  await expect(page.getByRole('list', { name: 'Issues' })).toBeVisible()
}

const submitButton = (page: Page) =>
  page.getByRole('button', { name: 'Submit review' }).filter({ visible: true })

/**
 * The verdict renders in two places on purpose — the panel in the full layout,
 * the bottom bar in the compact one — and the inactive one stays in the DOM.
 * Scoping to the region keeps these assertions about one of them.
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

  test('submit stays reachable and explains itself, rather than going dead', async ({ page }) => {
    await open(page, BLOCKED)
    const submit = submitButton(page)

    // aria-disabled, never disabled: a disabled button drops out of the tab
    // order and announces nothing, so a keyboard user passes the most important
    // control on the page and is never told why.
    await expect(submit).toHaveAttribute('aria-disabled', 'true')
    await expect(submit).not.toHaveAttribute('disabled', /.*/)
    await expect(submit).toHaveAttribute('aria-describedby', 'submit-blocked')
    await expect(page.locator('#submit-blocked')).toBeVisible()

    // It is focusable — the whole point of the choice above.
    await submit.focus()
    await expect(submit).toBeFocused()
  })

  test('pressing it does nothing at all', async ({ page }) => {
    await open(page, BLOCKED)
    // force, because Playwright treats aria-disabled as "not enabled" and would
    // refuse the click — which is exactly the click being tested.
    await submitButton(page).click({ force: true })
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(verdict(page).getByText('12 issues must be fixed')).toBeVisible()
  })
})

test.describe('once nothing is blocking', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('says so, in the opposite direction', async ({ page }) => {
    await open(page, CLEAN)
    // The build must not be overfitted to the supplied mock: hand it a clean
    // document and it declares the document good.
    await expect(verdict(page).getByText('Ready to submit')).toBeVisible()
    await expect(submitButton(page)).toHaveAttribute('aria-disabled', 'false')
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

  test('confirming submits, and the page stops asking the question', async ({ page }) => {
    await open(page, CLEAN)
    await submitButton(page).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Submit review' }).click()

    await expect(verdict(page).getByText('Submitted')).toBeVisible()
    await expect(verdict(page).getByText(/left unresolved/)).toBeVisible()
    // Gone, not disabled. The page has answered its own question.
    await expect(submitButton(page)).toHaveCount(0)
  })

  test('a submitted review renders as submitted on a cold load', async ({ page }) => {
    await open(page, CLEAN)
    await submitButton(page).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Submit review' }).click()
    await expect(verdict(page).getByText('Submitted')).toBeVisible()

    // The case that matters: status: 'submitted' is a value the API can return,
    // so this has to be a state you can arrive in, not only one you click into.
    await page.reload()
    await expect(page.getByRole('list', { name: 'Issues' })).toBeVisible()
    await expect(verdict(page).getByText('Submitted')).toBeVisible()
    await expect(submitButton(page)).toHaveCount(0)
  })
})
