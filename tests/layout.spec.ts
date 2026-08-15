import { test, expect, type Page } from '@playwright/test'

/**
 * The layout tests.
 *
 * These assert *structure*, not pixels. No screenshot baselines: WebKit and
 * Chromium rasterize type differently, so a baseline suite would need one set
 * per engine and would churn on every UI change. What is actually worth
 * asserting is invariant across both engines — the page never scrolls
 * sideways, the shell owns the height, the correct shape renders, and every
 * touch target clears 44px.
 *
 * The presence/absence table below IS the specification. Two layouts is a
 * design decision, and the way you prove a layout isn't just the other one
 * stretched is that each renders things the other doesn't.
 */

/** The only breakpoint that changes the shape. */
const BREAKPOINT = 1024

/**
 * Real widths, chosen because something actually is this wide — plus the two
 * either side of the breakpoint, which is where layouts break in practice.
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
  await page.goto('/')
  await expect(page.getByRole('list', { name: 'Issues' })).toBeVisible()
}

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
      // The panels scroll. The document must not, or the bottom bar walks off
      // the bottom of an iPhone and takes the submit button with it.
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

    test('shows exactly one submit button, fully on screen', async ({ page }) => {
      await gotoReview(page)

      // One in the header for the full shape, one in the bottom bar for the
      // compact one. Never both, never neither — this is acceptance criterion
      // #3's control, and it must never be a tab away.
      const submit = page.getByRole('button', { name: 'Submit review' })
      const visible = await submit.filter({ visible: true }).all()
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

  test('every control in the compact shape clears 44px', async ({ page }) => {
    await gotoReview(page)

    const switcher = page.getByRole('tablist', { name: 'View' }).getByRole('tab')
    for (const button of await switcher.all()) {
      const box = await button.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(TOUCH_TARGET)
    }

    const rows = await page.getByRole('list', { name: 'Issues' }).getByRole('button').all()
    for (const row of rows.slice(0, 5)) {
      const box = await row.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(TOUCH_TARGET)
    }

    const submit = page.getByRole('button', { name: 'Submit review' }).filter({ visible: true })
    expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(TOUCH_TARGET)
  })
})

test.describe('touch targets in the full shape', () => {
  // A 13in iPad is this wide in portrait, so the full shape is a touch layout.
  // hasTouch is what makes `(pointer: coarse)` match — without it the browser
  // reports a mouse and the splitter deliberately stays a hairline.
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
 * The other half of that decision, and the reason it isn't just "44px always".
 *
 * A 46px grab zone under a mouse sits 20px over each panel — stealing clicks
 * from the issue rows on one side and, once the viewer mounts, from the left
 * edge of every rendered page on the other. Wide for a finger, narrow for a
 * cursor: this asserts the narrow half, which is the half that regresses
 * silently.
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
 * which is where layouts actually break — a fixed matrix sails straight past
 * the 1007px disaster because nothing in the list happens to be 1007px.
 *
 * One assertion, so it stays cheap enough to run over the whole range.
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
