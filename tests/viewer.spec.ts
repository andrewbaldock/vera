import { test, expect, type Page } from '@playwright/test'

/**
 * The viewer's three load-bearing behaviors: the evidence for acceptance
 * criterion #1 and for the architecture the mobile design turns on. Asserted
 * here rather than described in a document, because "every text layer is
 * mounted" is the kind of claim that quietly stops being true.
 */

const PAGE_COUNT = 34
const DEEP_IN_THE_DOCUMENT = 'RECONCILIATION'

test.use({ viewport: { width: 1440, height: 900 } })

async function gotoViewer(page: Page) {
  await page.goto('/reviews/souj5sd12c8a3f')
  await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()
  // The first canvas appearing means pdf.js has parsed and started painting.
  await expect(page.locator('.react-pdf__Page__canvas').first()).toBeVisible({ timeout: 20_000 })
}

test('every page has a text layer, so browser find can reach the whole document', async ({
  page,
}) => {
  await gotoViewer(page)

  await expect(page.locator('.textLayer')).toHaveCount(PAGE_COUNT)

  // The assertion is not the count but the consequence: text from deep in the
  // document is in the DOM while the user is looking at page 1, which is what
  // CMD+F and iOS "Find on Page" search.
  //
  // Polled, because pdf.js fills the text layers one page at a time after the
  // elements exist. Asserting the moment the first canvas paints is a race that
  // passes locally and fails on a slower machine.
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
  // canvas is what costs memory.
  const canvases = await page.locator('.react-pdf__Page__canvas').count()
  expect(canvases).toBeLessThan(10)
  expect(canvases).toBeGreaterThan(0)
})

test('clicking an issue scrolls the document, and the page in view reports back', async ({
  page,
}) => {
  await gotoViewer(page)

  // Scoped to the document panel, not `main`: the issues panel has a scroller
  // too and it comes first in the DOM, so the unscoped locator reads a element
  // that never moves and reports every seek as a failure.
  const scrollTop = () =>
    page.locator('#document-panel div.overflow-y-auto').evaluate((el) => Math.round(el.scrollTop))

  // Polled throughout: scrolling is asynchronous and smooth scrolling is slow,
  // so a bare read is a race that passes on an idle machine and fails on a busy
  // one.
  await expect.poll(scrollTop).toBe(0)

  // "Appraiser Certification Unsigned" is on page 33, far enough that landing
  // there by accident is not plausible.
  await page.locator('[data-cell$="-0"]').filter({ hasText: 'Appraiser Certification Unsigned' }).click()

  // Nothing sets the page directly: the seek scrolls, the reading line measures,
  // and every other region follows from that single value. The long timeout
  // covers a smooth scroll across thirty pages plus the measurement suppression
  // releasing. WebKit is slower at both.
  await expect(page.getByRole('slider', { name: 'Document pages' })).toHaveAttribute(
    'aria-valuenow',
    '33',
    { timeout: 20_000 },
  )
  await expect(page.getByText(/Page 33/).first()).toBeVisible()
  await expect.poll(scrollTop, { timeout: 15_000 }).toBeGreaterThan(1000)

  // And the highlight in the list is the same one value, seen a third way.
  await expect(page.locator('[aria-label="Issues"] [aria-current="page"]')).toHaveCount(1)
})

/**
 * Guards the blank-viewer failure: shrink a desktop window to phone width and
 * the viewer comes back showing page 34 of 34.
 *
 * In the compact layout the inactive tab is `display: none`, and a hidden
 * element has no layout box, so every page reports a top of zero and the reading
 * line concludes the last page whose top passed the line is the final one. That
 * parks the canvas window around page 34, which is nearly empty, so the document
 * looks like it failed to load.
 */
test.describe('resizing across the breakpoint', () => {
  test('keeps the page you were on, and the document still renders', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoViewer(page)

    await page.locator('[data-cell$="-0"]').filter({ hasText: 'Missing Flood Zone Documentation' }).click()
    await expect(page.getByRole('slider', { name: 'Document pages' })).toHaveAttribute(
      'aria-valuenow',
      '7',
    )

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('tab', { name: 'Document' }).click()

    // Still page 7, not the last page, and painting again at the new width.
    // Scoped to main and case-insensitive: the issues panel also says "Page 7"
    // in each row's meta line, and the status bar's capitals come from CSS.
    await expect(page.locator('main').getByText(/page 7/i).first()).toBeVisible()
    await expect(page.locator('.react-pdf__Page__canvas').first()).toBeVisible()
    const canvases = await page.locator('.react-pdf__Page__canvas').count()
    expect(canvases).toBeGreaterThan(0)
  })
})

/**
 * A tall window, deliberately, and this is the whole point of the test.
 *
 * The end-of-scroll case only bites when the panel is taller than one rendered
 * page: the reading line then needs page 34's top to rise above a line a quarter
 * of the way down, and at the bottom of the scroll there is nothing left to move
 * it. Measured on this fixture — the suite's usual 900px window gives an 806px
 * panel that puts that top 519px *above* the line, so the loop answers 34 by
 * itself and this test passes with the branch deleted. At 1600 the panel is
 * 1506px, the top sits 181px below the line, and the branch is the only thing
 * returning 34.
 *
 * A test that is green whether or not the code exists is worse than no test, so
 * this one runs where the code is load-bearing.
 */
