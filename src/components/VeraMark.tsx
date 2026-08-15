import { cn } from '@/lib/utils'

/**
 * The VERA mark. A cut slab for the long arm, a wide triangle beneath it for the
 * short one. The triangle is HomeVision's facet language, their logo being built
 * entirely from flat triangular planes of a single color, and square caps keep
 * the two shapes in the same geometric dialect. Not a rounded slab, which softens
 * into something friendlier than the mark beside it.
 *
 * The imbalance is the design: two arms of equal weight is a letter V, one heavy
 * and one light is also a check. Not two matched parallelograms, which read as a
 * checkmark drawn with a ruler.
 *
 * `currentColor` throughout, so it inherits from wherever it sits and needs no
 * dark-mode variant.
 */
export function VeraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-5 text-primary', className)} aria-hidden>
      <polygon points="0,19 37,19 19,47" fill="currentColor" />
      <line
        x1="31"
        y1="48"
        x2="52"
        y2="12"
        stroke="currentColor"
        strokeWidth="12.5"
        strokeLinecap="square"
      />
    </svg>
  )
}
