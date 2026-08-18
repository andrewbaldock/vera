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
    // The *rendered* list, not merely the first one in the DOM. Widening the
    // strip pulls in the page images, and while that chunk suspends React keeps
    // the already-mounted copy mounted and hides it with an inline
    // `display: none !important`, rendering the fallback beside it. So the strip
    // holds two `<ol>`s and the hidden one comes first. Measuring that one
    // reports a segment of no size and a list that does not scroll — both true
    // of a hidden element, neither true of this strip.
    const list = [...el.querySelectorAll('ol')].find((ol) => ol.clientHeight > 0)
    const segment = list?.children[0] as HTMLElement | undefined
    return {
      ready: !!segment,
      width: Math.round(el.getBoundingClientRect().width),
      segmentWidth: segment ? +segment.getBoundingClientRect().width.toFixed(1) : 0,
      segmentHeight: segment ? +segment.getBoundingClientRect().height.toFixed(1) : 0,
      scrolls: list ? list.scrollHeight > list.clientHeight : false,
    }
  })
}

/**
 * A measurement that has stopped moving, as two identical reads in a row.
 *
 * A drag lands through React state, a re-render and a debounced write, so a
 * value read the instant a gesture returns can be a frame behind the layout it
 * is about to become. That is harmless until the value is a *baseline* — then a
 * stale baseline is compared against a restore that is not stale, and the test
 * fails with nothing wrong behind it. This is what made the reload test flaky.
 */
async function settled<T>(read: () => Promise<T>): Promise<T> {
  let previous = await read()
  let runs = 0
  await expect
    .poll(
      async () => {
        const next = await read()
        // Three identical reads, not two. Two consecutive polls can both land
        // before the re-render has even started, which would "settle" on the
        // value the gesture was about to replace.
        runs = JSON.stringify(next) === JSON.stringify(previous) ? runs + 1 : 0
        previous = next
        return runs >= 2
      },
      // Generous, because a drag does not only move a splitter: it re-renders
      // every page image in the strip at the new width, and pdf.js is doing
      // that work on a machine already running the rest of the suite. The
      // existing raster test allows the same 20s for the same reason.
      { timeout: 20_000 },
    )
    .toBe(true)
  return previous
}

/** The strip, once it has a list with a size in it. */
async function settledStrip(page: Page) {
  await expect.poll(async () => (await stripMetrics(page)).ready).toBe(true)
  return settled(() => stripMetrics(page))
}

/**
 * Waits for the panel record to actually exist, rather than for longer than the
 * hook's debounce and hoping. A fixed wait racing a timer is a test that passes
 * until the machine is busy.
 */
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('vera.panels'))

/**
 * The write is debounced by 300ms, so a reload straight after a drag can read
 * the layout as it was before it.
 *
 * Waiting for the key to merely exist is not enough once a test drags twice:
 * the first drag creates it, and the second one is still in the debounce when
 * the poll returns. `since` is the value read before the drag being waited on,
 * so what this actually waits for is that drag reaching storage.
 */
async function storageWritten(page: Page, since: string | null = null) {
  await expect.poll(() => stored(page)).not.toBe(since)
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

test('the strip opens wide enough to read, before anyone touches it', async ({ page }) => {
  const metrics = await settledStrip(page)
  expect(metrics.width).toBe(100)
  // The pages fill the column they were given rather than floating in it, which
  // is the measurement that says the default width is driving their size.
  expect(metrics.segmentWidth).toBeGreaterThan(metrics.width * 0.8)
})

test('dragging the strip hands sizing over to its width', async ({ page }) => {
  const before = await settledStrip(page)

  await dragBy(page, STRIP_RESIZER, -80)

  // Polled on the settled state rather than measured once. Widening pulls in
  // the page images, which remounts the list, so a single read taken between
  // the drag and that remount catches the strip mid-rebuild.
  await expect.poll(async () => (await stripMetrics(page)).scrolls).toBe(true)
  const after = await settledStrip(page)

  expect(after.width).toBeGreaterThan(before.width)
  expect(after.segmentHeight).toBeGreaterThan(before.segmentHeight)
  // Now the pages fill the column they were given, which is the whole point of
  // dragging it. Not exact: the segment carries a border and padding.
  expect(after.segmentWidth).toBeGreaterThan(after.width * 0.8)
})

test('the strip stops at its maximum however far it is dragged', async ({ page }) => {
  await dragBy(page, STRIP_RESIZER, -900)
  expect((await settledStrip(page)).width).toBeLessThanOrEqual(140)
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

test('reopening comes back at the default width', async ({ page }) => {
  await dragBy(page, STRIP_RESIZER, -70)
  expect((await settledStrip(page)).width).toBeGreaterThan(44)

  await dragBy(page, STRIP_RESIZER, 400)
  await expect(page.locator(STRIP)).toBeHidden()

  await page.getByRole('button', { name: 'Show page strip' }).click()
  await expect(page.locator(STRIP)).toBeVisible()
  // Deliberately not the width it was closed at. Closing *is* a drag to the
  // minimum, so restoring that would reopen the strip as the sliver it became
  // on the way down.
  expect((await settledStrip(page)).width).toBe(100)
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
  await storageWritten(page)
  const afterStrip = await stored(page)
  await dragBy(page, ISSUES_RESIZER, 120)

  // The write is waited for *before* the baseline is read, not after. The record
  // is written from the same state that sizes the panels, so a write that has
  // landed is proof the drag finished being applied — which is a fact about the
  // app rather than a guess about how long a frame takes.
  await storageWritten(page, afterStrip)

  const strip = (await settledStrip(page)).width
  const issues = await settled(async () =>
    Math.round((await page.locator('#issues-panel').boundingBox())!.width),
  )
  expect(strip).toBeGreaterThan(44)

  await page.reload()
  await expect(page.locator(STRIP)).toBeVisible()

  expect((await settledStrip(page)).width).toBe(strip)

  // Polled, not read once. The strip's width is a pixel value and the issues
  // split is a percentage of what is left over, so they land on different
  // frames — a single read taken between them measures a layout that is still
  // restoring. What matters is where it settles.
  await expect
    .poll(
      async () => {
        const width = Math.round((await page.locator('#issues-panel').boundingBox())!.width)
        return Math.abs(width - issues)
      },
      { timeout: 20_000 },
    )
    .toBeLessThanOrEqual(2)
})

test('a reader who never drags the strip gets the default width', async ({ page }) => {
  // Changing the other panel writes the record. The strip must still come back
  // at its default, rather than being pinned at whatever it happened to be.
  await dragBy(page, ISSUES_RESIZER, 60)
  await storageWritten(page)
  await page.reload()
  await expect(page.locator(STRIP)).toBeVisible()

  expect((await settledStrip(page)).width).toBe(100)
})

test('a stored width outside the allowed range is discarded', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem('vera.panels', JSON.stringify({ issues: 999, strip: 5000 })),
  )
  await page.reload()
  await expect(page.locator(STRIP)).toBeVisible()

  expect((await settledStrip(page)).width).toBe(100)
})
