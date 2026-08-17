import { test, expect, type Page } from '@playwright/test'

/**
 * The layout tests. These assert *structure*, not pixels. Not screenshot
 * baselines: WebKit and Chromium rasterize type differently, so a baseline suite
 * would need one set per engine and would churn on every UI change. What is
 * worth asserting is invariant across both engines: the page never scrolls
 * sideways, the shell owns the height, the correct shape renders, and every
 * touch target clears 44px.
 *
 * The presence/absence table below IS the specification. What proves a layout
 * isn't the other one stretched is that each renders things the other doesn't.
 */

/** The only breakpoint that changes the shape. */
const BREAKPOINT = 1024

/**
 * Real widths, chosen because something is this wide, plus the two either side
 * of the breakpoint, which is where layouts break in practice.
 */
const VIEWPORTS = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 14 Pro', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'iPad Split View, narrow', width: 507, height: 1024 },
  { name: 'iPad mini portrait', width: 744, height: 1133 },
  { name: 'iPad 11in portrait', width: 820, height: 1180 },
  { name: 'one pixel below the breakpoint', width: 1023, height: 800 },
  { name: 'iPad 13in portrait', width: BREAKPOINT, height: 1366 },
  { name: 'iPad 11in landscape', width: 1180, height: 820 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'large desktop', width: 1920, height: 1080 },
] as const

/** Minimum touch target. Apple's HIG number, and the one the design cites. */
const TOUCH_TARGET = 44

function compactOnly(page: Page) {
  return {
    'view switcher': page.getByRole('tablist', { name: 'View' }),
  }
}

function fullOnly(page: Page) {
  return {
    'thumb strip': page.getByRole('slider', { name: 'Document pages' }),
    splitter: page.getByRole('separator', { name: 'Resize issues panel' }),
  }
}

/** Loading is a real async state, so wait for the review rather than for a timeout. */
async function gotoReview(page: Page) {
  await page.goto('/reviews/souj5sd12c8a3f')
  await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()
}

/**
 * The one thing to do next, whichever form it takes. Blocked it is a link to
 * upload a new version, open it is the submit button. These assertions are about
 * the *action* being present and reachable, not about which of the two it is.
 */
const primaryAction = (page: Page) =>
  page
    .getByRole('button', { name: 'Upload new version' })
    .or(page.getByRole('button', { name: 'Submit review' }))

/** Visible hairline plus the padded hit area its pseudo-element adds. */
async function grabZoneWidth(page: Page) {
  return page.getByRole('separator', { name: 'Resize issues panel' }).evaluate((el) => {
    const line = el.getBoundingClientRect().width
    const pseudo = getComputedStyle(el, '::after')
    return line + Math.abs(parseFloat(pseudo.left)) + Math.abs(parseFloat(pseudo.right))
  })
}

async function pageMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement
    return {
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }
  })
}

