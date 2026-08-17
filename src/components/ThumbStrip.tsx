import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Page images, in their own chunk. See ThumbRasters for why they cannot be
 * imported directly: this component is reachable from the statically imported
 * ReviewPage, and pdf.js is ~420 KB.
 */
const RasterDocument = lazy(async () => ({
  default: (await import('@/components/ThumbRasters')).RasterDocument,
}))
const RasterPage = lazy(async () => ({
  default: (await import('@/components/ThumbRasters')).RasterPage,
}))
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
 * The fit alone has a ceiling. The factor shrinks width along with height, so a
 * long document gets segments that are both shorter and narrower: measured
 * against an 800px column of Letter pages, 34 gives 21.6 x 16.7px and 100 gives
 * 6.0 x 4.6px, a thread down a 44px column.
 *
 * **So the fit has a floor under it**, and the floor is what the interface size
 * setting moves. Below the floor the strip stops shrinking and starts
 * scrolling, which is the trade: the whole document at a glance, or segments
 * you can read. At 34 pages the fit wins at every size but Large, so the
 * minimap is unchanged for this fixture until someone asks for bigger type.
 *
 * The floor is in rem, so it follows the size setting with no preference
 * plumbed in. Changing the setting changes the root font size, which changes
 * this column's own `w-11`, which fires the observer below — the strip is
 * already told, so it only has to read the root size while it is there.
 */

/** Gap between segments, in px. Comes out of the budget, never added on top. */
const SEGMENT_GAP = 2

/**
 * Floor under a segment's height, in rem: 20px at the middle size, 17.5 at
 * Compact, 25 at Large. Chosen to sit just under the 21.6px this fixture's fit
 * produces, so the shipped 34-page behavior is untouched at the first two sizes
 * and the floor only takes over where the fit has genuinely failed.
 */
const MIN_SEGMENT_REM = 1.25

/** How close to an edge a scrub has to get before the strip scrolls itself. */
const EDGE_ZONE_PX = 36
/** Pixels per frame at the edge. Slow enough to stop where you meant to. */
const EDGE_SPEED_PX = 6

interface ThumbStripProps {
  pages: DocumentPage[]
  issuesByPage: Map<number, NumberedIssue[]>
  focusedPage: number
  onSeek: (page: number) => void
  /**
   * Px width once the reader has dragged the strip, and `null` until they have.
   * The null is the whole handover: until it is dragged, the strip fits the document into
   * its column and stays a map of the whole thing. Dragged, width becomes the
   * thing that decides how big a page is, and the strip scrolls to hold them.
   */
  width?: number | null
  /** Absent only where there is no document to render, as in a test. */
  pdfUrl?: string
  /** So the splitter beside it can name what it controls. */
  id?: string
  className?: string
}

