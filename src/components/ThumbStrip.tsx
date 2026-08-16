import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SeverityMark } from '@/components/severity'
import type { NumberedIssue } from '@/lib/review'
import type { DocumentPage } from '@/types/review'

/**
 * A miniature of the whole document down the edge of the viewer. One control you
 * scrub, not thirty-four you click, which is what makes it work on touch:
 * thirty-four targets at the 44px minimum would need ~1,500px of column, while a
 * single press-and-drag control needs the minimum once. Same interaction as the
 * iOS index scrubber. Being one control also makes it a slider, so keyboard
 * users get navigation of the whole document from slider semantics.
 *
 * Sizing: **one scale factor, computed once, multiplied into every page's real
 * width and height.** Nothing is normalized, so a Legal page among Letter pages
 * renders visibly taller, which is the most common real anomaly.
 *
 * Arithmetic rather than CSS, because both CSS equivalents fail on documents
 * this fixture does not contain. A percentage height plus `aspect-ratio` gives a
 * clamped segment its own scale factor, rendering a short page *wider* than the
 * full page beside it; a percentage of the column ignores width, so a four-page
 * document computes segments 180px wide inside a 44px strip. Fitting to the
 * shorter of the two constraints keeps the strip inside its column in both
 * directions, so it never scrolls: a scroll container inside a
 * `touch-action: none` scrub surface is unscrollable by the finger it exists for.
 *
 * That fit has a ceiling, named here rather than hidden. The factor shrinks
 * width along with height, so a long document does not just get shorter
 * segments, it gets narrower ones: measured against an 800px column of Letter
 * pages, 34 gives 21.6 x 16.7px, 45 drops under the 16px at which the numbers
 * stop rendering, and 100 gives 6.0 x 4.6px — a thread down a 44px column.
 * Correct for this document, wrong for a hundred-page one.
 *
 * Fixing it means a minimum segment height with the overflow scrolled, but not
 * scrolled by the user: a finger drag here already means "scrub", so the strip
 * would have to scroll itself from the focused page, and the scrub-to-page
 * mapping stops being a straight measurement once part of the strip is off
 * screen. Left undone deliberately — the fixture is 34 pages and the arithmetic
 * is right for it.
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

  // Measured before paint, so there is no frame at the wrong size. The strip
  // re-scales when the splitter moves or the window does.
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
  // The slider's range is the document's own page numbers, not the array length.
  // They coincide in this fixture but are not the same fact.
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
  // Every page in a document is usually the same height, so one sample decides
  // whether numbers fit at all.
  const segmentHeight = (pages[0]?.height ?? 0) * scale

  /**
   * The readout tracks the focused segment rather than sitting at the middle of
   * the strip, where scrubbing to page 30 would show the label beside page 17.
   * Measured off the segment itself, so it stays correct for pages of different
   * heights.
   */
  const focusedIndex = pages.findIndex((page) => page.page_num === focusedPage)
  const focusedSegment = listRef.current?.children[focusedIndex] as HTMLElement | undefined
  const readoutTop = focusedSegment
    ? focusedSegment.offsetTop + focusedSegment.offsetHeight / 2
    : null

  /**
   * Which page is under the pointer. Measured against the segments themselves,
   * not interpolated over the column: segments are not all the same height, so
   * interpolation drifts the moment a page is a different size.
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
    // unreachable on a viewport shorter than the strip.
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
    // releasing it again throws NotFoundError. That is the normal path on touch.
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
        // `grab`, not `pointer`. This is one control you press and drag, not
        // thirty-four you click, and the cursor should say which — the same
        // reasoning that gives the splitter `col-resize`.
        'group relative z-10 flex w-11 shrink-0 cursor-grab touch-none flex-col border-l bg-card select-none active:cursor-grabbing',
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
              {/*
                The page number, so a segment can be read as a location.
                Smallest legible size, hidden when a segment is too short to
                hold it: an unlabeled block beats a clipped digit.
                `tabular-nums` keeps the column aligned as digits change width.
              */}
              {segmentHeight >= 16 && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] leading-none font-medium text-muted-foreground tabular-nums">
                  {page.page_num}
                </span>
              )}
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
