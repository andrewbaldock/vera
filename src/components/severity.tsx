import { SEVERITY_COLOR, SEVERITY_MARK_HEIGHT } from '@/lib/severity'
import { cn } from '@/lib/utils'
import type { Severity } from '@/types/review'

/**
 * Severity is never carried by colour alone, so the dot is always accompanied
 * by its text label at the call site.
 */
export function SeverityDot({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full', SEVERITY_COLOR[severity], className)}
      aria-hidden
    />
  )
}

/**
 * The thumb strip's per-issue mark: colour *and* thickness, because a 29px-wide
 * segment has no room for a label. It stays out of the accessibility tree
 * because the slider announces the same fact through `aria-valuetext`.
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
