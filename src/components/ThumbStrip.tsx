import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SeverityMark } from '@/components/severity'
import type { NumberedIssue } from '@/lib/review'
import type { DocumentPage } from '@/types/review'

/**
 * A miniature of the whole document down the edge of the viewer.
 *
 * It is one control you scrub, not thirty-four you click. That distinction is
 * the reason it survives on touch at all: thirty-four targets at the 44px
 * minimum would need ~1,500px of column, whereas a single press-and-drag
 * control needs the minimum once. Same interaction as the iOS index scrubber.
 *
 * Being one control also means it is a slider, so it gets slider semantics for
 * free — which is how a thing designed for a thumb ends up giving keyboard
 * users navigation of the entire document.
 *
 * Sizing: **one scale factor, computed once, multiplied into every page's real
 * width and height.** Nothing is normalized — a Legal page among Letter pages
 * renders visibly taller, which is the most common real anomaly and the whole
 * point of the rule.
 *
 * It is arithmetic rather than CSS because the CSS versions all cheat. A
 * percentage height plus `aspect-ratio` looks equivalent and is, right up until
 * a clamp engages on one segment — then that segment gets its own scale factor
 * and renders a short page *wider* than the full page beside it. And a
 * percentage of the column ignores the width entirely, so a four-page document
 * computes segments 180px wide inside a 44px strip. Both failures are invisible
 * against a uniform 34-page Letter fixture, which is exactly why they are worth
 * measuring instead of trusting.
 *
 * So: fit to the shorter constraint of the two, and the strip always fits its
 * column in both directions. It never scrolls, which matters more than it
 * sounds — a scroll container inside a `touch-action: none` scrub surface is
 * unscrollable by the very finger it exists for.
 */

/** Gap between segments, in px. Comes out of the budget, never added on top. */
const SEGMENT_GAP = 2

interface ThumbStripProps {
  pages: DocumentPage[]
  issuesByPage: Map<number, NumberedIssue[]>
  focusedPage: number
  onSeek: (page: number) => void
  className?: string
}

export function ThumbStrip({
  pages,
  issuesByPage,
  focusedPage,
  onSeek,
  className,
}: ThumbStripProps) {
  const listRef = useRef<HTMLOListElement>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [column, setColumn] = useState({ width: 0, height: 0 })

  // Measured rather than assumed, and before paint so there is no frame at the
  // wrong size. The strip re-scales when the splitter moves or the window does.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setColumn((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      )
    })
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  const focusedIssues = issuesByPage.get(focusedPage) ?? []
  // The slider's range is the document's own page numbers, not the array
  // length. They coincide in this fixture; they are not the same fact, and a
  // slider that lies about its own range is worse than one with no range.
  const firstPage = pages[0]?.page_num ?? 1
  const lastPage = pages[pages.length - 1]?.page_num ?? firstPage

  /** The one factor. Fit to whichever dimension runs out first. */
  const totalHeight = pages.reduce((sum, page) => sum + page.height, 0)
  const widestPage = Math.max(...pages.map((page) => page.width))
  const gaps = SEGMENT_GAP * Math.max(0, pages.length - 1)
  const scale =
    column.height > 0
      ? Math.min((column.height - gaps) / totalHeight, column.width / widestPage)
      : 0

  /**
   * The readout tracks the focused segment rather than sitting at the middle of
   * the strip — otherwise scrubbing to page 30 shows the label beside page 17,
   * which is worse than no label. Measured off the segment itself so it stays
   * correct for pages of different heights.
   */
  const focusedIndex = pages.findIndex((page) => page.page_num === focusedPage)
  const focusedSegment = listRef.current?.children[focusedIndex] as HTMLElement | undefined
  const readoutTop = focusedSegment
    ? focusedSegment.offsetTop + focusedSegment.offsetHeight / 2
    : null

  /**
   * Which page is under the pointer.
   *
   * Measured against the segments themselves rather than interpolated over the
   * column, because segments are not all the same height — interpolation would
   * drift the moment the document contains a page of a different size.
   */
  function pageAt(clientY: number): number | null {
    const items = listRef.current?.children
    if (!items || items.length === 0) return null
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].getBoundingClientRect()
      if (clientY < rect.bottom) return pages[i].page_num
    }
    // Dragging past the bottom edge means the last page, not nothing. A finger
    // cannot travel below the screen, so without this the final pages are
    // unreachable on any viewport shorter than the strip.
    return pages[pages.length - 1].page_num
  }

  function scrubTo(clientY: number) {
    const page = pageAt(clientY)
    if (page !== null && page !== focusedPage) onSeek(page)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setScrubbing(true)
    scrubTo(event.clientY)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    scrubTo(event.clientY)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    // A browser-initiated pointercancel has already released capture, so
    // releasing it again throws NotFoundError. That path is the normal one on
    // touch, not an exotic one.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setScrubbing(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const last = lastPage
    const moves: Record<string, number> = {
      ArrowDown: focusedPage + 1,
      ArrowRight: focusedPage + 1,
      ArrowUp: focusedPage - 1,
      ArrowLeft: focusedPage - 1,
      PageDown: focusedPage + 5,
      PageUp: focusedPage - 5,
      Home: firstPage,
      End: last,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    onSeek(Math.min(last, Math.max(firstPage, next)))
  }

  return (
    // z-10 clears pdf.js's annotation layer (z-index: 3), whose invisible text
    // would otherwise sit over this and swallow the drag.
    <div
      role="slider"
      tabIndex={0}
      aria-label="Document pages"
      aria-valuemin={firstPage}
      aria-valuemax={lastPage}
      aria-valuenow={focusedPage}
      aria-valuetext={`Page ${focusedPage}, ${focusedIssues.length === 0 ? 'no issues' : `${focusedIssues.length} ${focusedIssues.length === 1 ? 'issue' : 'issues'}`}`}
      aria-orientation="vertical"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative z-10 flex w-11 shrink-0 touch-none flex-col border-l bg-card select-none',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        scrubbing && 'cursor-grabbing',
        className,
      )}
    >
      <ol
        ref={listRef}
        aria-hidden
        className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-hidden"
      >
        {pages.map((page) => {
          const issues = issuesByPage.get(page.page_num) ?? []
          const isFocused = page.page_num === focusedPage
          return (
            <li
              key={page.page_num}
              style={{ width: page.width * scale, height: page.height * scale }}
              className={cn(
                'relative flex shrink-0 flex-col justify-start gap-px overflow-hidden rounded-xs border p-0.5',
                isFocused ? 'border-focus-edge bg-focus-tint ring-1 ring-focus-edge' : 'bg-background',
              )}
            >
              {issues.map((issue) => (
                <SeverityMark key={issue.id} severity={issue.severity} />
              ))}
            </li>
          )
        })}
      </ol>

      {/* A finger covers the thing it is pointing at, so the strip says what is
          under it. On a pointer device the same readout appears on hover. */}
      <div
        style={{ top: readoutTop ?? '50%' }}
        className={cn(
          'pointer-events-none absolute right-full z-20 mr-1 -translate-y-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-md transition-opacity',
          scrubbing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        aria-hidden
      >
        <span className="font-semibold tabular-nums">Page {focusedPage}</span>
        <span className="text-muted-foreground">
          {focusedIssues.length === 0 ? ' · clean' : ` · ${focusedIssues.length}`}
        </span>
      </div>
    </div>
  )
}