for (const viewport of VIEWPORTS) {
  const shape = viewport.width >= BREAKPOINT ? 'full' : 'compact'

  test.describe(`${viewport.name} — ${viewport.width}x${viewport.height} (${shape})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('never scrolls sideways', async ({ page }) => {
      await gotoReview(page)
      const { scrollWidth, innerWidth } = await pageMetrics(page)
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
    })

    test('the shell owns the height, so the page itself does not scroll', async ({ page }) => {
      await gotoReview(page)
      const { scrollHeight, innerHeight } = await pageMetrics(page)
      // The panels scroll. The document must not, or the chrome walks off the
      // bottom of an iPhone and takes the tab bar with it.
      expect(scrollHeight).toBeLessThanOrEqual(innerHeight + 1)
    })

    test(`renders the ${shape} shape and only the ${shape} shape`, async ({ page }) => {
      await gotoReview(page)

      for (const [name, locator] of Object.entries(compactOnly(page))) {
        await expect(locator, `${name} in the ${shape} shape`).toBeVisible({
          visible: shape === 'compact',
        })
      }
      for (const [name, locator] of Object.entries(fullOnly(page))) {
        await expect(locator, `${name} in the ${shape} shape`).toBeVisible({
          visible: shape === 'full',
        })
      }
    })

    test('shows exactly one primary action, fully on screen', async ({ page }) => {
      await gotoReview(page)

      // One in the app header for the full shape, one in the verdict panel's
      // corner for the compact one. Never both, never neither: this is the
      // control the whole page exists to protect.
      const visible = await primaryAction(page).filter({ visible: true }).all()
      expect(visible).toHaveLength(1)

      const box = await visible[0].boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
    })

    test('the verdict is readable without scrolling anything', async ({ page }) => {
      await gotoReview(page)
      // "12 issues must be fixed" is the answer to acceptance criterion #3.
      await expect(page.getByText(/must be fixed/).first()).toBeInViewport()
    })
  })
}

test.describe('touch targets', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  /**
   * Every control, and it used to mean three of them. This measured the view
   * tabs, the first five buttons inside the grid and the primary action, which
   * left the toolbar and the severity filters — 32px, both of them — outside a
   * test whose name says otherwise. A claim the README also makes.
   *
   * Measured against the wrapping `<label>` where there is one: a 16px checkbox
   * inside a 44px label is a 44px target, and measuring the input instead
   * reports a failure that no thumb would ever find.
   */
  test('every control in the compact shape clears 44px', async ({ page }) => {
    await gotoReview(page)

    const undersized = await page.evaluate((minimum) => {
      const failures: string[] = []
      const selector = 'button, a[href], [role="tab"], [role="checkbox"], [role="slider"], [role="separator"]'
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        // The skip link is a keyboard affordance that is off-screen until
        // focused. It is never a touch target.
        if (element.closest('.sr-only') || element.textContent?.trim() === 'Skip to document') return
        const target = element.closest('label') ?? element
        const { width, height } = target.getBoundingClientRect()
        if (width === 0 || height === 0) return
        if (width < minimum || height < minimum) {
          const name = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '?'
          failures.push(`${name.slice(0, 30)} — ${Math.round(width)}x${Math.round(height)}`)
        }
      })
      return failures
    }, TOUCH_TARGET)

    expect(undersized, 'controls under the 44px minimum').toEqual([])
  })
})

test.describe('touch targets in the full shape', () => {
  // A 13in iPad is this wide in portrait, so the full shape is a touch layout.
  // hasTouch is what makes `(pointer: coarse)` match: without it the browser
  // reports a mouse and the splitter stays a hairline.
  test.use({ viewport: { width: BREAKPOINT, height: 1366 }, hasTouch: true, isMobile: true })

  test('the thumb strip is one target 44px wide, not 34 small ones', async ({ page }) => {
    await gotoReview(page)
    const strip = page.getByRole('slider', { name: 'Document pages' })
    expect((await strip.boundingBox())!.width).toBeGreaterThanOrEqual(TOUCH_TARGET)
  })

  test('the splitter grab zone opens up for a finger', async ({ page }) => {
    await gotoReview(page)
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    expect(await grabZoneWidth(page)).toBeGreaterThanOrEqual(TOUCH_TARGET)
  })
})

/**
 * The other half of that decision, and the reason it is not "44px always". A
 * 46px grab zone under a mouse sits 20px over each panel, stealing clicks from
 * the issue rows on one side and, once the viewer mounts, from the left edge of
 * every rendered page on the other. Wide for a finger, narrow for a cursor; this
 * asserts the narrow half, which is the half that regresses silently.
 */
test.describe('the splitter under a mouse', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('stays a hairline so it cannot steal clicks from either panel', async ({ page }) => {
    await gotoReview(page)
    expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true)
    expect(await grabZoneWidth(page)).toBeLessThan(16)
  })
})

/**
 * The named viewports catch the devices. This catches the widths in between,
 * where layouts break: a fixed matrix sails past the 1007px disaster because
 * nothing in the list happens to be 1007px. One assertion, so it stays cheap
 * enough to run over the whole range.
 */
test.describe('every width in between', () => {
  test('nothing overflows and the shape is right, from 320 to 1920', async ({ page }) => {
    await gotoReview(page)

    for (let width = 320; width <= 1920; width += 40) {
      await page.setViewportSize({ width, height: 800 })

      const { scrollWidth, innerWidth } = await pageMetrics(page)
      expect(scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(innerWidth)

      const stripVisible = await page
        .getByRole('slider', { name: 'Document pages' })
        .isVisible()
      expect(stripVisible, `full shape at ${width}px`).toBe(width >= BREAKPOINT)
    }
  })
})

/**
 * A phone gives the issues list whatever the chrome above and below it does not
 * take. The severity chips were the worst offender: at 320px the words wrapped
 * them onto a second row and cost the list a tenth of the screen.
 */
test('on a phone the severity chips stay on one row', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/reviews/souj5sd12c8a3f')
  await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()

  const chips = page.locator('[aria-label="Severity breakdown"]')
  const rows = await chips.evaluate(
    (el) => new Set([...el.children].map((c) => Math.round(c.getBoundingClientRect().top))).size,
  )
  expect(rows).toBe(1)

  // Still a legal touch target, which is the reason they cannot simply shrink.
  const height = await chips.locator('button').first().evaluate((el) => el.getBoundingClientRect().height)
  expect(height).toBeGreaterThanOrEqual(44)

  // The words are gone from the chips, not from the app: every row still says
  // which severity it is, and the chip's accessible name is unchanged.
  await expect(chips.getByRole('button').first()).toHaveAccessibleName(/4 Critical/)
})

/**
 * "12 issues must be fixed" and "before you can submit" are one sentence. It
 * shares a line where there is room, and where there is not the second half
 * moves down whole — a break inside "before you can / submit" reads as a fault.
 */
test('the verdict never breaks mid-phrase', async ({ page }) => {
  for (const width of [1600, 1280, 1100, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/reviews/souj5sd12c8a3f')
    await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()

    // Located by its words rather than by position. The badge is wrapped
    // together with the headline, so the phrase is no longer the second span
    // in the paragraph and an index would silently measure the wrong one.
    const pieces = await page
      .getByText('before you can submit')
      .evaluate((el) => el.getClientRects().length)
    expect(pieces, `"before you can submit" split at ${width}px`).toBe(1)
  }
})

/**
 * The rosette is the mark of what the headline says, so it is part of that
 * phrase and not a third thing beside it. As a sibling in the wrapping row it
 * could be pushed onto a line of its own, leaving the badge stranded above the
 * words it marks. Reported by Andrew, from a narrow panel.
 */
test('the verdict badge never wraps away from its headline', async ({ page }) => {
  for (const width of [1600, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/reviews/souj5sd12c8a3f')
    await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()

    const shares = await page
      .locator('div[aria-live] p')
      .first()
      .evaluate((p) => {
        const badge = p.querySelector('svg')!.getBoundingClientRect()
        const headline = [...p.querySelectorAll('span')]
          .find((s) => /must be fixed/.test(s.textContent ?? ''))!
          .getBoundingClientRect()
        // Overlapping vertical extents is the whole claim: they are on one line.
        return badge.bottom > headline.top && badge.top < headline.bottom
      })
    expect(shares, `badge stranded on its own line at ${width}px`).toBe(true)
  }
})

/**
 * The chips give up padding, gaps and a size of type before they give up their
 * row, and they measure the panel rather than the window — the splitter can
 * take this panel to a fifth of a wide screen, where a viewport breakpoint says
 * there is room for words that do not fit.
 *
 * Swept 1px at a time while this was written: the four chips need 405px of
 * content roomy and 339px squeezed, and the two thresholds sit above both with
 * room to spare. This asserts the ends and the two boundaries.
 */
test('the severity chips shrink before they wrap', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('/reviews/souj5sd12c8a3f')
  await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()

  // The Done chip only exists once something is done, and four chips is the
  // case that wraps. Six, to match what a reviewer would have ticked off.
  const boxes = page.getByRole('checkbox', { name: /^Mark/ })
  for (let i = 0; i < 6; i += 1) await boxes.nth(i).click()

  const chips = page.locator('[aria-label="Severity breakdown"]')
  await expect(chips.getByRole('button')).toHaveCount(4)

  // Pinned from a stylesheet, which React's inline width cannot clobber on a
  // re-render. Dragging the splitter is the honest gesture and far too slow to
  // do at this resolution.
  const pin = (px: number) =>
    page.evaluate((w) => {
      let style = document.getElementById('pin') as HTMLStyleElement | null
      if (!style) {
        style = document.createElement('style')
        style.id = 'pin'
        document.head.append(style)
      }
      style.textContent = `section[aria-label="Issues found"]{width:${w}px !important}`
    }, px)

  for (const width of [520, 464, 463, 400, 384, 383, 340, 300]) {
    await pin(width)
    const rows = await chips.evaluate(
      (el) => new Set([...el.children].map((c) => Math.round(c.getBoundingClientRect().top))).size,
    )
    expect(rows, `chips wrapped at a ${width}px panel`).toBe(1)
  }

  // And the density actually steps, rather than the row surviving because the
  // words were dropped early. 464 is the last roomy width, 384 the last with
  // words at all.
  const word = chips.getByText('Critical')
  await pin(464)
  await expect(word).toBeVisible()
  expect(await chips.locator('button').first().evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    '14px',
  )
  await pin(463)
  await expect(word).toBeVisible()
  expect(await chips.locator('button').first().evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    '12px',
  )
  await pin(383)
  await expect(word).toBeHidden()
  // Still a 44px target at every one of those widths — the chips lose width,
  // never height.
  expect(
    await chips.locator('button').first().evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44)
})
