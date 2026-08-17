import type { Severity } from '@/types/review'

/**
 * Severity's presentation, in one place. The colors are CSS tokens, but the
 * mapping from a severity to its presentation needs a single home too: two
 * copies of the lookup is how the list and the strip end up disagreeing about
 * what "major" looks like.
 *
 * In `lib/` rather than beside the components because it is data, and because a
 * file exporting both constants and components breaks fast refresh for
 * everything that imports it.
 */

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: 'bg-severity-critical',
  major: 'bg-severity-major',
  minor: 'bg-severity-minor',
}

/**
 * The same fills as SVG paint, for the shape glyphs. Tailwind's `bg-` and
 * `fill-` are different properties, so the mapping has to exist twice even
 * though the token behind it is one.
 */
export const SEVERITY_FILL: Record<Severity, string> = {
  critical: 'fill-severity-critical',
  major: 'fill-severity-major',
  minor: 'fill-severity-minor',
}

/**
 * Text color, separate from the fill. The dot colors are picked to read as marks
 * at 8px; reusing them for 12px type fails contrast, the amber by a mile, so
 * severity as a *word* gets its own darkened token.
 */
export const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-severity-critical-text',
  major: 'text-severity-major-text',
  minor: 'text-severity-minor-text',
}

/**
 * Fill for a solid badge carrying a white glyph. The darkened text tokens, not
 * the dot fills: white on the amber dot measures about 2:1, which is under the
 * 3:1 an icon needs. Here the AA-safe half of the pair is the background rather
 * than the ink, which is the same reason it exists.
 */
export const SEVERITY_BADGE_FILL: Record<Severity, string> = {
  critical: 'fill-severity-critical-text',
  major: 'fill-severity-major-text',
  minor: 'fill-severity-minor-text',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
}

/**
 * Thickness, so severity survives grayscale. The thumb strip's marks sit in a
 * 29px-wide segment with no room for a label, so color alone would be carrying
 * the meaning.
 */
export const SEVERITY_MARK_HEIGHT: Record<Severity, string> = {
  critical: 'h-1',
  major: 'h-0.5',
  minor: 'h-px',
}
