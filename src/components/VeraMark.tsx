import { cn } from '@/lib/utils'

/**
 * The VERA mark.
 *
 * A cut slab for the long arm, a wide triangle beneath it for the short one.
 * The triangle is HomeVision's facet language — their logo is built entirely
 * from flat triangular planes of a single color — and square caps keep the two
 * shapes speaking the same geometric dialect. An earlier version rounded the
 * slab, which softened it into something friendlier than the mark beside it.
 *
 * The imbalance is the design. Two arms of equal weight is a letter V; one heavy
 * and one light is also a check, which is the product in a single gesture. An
 * earlier version used two matched parallelograms and read as a checkmark drawn
 * with a ruler.
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
