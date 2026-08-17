import { test, expect, type Page } from '@playwright/test'

/**
 * Panel sizing, and the handover that comes with it.
 *
 * The thumb strip has two behaviors and the switch between them is a user
 * drag, so the interesting assertions are on either side of that drag: a strip
 * nobody has dragged still fits the whole document into its column, and one
 * that has been dragged sizes its pages from the width it was given.
 *
 * `null` meaning "never dragged" is the load-bearing part. A stored default
 * would put every reader into the resized behavior on their first visit, which
 * is exactly the failure the write-on-change rule exists to prevent.
 */

const REVIEW = '/reviews/souj5sd12c8a3f'
const STRIP = '[role="slider"][aria-label="Document pages"]'
const STRIP_RESIZER = '[role="separator"][aria-label="Resize page strip"]'
const ISSUES_RESIZER = '[role="separator"][aria-label="Resize issues panel"]'

function stripMetrics(page: Page) {
  return page.locator(STRIP).evaluate((el) => {
    const list = el.querySelector('ol')!
    const segment = list.children[0] as HTMLElement
    return {
      width: Math.round(el.getBoundingClientRect().width),
      segmentWidth: +segment.getBoundingClientRect().width.toFixed(1),
      segmentHeight: +segment.getBoundingClientRect().height.toFixed(1),
      scrolls: list.scrollHeight > list.clientHeight,
    }
  })
}

/**
 * Waits for the panel record to actually exist, rather than for longer than the
 * hook's debounce and hoping. A fixed wait racing a timer is a test that passes
 * until the machine is busy.
 */
async function storageWritten(page: Page) {
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('vera.panels')))
    .not.toBeNull()
}

/** Drags a separator by an x offset, in the pointer events it listens for. */
async function dragBy(page: Page, selector: string, dx: number) {
  const handle = page.locator(selector)
  await expect(handle).toBeVisible()
  const box = (await handle.boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width / 2, y)
  await page.mouse.down()
  // Stepped, and with a settling move at the end: a single jump can outrun the
  // pointer handler on a loaded runner and land the drag short of where it was
  // aimed.
  await page.mouse.move(box.x + box.width / 2 + dx, y, { steps: 12 })
  await page.mouse.move(box.x + box.width / 2 + dx, y)
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto(REVIEW)
  await expect(page.locator(STRIP)).toBeVisible()
})

test('before anyone drags it, the strip maps the whole document', async ({ page }) => {
  const metrics = await stripMetrics(page)
  expect(metrics.width).toBe(44)
  expect(metrics.scrolls).toBe(false)
  // Segments do not fill the column while the fit is in charge. This is the
  // measurement that says width is not yet driving anything.
  expect(metrics.segmentWidth).toBeLessThan(metrics.width * 0.6)
})

test('dragging the strip hands sizing over to its width', async ({ page }) => {
  const before = await stripMetrics(page)

  await dragBy(page, STRIP_RESIZER, -80)

  // Polled on the settled state rather than measured once. Widening pulls in
  // the page images, which remounts the list, so a single read taken between
  // the drag and that remount catches the strip mid-rebuild.
  await expect.poll(async () => (await stripMetrics(page)).scrolls).toBe(true)
  const after = await stripMetrics(page)

  expect(after.width).toBeGreaterThan(before.width)
  expect(after.segmentHeight).toBeGreaterThan(before.segmentHeight)
  // Now the pages fill the column they were given, which is the whole point of
  // dragging it. Not exact: the segment carries a border and padding.
  expect(after.segmentWidth).toBeGreaterThan(after.width * 0.8)
})

test('the strip stops at its maximum however far it is dragged', async ({ page }) => {
  await dragBy(page, STRIP_RESIZER, -900)
  expect((await stripMetrics(page)).width).toBeLessThanOrEqual(140)
})

test('pages render as images at the width the strip ships at', async ({ page }) => {
  // The renderer is a separate chunk and pdf.js has to parse, so this waits on
  // a network round trip as well as a render.
  await expect
    .poll(() => page.locator(`${STRIP} canvas`).count(), { timeout: 20_000 })
    .toBeGreaterThan(0)
})

test('dragging the strip shut leaves a way back', async ({ page }) => {
  await dragBy(page, STRIP_RESIZER, 400)

  await expect(page.locator(STRIP)).toBeHidden()
  const reopen = page.getByRole('button', { name: 'Show page strip' })
  await expect(reopen).toBeVisible()

  await reopen.click()
  await expect(page.locator(STRIP)).toBeVisible()
})

test('reopening comes back at a width you can grab', async ({ page }) => {
  await dragBy(page, STRIP_RESIZER, -70)
  expect((await stripMetrics(page)).width).toBeGreaterThan(44)

  await dragBy(page, STRIP_RESIZER, 400)
  await expect(page.locator(STRIP)).toBeHidden()

  await page.getByRole('button', { name: 'Show page strip' }).click()
  await expect(page.locator(STRIP)).toBeVisible()
  // Not the width it had before the closing drag: that gesture passes through
  // every width on the way down and each one is recorded. What matters is that
  // it never comes back as a sliver too narrow to grab again.
  expect((await stripMetrics(page)).width).toBeGreaterThanOrEqual(44)
})

test('a closed strip stays closed across a reload', async ({ page }) => {
  await dragBy(page, STRIP_RESIZER, 400)
  await expect(page.locator(STRIP)).toBeHidden()

  await storageWritten(page)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Show page strip' })).toBeVisible()
  await expect(page.locator(STRIP)).toBeHidden()
})

test('panel sizes survive a reload', async ({ page }) => {
  await dragBy(page, STRIP_RESIZER, -60)
  await dragBy(page, ISSUES_RESIZER, 120)

  const strip = (await stripMetrics(page)).width
  const issues = Math.round((await page.locator('#issues-panel').boundingBox())!.width)
  expect(strip).toBeGreaterThan(44)

  await storageWritten(page)
  await page.reload()
  await expect(page.locator(STRIP)).toBeVisible()

  expect((await stripMetrics(page)).width).toBe(strip)
  const issuesAfter = Math.round((await page.locator('#issues-panel').boundingBox())!.width)
  expect(Math.abs(issuesAfter - issues)).toBeLessThanOrEqual(2)
})

test('a reader who never drags is never switched into the resized behavior', async ({ page }) => {
  // Changing the other panel writes the record. The strip must still come back
  // as never-dragged, rather than being pinned at whatever it happened to be.
  await dragBy(page, ISSUES_RESIZER, 60)
  await storageWritten(page)
  await page.reload()
  await expect(page.locator(STRIP)).toBeVisible()

  const metrics = await stripMetrics(page)
  expect(metrics.width).toBe(44)
  expect(metrics.scrolls).toBe(false)
})

test('a stored width outside the allowed range is discarded', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem('vera.panels', JSON.stringify({ issues: 999, strip: 5000 })),
  )
  await page.reload()
  await expect(page.locator(STRIP)).toBeVisible()

  const metrics = await stripMetrics(page)
  expect(metrics.width).toBe(44)
  expect(metrics.scrolls).toBe(false)
})
