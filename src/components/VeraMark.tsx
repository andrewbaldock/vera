import { cn } from '@/lib/utils'

/**
 * The VERA mark.
 *
 * A dominant rounded slab for the long arm, a solid triangle tucked under it for
 * the short one. The triangle is HomeVision's facet language — their logo is
 * built entirely from flat triangular planes of a single color — and the slab's
 * soft ends keep the pair from reading as signage.
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
      <polygon points="13,29 30,29 22,47" fill="currentColor"/>
      <line x1="27" y1="51" x2="52" y2="12" stroke="currentColor" strokeWidth="12.5" strokeLinecap="round"/>
    </svg>
  )
}
