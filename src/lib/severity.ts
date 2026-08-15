import type { Severity } from '@/types/review'

/**
 * Severity's presentation, in one place.
 *
 * The colors were already single-sourced as CSS tokens; the *mapping* from a
 * severity to its presentation was not, and had started to appear in a second
 * component. Two copies of a lookup is how the list and the strip end up
 * disagreeing about what "major" looks like.
 *
 * It lives in `lib/` rather than beside the components because it is data, and
 * because a file that exports both constants and components breaks fast
 * refresh for everything that imports it.
 */

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: 'bg-severity-critical',
  major: 'bg-severity-major',
  minor: 'bg-severity-minor',
}

/**
 * Text color, separate from the fill.
 *
 * The dot colors are picked to read as marks at 8px. Reusing them for 12px type
 * would fail contrast — the amber by a mile — so severity as a *word* gets its
 * own darkened token. Same vocabulary, different role.
 */
export const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-severity-critical-text',
  major: 'text-severity-major-text',
  minor: 'text-severity-minor-text',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
}

/**
 * Thickness, so severity survives grayscale.
 *
 * The thumb strip's marks sit in a 29px-wide segment with no room for a label,
 * so color would otherwise be carrying that meaning alone — which is the one
 * thing the accessibility section says we never do.
 */
export const SEVERITY_MARK_HEIGHT: Record<Severity, string> = {
  critical: 'h-1',
  major: 'h-0.5',
  minor: 'h-px',
}