export function ThumbStrip({
  pages,
  issuesByPage,
  focusedPage,
  onSeek,
  width = null,
  pdfUrl,
  id,
  className,
}: ThumbStripProps) {
  const listRef = useRef<HTMLOListElement>(null)
  /**
   * The same element as the ref, held in state as well. Turning page images on
   * re-parents the list under react-pdf's `<Document>`, which remounts it — and
   * an observer attached once at mount would go on measuring a detached node.
   */
  const [listElement, setListElement] = useState<HTMLOListElement | null>(null)
  const attachList = useCallback((element: HTMLOListElement | null) => {
    listRef.current = element
    setListElement(element)
  }, [])
  /** Where the finger is, so the edge loop can keep working between events. */
  const scrubY = useRef(0)
  const edgeFrame = useRef(0)
  /**
   * The loop below reschedules itself, so it runs for its whole duration inside
   * the closure of the render that started it. Anything it reads has to come
   * from a ref, or it reads a value frozen at scrub start — and the one that
   * matters is `focusedPage`, which is what stops it re-seeking the page it is
   * already on. Frozen, the dedupe never matches and `onSeek` fires every
   * frame, which is the strobing the viewer's scroll suppression exists to
   * prevent, arriving through the back door.
   */
  const live = useRef({ focusedPage, pages, onSeek })
  live.current = { focusedPage, pages, onSeek }
  const [scrubbing, setScrubbing] = useState(false)
  const [column, setColumn] = useState({ width: 0, height: 0, rem: 16 })

  // Measured before paint, so there is no frame at the wrong size. The strip
  // re-scales when the splitter moves, when the window does, and when the
  // interface size changes — that last one resizes this column too, which is
  // why the root font size is read here rather than subscribed to separately.
  useLayoutEffect(() => {
    const list = listElement
    if (!list) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      setColumn((previous) =>
        previous.width === width && previous.height === height && previous.rem === rem
          ? previous
          : { width, height, rem },
      )
    })
    observer.observe(list)
    return () => observer.disconnect()
  }, [listElement])

  const focusedIssues = issuesByPage.get(focusedPage) ?? []
  // The slider's range is the document's own page numbers, not the array length.
  // They coincide in this fixture but are not the same fact.
  const firstPage = pages[0]?.page_num ?? 1
  const lastPage = pages[pages.length - 1]?.page_num ?? firstPage

  /** The one factor. Fit to whichever dimension runs out first, then floored. */
  const totalHeight = pages.reduce((sum, page) => sum + page.height, 0)
  const widestPage = Math.max(...pages.map((page) => page.width))
  const gaps = SEGMENT_GAP * Math.max(0, pages.length - 1)
  const samplePageHeight = pages[0]?.height ?? 0
  const fitScale =
    column.height > 0
      ? Math.min((column.height - gaps) / totalHeight, column.width / widestPage)
      : 0
  // The floor. Zero-height documents would divide by zero, so a document with
  // no measurable page keeps the fit and renders nothing, as it did before.
  const floorScale =
    samplePageHeight > 0 ? (MIN_SEGMENT_REM * column.rem) / samplePageHeight : 0
  /**
   * Once dragged, a page fills the column it was given and the height fit drops
   * out of the arithmetic entirely: filling the width always beats fitting the
   * height when the overflow is allowed to scroll, so keeping both terms would
   * be keeping one that can never win.
   *
   * Measured off the column rather than off the prop, because the segment has
   * to fit what the element actually got.
   */
  const widthScale = widestPage > 0 ? column.width / widestPage : 0
  const base = width === null ? fitScale : widthScale
  const scale = fitScale > 0 ? Math.max(base, floorScale) : 0
  // Every page in a document is usually the same height, so one sample decides
  // whether numbers fit at all.
  const segmentHeight = samplePageHeight * scale
  /**
   * The page number's size, and the threshold it has to clear. Both follow the
   * interface size: 10px at the middle stop, rising to 12.5 at Large. This
   * shipped at a hard-coded 8px, which was the specific thing a reader found
   * too small, and 8px did not move when anything else did.
   *
   * The 1.6 multiplier reproduces the old 16px threshold at the middle stop, so a
   * segment that showed a number before still shows one. An unlabeled block
   * beats a clipped digit.
   */
  const numberHeight = 0.625 * column.rem
  const segmentWidth = widestPage * scale
  /**
   * Page images, at every width. The original build declined them on the grounds that a picture
   * this small is unreadable, which is true of the picture and beside the point
   * of it: even as a smear, a cover sheet, a table and a photo page are three
   * different shapes, and that is enough to navigate by. The number and the
   * severity marks still carry the reading.
   */
  const rasters = Boolean(pdfUrl)

  const focusedIndex = pages.findIndex((page) => page.page_num === focusedPage)
  /**
   * The readout tracks the focused segment rather than sitting at the middle of
   * the strip, where scrubbing to page 30 would show the label beside page 17.
   *
   * State rather than a value read during render, because once the list can
   * scroll its own `offsetTop` stops describing where a segment *appears*. This
   * has to be recomputed when the list scrolls as well as when the focus moves,
   * and only an effect can watch both.
   */
  const [readoutTop, setReadoutTop] = useState<number | null>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const segment = list?.children[focusedIndex] as HTMLElement | undefined
    if (!list || !segment) {
      setReadoutTop(null)
      return
    }

    const place = () =>
      setReadoutTop(segment.offsetTop - list.scrollTop + segment.offsetHeight / 2)

    // Keep the focused segment on screen. Written out rather than
    // `scrollIntoView({ block: 'nearest' })`, which is free to scroll every
    // ancestor as well and would drag the document panel around with it.
    if (list.scrollHeight > list.clientHeight) {
      const top = segment.offsetTop
      const bottom = top + segment.offsetHeight
      if (top < list.scrollTop) list.scrollTop = top
      else if (bottom > list.scrollTop + list.clientHeight) {
        list.scrollTop = bottom - list.clientHeight
      }
    }

    place()
    list.addEventListener('scroll', place, { passive: true })
    return () => list.removeEventListener('scroll', place)
  }, [focusedIndex, scale, column.height, pages.length, listElement])

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

  /**
   * Scrolls the strip when a scrub reaches its edge, and keeps scrolling while
   * the finger stays there.
   *
   * Required rather than a refinement: `touch-action: none` on this control
   * means a finger here scrubs and never scrolls, so once the strip is longer
   * than its column the pages off screen have no other way to be reached on
   * the device the whole control was designed for.
   */
  function stepEdgeScroll() {
    edgeFrame.current = 0
    const list = listRef.current
    if (!list || list.scrollHeight <= list.clientHeight) return

    const bounds = list.getBoundingClientRect()
    const y = scrubY.current
    let delta = 0
    if (y < bounds.top + EDGE_ZONE_PX) delta = -EDGE_SPEED_PX
    else if (y > bounds.bottom - EDGE_ZONE_PX) delta = EDGE_SPEED_PX

    if (delta !== 0) {
      const before = list.scrollTop
      list.scrollTop += delta
      // The content moved under a stationary finger, so the page beneath it is
      // a different one now even though the pointer never sent an event.
      if (list.scrollTop !== before) {
        const page = pageAt(y)
        if (page !== null && page !== live.current.focusedPage) live.current.onSeek(page)
      }
    }
    edgeFrame.current = requestAnimationFrame(stepEdgeScroll)
  }

  function stopEdgeScroll() {
    if (edgeFrame.current) cancelAnimationFrame(edgeFrame.current)
    edgeFrame.current = 0
  }

  // A drag can outlive the component if the panel is closed mid-scrub.
  useEffect(() => stopEdgeScroll, [])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setScrubbing(true)
    scrubY.current = event.clientY
    scrubTo(event.clientY)
    if (!edgeFrame.current) edgeFrame.current = requestAnimationFrame(stepEdgeScroll)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    scrubY.current = event.clientY
    scrubTo(event.clientY)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    // A browser-initiated pointercancel has already released capture, so
    // releasing it again throws NotFoundError. That is the normal path on touch.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setScrubbing(false)
    stopEdgeScroll()
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

  /**
   * Written once and rendered with or without page images, because the version
   * without them is what shows while pdf.js parses. A `<Page>` cannot appear in
   * that version: it renders outside the document context and throws.
   */
  const renderList = (withRasters: boolean) => (
    <ol
      ref={attachList}
      aria-hidden
      // Scrolls only when the floor has beaten the fit. Scrolled by the strip
      // itself and by a scrub reaching the edge, never by a finger: the bar is
      // hidden because it would be a scrollbar in a 44px column that nothing is
      // allowed to drag.
      className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
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
            {withRasters && (
              <RasterPage pageNumber={page.page_num} width={Math.round(segmentWidth)} />
            )}
            {/*
              The page number, so a segment can be read as a location.
              Smallest legible size, hidden when a segment is too short to hold
              it: an unlabeled block beats a clipped digit. `tabular-nums` keeps
              the column aligned as digits change width.
            */}
            {segmentHeight >= numberHeight * 1.6 && (
              <span
                style={{ fontSize: numberHeight }}
                // Sits at the foot of the segment, because the severity marks
                // stack down from the head of it. Centred, the two land on each
                // other, which was invisible while the number was 8px and is
                // not once it is legible. Over the page image, once there is
                // one, on a plate so it stays readable against any page.
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center leading-none font-medium tabular-nums',
                  rasters ? 'bg-card/85 py-0.5 text-foreground' : 'text-muted-foreground',
                )}
              >
                {page.page_num}
              </span>
            )}
            {/*
              Lifted out of the flow and onto the page image. As flex items the
              marks sat under it: the image is an absolutely positioned child,
              which paints over static siblings, and a `z-index` on a static
              flex item was not enough to bring 4px of colour back out from
              under a full-bleed canvas. Positioned, they are unambiguously on
              top, and they keep stacking from the head of the segment.
            */}
            {issues.length > 0 && (
              <span className="pointer-events-none absolute inset-x-0.5 top-0.5 z-10 flex flex-col gap-px">
                {issues.map((issue) => (
                  <SeverityMark key={issue.id} severity={issue.severity} />
                ))}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )

  return (
    // z-10 clears pdf.js's annotation layer (z-index: 3), whose invisible text
    // would otherwise sit over this and swallow the drag.
    <div
      id={id}
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
      style={width === null ? undefined : { width }}
      className={cn(
        // `grab`, not `pointer`. This is one control you press and drag, not
        // thirty-four you click, and the cursor should say which — the same
        // reasoning that gives the splitter `col-resize`.
        'group relative z-10 flex shrink-0 cursor-grab touch-none flex-col border-l bg-card select-none active:cursor-grabbing',
        // 2.75rem, so a strip nobody has dragged still follows the interface size.
        width === null && 'w-11',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        scrubbing && 'cursor-grabbing',
        className,
      )}
    >
      {rasters && pdfUrl ? (
        // The image-less list stands in twice over: while the chunk downloads,
        // and again inside `<Document>` while pdf.js parses. The strip is never
        // blank. Turning images on remounts the list, which is what the
        // observer's callback ref above exists to survive.
        <Suspense fallback={renderList(false)}>
          <RasterDocument url={pdfUrl} fallback={renderList(false)}>
            {renderList(true)}
          </RasterDocument>
        </Suspense>
      ) : (
        renderList(false)
      )}

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
