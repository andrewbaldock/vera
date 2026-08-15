import { test, expect, type Page } from '@playwright/test'

/**
 * Severity text has to be readable, not just colored. The severity fills are
 * tuned to read as 8px dots; reusing them for 12px type ships Major at 2.56:1,
 * well under the 4.5:1 AA floor, so the words use their own darkened tokens.
 * This test keeps the two roles from being collapsed back together.
 */

const AA_NORMAL_TEXT = 4.5
const SEVERITIES = ['critical', 'major', 'minor'] as const

/** Resolving oklch() to sRGB needs a real paint; a canvas is the shortest way. */
async function contrastReport(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const toRgb = (color: string) => {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2]] as [number, number, number]
    }
    const channel = (c: number) => {
      const v = c / 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    }
    const luminance = ([r, g, b]: [number, number, number]) =>
      0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }

    const styles = getComputedStyle(document.documentElement)
    const token = (name: string) => styles.getPropertyValue(name).trim()
    const surfaces = {
      panel: getComputedStyle(document.querySelector('#issues-panel')!).backgroundColor,
      focused: token('--focus-tint'),
      // The cleared verdict tints its whole block, and the severity breakdown
      // sits inside it, so those words have a third background on any document
      // that is ready to submit.
      ready: token('--ready-surface'),
    }

    const result: Record<string, Record<string, number>> = {}
    for (const severity of ['critical', 'major', 'minor']) {
      result[severity] = {}
      for (const [where, surface] of Object.entries(surfaces)) {
        result[severity][where] = ratio(token(`--severity-${severity}-text`), surface)
      }
    }
    // The verdict's own headline, which is the only text using this pair.
    result.ready = { onReadySurface: ratio(token('--ready-text'), token('--ready-surface')) }
    return result
  })
}

for (const scheme of ['light', 'dark'] as const) {
  test(`severity words clear AA against every surface they sit on — ${scheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/reviews/souj5sd12c8a3f')
    await expect(page.getByRole('grid', { name: 'Issues' })).toBeVisible()

    const report = await contrastReport(page)
    for (const severity of SEVERITIES) {
      // Rows on the focused page are tinted, so the same text sits on two
      // different backgrounds and both have to hold.
      for (const surface of ['panel', 'focused', 'ready'] as const) {
        expect(
          report[severity][surface],
          `${severity} on the ${surface} surface in ${scheme} mode`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
      }
    }

    expect(
      report.ready.onReadySurface,
      `the cleared verdict's headline on its own surface in ${scheme} mode`,
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })
}