test.describe('a window taller than a page', () => {
  test.use({ viewport: { width: 1440, height: 1600 } })

  test('scrolling to the end of the document reports the last page', async ({ page }) => {
    await gotoViewer(page)

    const strip = page.getByRole('slider', { name: 'Document pages' })
    await expect(strip).toHaveAttribute('aria-valuenow', '1')

    // All the way down, the way a reader gets to the end.
    await page
      .locator('#document-panel div.overflow-y-auto')
      .evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }))

    await expect
      .poll(() => strip.getAttribute('aria-valuenow'), { timeout: 10_000 })
      .toBe('34')
  })
})

/**
 * Both modalities, because the setting exists so a user can have either. On is
 * the default; off has to actually leave the list alone rather than merely
 * scroll it less.
 */
test('the issues list follows the document, until you turn tracking off', async ({ page }) => {
  await gotoViewer(page)

  const issues = page.locator('#issues-panel div.overflow-y-auto')
  const doc = page.locator('#document-panel div.overflow-y-auto')
  const issuesTop = () => issues.evaluate((el) => Math.round(el.scrollTop))

  expect(await issuesTop()).toBe(0)

  // Page 33 rather than the end of the document: tracking scrolls to a row for
  // the page in view, and the last page has no issues on it, so there would be
  // nothing to scroll to and nothing to assert.
  await page
    .locator('#document-panel [data-page="33"]')
    .evaluate((el) => el.scrollIntoView({ block: 'start' }))

  // On by default: the list is carried to the page you scrolled to.
  await expect.poll(issuesTop, { timeout: 10_000 }).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'List options' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Scroll Tracking' }).click()

  // Off: the list stays exactly where the user left it, however far the
  // document moves.
  // The tracking scroll is smooth, so a bare read here catches it mid-flight and
  // the comparison at the end fails against a value that was never final. Wait
  // for two identical readings instead.
  let previous = -1
  await expect
    .poll(
      async () => {
        const now = await issuesTop()
        const stable = now === previous
        previous = now
        return stable
      },
      { timeout: 10_000 },
    )
    .toBe(true)
  const parked = await issuesTop()
  await doc.evaluate((el) => el.scrollTo({ top: 0, behavior: 'instant' }))
  await expect
    .poll(() => page.getByRole('slider', { name: 'Document pages' }).getAttribute('aria-valuenow'))
    .toBe('1')
  expect(await issuesTop()).toBe(parked)
})

/**
 * The compact path. Tapping an issue on a phone switches to the Document tab and
 * seeks, but the document panel is `display: none` until that switch happens, so
 * the seek arrives before the viewer has any layout. A dropped request lands you
 * on a document that has not moved. The desktop equivalent shows up only on a
 * slow load, so this is the path that catches it.
 */
test.describe('tapping an issue on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('switches to the document and actually gets there', async ({ page }) => {
    await page.goto('/reviews/souj5sd12c8a3f')
    await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()

    // The viewer has no layout right now: it is behind the other tab.
    await page
      .locator('[data-cell$="-0"]')
      .filter({ hasText: 'Missing Flood Zone Documentation' })
      .click()

    await expect(page.getByRole('tab', { name: 'Document' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.locator('.react-pdf__Page__canvas').first()).toBeVisible({ timeout: 20_000 })

    // Page 7, not page 1: the seek survived being made against a hidden panel.
    await expect(page.locator('main').getByText(/page 7/i).first()).toBeVisible({ timeout: 20_000 })
    // Polled: the smooth scroll is still animating when the status bar updates,
    // and WebKit animates it more slowly than Chromium.
    await expect
      .poll(
        () => page.locator('#document-panel div.overflow-y-auto').evaluate((el) => el.scrollTop),
        { timeout: 15_000 },
      )
      .toBeGreaterThan(1000)
  })

  /**
   * On a phone the status bar is the only thing naming what is wrong on the page
   * in front of you, so it opens by default and each finding opens to its own
   * description. A title says a finding exists; the description is the finding.
   */
  test('the page bar names the findings, and each one opens to its description', async ({
    page,
  }) => {
    await page.goto('/reviews/souj5sd12c8a3f')
    await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()
    await page
      .locator('[data-cell$="-0"]')
      .filter({ hasText: 'Missing Flood Zone Documentation' })
      .click()
    await expect(page.locator('.react-pdf__Page__canvas').first()).toBeVisible({ timeout: 20_000 })
    // Wait for the seek to land before looking for page 7's findings. A canvas
    // on screen only means the document painted; the bar still says page 1
    // until the scroll arrives, and the rows below belong to whatever page the
    // bar is showing.
    await expect(
      page.locator('#document-panel').getByText(/page 7/i).first(),
    ).toBeVisible({ timeout: 20_000 })

    // Open without being asked: both findings on page 7 are named.
    const finding = page
      .getByRole('button')
      .filter({ hasText: 'Missing Flood Zone Documentation' })
      .last()
    await expect(finding).toBeVisible({ timeout: 20_000 })
    await expect(finding).toHaveAttribute('aria-expanded', 'false')

    // Scoped: the issues list carries the same text, and it is in the DOM
    // behind the other tab.
    const description = page
      .locator('#document-panel')
      .getByText(/no supporting documentation or map excerpt/i)
    await expect(description).toBeHidden()

    await finding.click()
    await expect(finding).toHaveAttribute('aria-expanded', 'true')
    await expect(description).toBeVisible()
  })
})
