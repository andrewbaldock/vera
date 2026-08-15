import { Suspense, lazy } from 'react'
import { cn } from '@/lib/utils'

const CoverPage = lazy(() => import('@/components/CoverPage'))

/**
 * The cover sheet of a document, as a stack of paper. A list of documents that
 * shows none of them makes every row the same shape, and the eye has nothing to
 * catch — a first page is recognizable long before a filename is readable.
 *
 * The sheets behind are the only part that is decoration, and they earn it: they
 * say "multi-page" without a word, which is otherwise a fact the row has to
 * spend text on.
 *
 * Rows without a PDF get the same stack, empty. Not a rendered page of something
 * else and not a generic file glyph: the placeholders are pending documents, and
 * an empty sheet is what a pending document looks like. Keeping the shape
 * identical also keeps the rows on one rhythm, which is the reason to draw them
 * at all.
 */

/** Letter proportions, at a size that stays legible as a shape rather than a page. */
const WIDTH = 40
const HEIGHT = Math.round(WIDTH * (792 / 612))

export function CoverThumb({ pdfUrl, className }: { pdfUrl?: string; className?: string }) {
  return (
    <span
      // Decorative: the row already carries the document's name and status as
      // text, and "cover page of Annual Compliance Report" spoken aloud adds a
      // thing to listen to rather than a thing to know.
      aria-hidden
      className={cn('relative block shrink-0', className)}
      style={{ width: WIDTH, height: HEIGHT }}
    >
      {/* The stack. Offset down and right, so the front sheet reads as the top
          one rather than as a border. */}
      <span className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[3px] border bg-card" />
      <span className="absolute inset-0 translate-x-[1.5px] translate-y-[1.5px] rounded-[3px] border bg-card" />

      <span className="relative block h-full w-full overflow-hidden rounded-[3px] border bg-white shadow-sm">
        {pdfUrl && (
          <>
            {/* Underneath, not instead of. The rendered page is opaque and
                covers this the moment it paints, so there is no swap to
                mistime — the shimmer stops being visible rather than being
                taken away. Only where a page is actually coming: an empty sheet
                on a pending document is the finished state, not a loading one. */}
            <span className="absolute inset-0 shimmer" />
            <Suspense fallback={null}>
              <span className="relative block">
                <CoverPage url={pdfUrl} width={WIDTH} />
              </span>
            </Suspense>
          </>
        )}
      </span>
    </span>
  )
}
