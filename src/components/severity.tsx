import { SEVERITY_COLOR, SEVERITY_FILL, SEVERITY_MARK_HEIGHT } from '@/lib/severity'
import { cn } from '@/lib/utils'
import type { Severity } from '@/types/review'

/**
 * A shape per severity, pointing the way the severity does: critical escalates,
 * minor de-escalates, major sits between them.
 *
 * Shape rather than a colored dot, so the ranking survives grayscale and
 * color-blindness without depending on the text label beside it. The label is
 * still there — this is a second channel, not a replacement for the first.
 *
 * Drawn in a 16-unit box whatever the rendered size, so the three read as one
 * family. The triangles are inset a little further than the circle because equal
 * bounding boxes make a triangle look smaller than a disc of the same width.
 */
const SHAPE: Record<Severity, React.ReactNode> = {
  critical: <polygon points="8,1.5 15,14.5 1,14.5" />,
  major: <circle cx="8" cy="8" r="6.4" />,
  minor: <polygon points="1,1.5 15,1.5 8,14.5" />,
}

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('size-3.5 shrink-0', SEVERITY_FILL[severity], className)}
      aria-hidden
      focusable="false"
    >
      {SHAPE[severity]}
    </svg>
  )
}

/**
 * The thumb strip's per-issue mark: color *and* thickness, because a 29px-wide
 * segment has no room for a label. Out of the accessibility tree, since the
 * slider announces the same fact through `aria-valuetext`.
 */
export function SeverityMark({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'w-full shrink-0 rounded-full',
        SEVERITY_COLOR[severity],
        SEVERITY_MARK_HEIGHT[severity],
      )}
      aria-hidden
    />
  )
}
