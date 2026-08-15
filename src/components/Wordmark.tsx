import { PRODUCT_NAME } from '@/lib/brand'
import { VeraMark } from '@/components/VeraMark'
import { cn } from '@/lib/utils'

/**
 * The wordmark.
 *
 * HomeVision has no MIRA logo file — their only brand asset is the HomeVision
 * mark itself, and MIRA appears everywhere as live text, always in capitals, in
 * their own typeface. So their convention for naming a product inside the
 * platform is typographic rather than a logotype, and Vera follows it: capitals,
 * letterspaced, set in the display face.
 *
 * The typeface comes from `--font-wordmark`, which defaults to the app's sans.
 * Pointing it at Montserrat — HomeVision's display face — is a one-line change
 * in `index.css` and nothing here moves.
 *
 * The symbol defaults to the Vera mark and stays overridable, so swapping in a
 * different one never touches this file.
 */

interface WordmarkProps {
  symbol?: React.ReactNode
  className?: string
}

export function Wordmark({ symbol = <VeraMark />, className }: WordmarkProps) {
  return (
    <span className={cn('flex shrink-0 items-center gap-2', className)}>
      {symbol}
      <span
        // Letterspacing is what makes short capitals read as a mark rather than
        // as a shouted word — at four characters, tracking is most of the design.
        className="font-[family-name:var(--font-wordmark)] text-[15px] font-semibold tracking-[0.18em] uppercase"
      >
        {PRODUCT_NAME}
      </span>
    </span>
  )
}
