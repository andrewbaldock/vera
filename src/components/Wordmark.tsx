import { PRODUCT_NAME } from '@/lib/brand'
import { VeraMark } from '@/components/VeraMark'
import { cn } from '@/lib/utils'

/**
 * The wordmark. HomeVision has no MIRA logo file: their only brand asset is the
 * HomeVision mark, and MIRA appears everywhere as live text, always in capitals,
 * in their own typeface. Their convention for naming a product inside the
 * platform is typographic rather than a logotype, and VERA follows it: capitals,
 * letterspaced, set in the display face.
 *
 * The typeface comes from `--font-wordmark`, which defaults to the app's sans.
 * Pointing it at Montserrat, HomeVision's display face, is a one-line change in
 * `index.css`. The symbol defaults to the VERA mark and stays overridable.
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
        // a shouted word. At four characters, tracking is most of the design.
        className="font-[family-name:var(--font-wordmark)] text-[15px] font-semibold tracking-[0.18em] uppercase"
      >
        {PRODUCT_NAME}
      </span>
    </span>
  )
}
