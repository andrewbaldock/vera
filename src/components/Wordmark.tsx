import { PRODUCT_NAME } from '@/lib/brand'
import { VeraMark } from '@/components/VeraMark'
import { cn } from '@/lib/utils'

/**
 * The wordmark. The platform has no MIRA logo file: its only brand asset is the
 * company mark, and MIRA appears everywhere as live text, always in capitals,
 * in their own typeface. Their convention for naming a product inside the
 * platform is typographic rather than a logotype, and VERA follows it: capitals,
 * letterspaced, set in the display face.
 *
 * The typeface comes from `--font-wordmark`, which defaults to the app's sans.
 * Pointing it at Montserrat, the platform's display face, is a one-line change in
 * `index.css`. The symbol defaults to the VERA mark and stays overridable.
 */

interface WordmarkProps {
  symbol?: React.ReactNode
  className?: string
}

export function Wordmark({ symbol = <VeraMark />, className }: WordmarkProps) {
  return (
    // `gap-1.5` rather than `gap-2`: the tracking on the wordmark already adds
    // space before the V, so an even gap here reads as a wider one.
    <span className={cn('flex shrink-0 items-center gap-1.5', className)}>
      {symbol}
      <span
        // Letterspacing is what makes short capitals read as a mark rather than
        // a shouted word. At four characters, tracking is most of the design.
        //
        // 700 because that is a weight Goldman actually ships; 600 would be
        // synthesised. The tracking is tighter than the old face wanted, since
        // Goldman is already a wide, squared letterform and 0.18em pushed the
        // four characters apart far enough to stop reading as one word.
        // The gradient is painted through the glyphs, so the mark carries the
        // brand colour without a swatch sitting behind it. Both stops are
        // tokens: a component naming a hex is the thing the token layer exists
        // to prevent.
        className="bg-linear-to-br from-wordmark-from to-wordmark-to bg-clip-text font-[family-name:var(--font-wordmark)] text-[15px] font-bold tracking-[0.12em] text-transparent uppercase"
      >
        {PRODUCT_NAME}
      </span>
    </span>
  )
}
