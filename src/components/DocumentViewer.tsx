import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import '@/lib/pdf'
import { cn } from '@/lib/utils'
import type { DocumentPage } from '@/types/review'

/**
 * The document, continuously scrolled, every page mounted. That follows from
 * acceptance criterion #1: browser find only searches the DOM, so a viewer that
 * mounts one page at a time cannot support whole-document search. Mounting
 * everything is the price of using the platform's find rather than
 * reimplementing it.
 *
 * **Heights are reserved before anything paints.** Pages render asynchronously,
 * so an unreserved document is nearly zero pixels tall while it loads: scroll to
 * page 30 in that state and you land near the top, then watch the content grow
 * underneath you. The API's per-page `width`/`height` are what prevent that.
 *
 * **Everything here measures against the scroll container, never the window.**
 * The shell is a fixed-height frame with scrolling inside panels, and the layout
 * suite asserts the document never scrolls. Geometry taken from the viewport
 * would be wrong by the height of the header and the status bar.
 *
 * The annotation layer is off. It makes PDF hyperlinks clickable, which this
 * document does not need, and it is the layer that ships `z-index: 3` and
 * swallows clicks meant for the UI above it.
 */

/** Wide enough to read, narrow enough that a line of body text isn't a marathon. */
const MAX_PAGE_WIDTH = 900
const PAGE_GUTTER = 24

/**
 * A programmatic scroll passes over every page between here and there and the
 * reading line reports each one, so the list strobes through five pages on the
 * way to page 17. Measurement is suppressed until the scroll settles.
 *
 * `scrollend` is the signal. The timeout is only for browsers that do not fire
 * it and for a scroll that never moves — which is why there are two of them.
 * A single 700ms timer looks like a safety net and behaves like a race: a smooth
 * scroll from page 1 to page 33 takes about 1.6s, so the timer would win by
 * roughly 900ms and hand back exactly the strobing it was added to prevent.
 * Where `scrollend` exists the fallback only has to catch a scroll that never
 * happened, so it can be long enough to never be the one that fires first.
 */
const SCROLL_SETTLE_MS = 700
const SCROLL_SETTLE_FALLBACK_MS = 5000
const SCROLL_END_SUPPORTED = typeof window !== 'undefined' && 'onscrollend' in window

/**
 * How long the page counter stays after the scrolling stops. Long enough to
 * still be there when you look down at it, which is the moment after you stop
 * moving. It fades slowly for the same reason: something that vanishes the
 * instant you arrive reads as a glitch.
 */
const COUNTER_IDLE_MS = 1100

/**
 * How many pages either side of the one you are reading get a canvas. A
 * full-width page canvas is roughly 10 MB at devicePixelRatio 2, so painting all
 * 34 approaches 350 MB, and iOS Safari discards tabs for less. The text layer is
 * what find needs and it is only DOM spans, so the two separate: mount every
 * text layer always, paint canvases only near the viewport.
 *
 * ponytail: a fixed page count, not a measured viewport-height window. Three
 * either side covers the tallest panel the split view can produce at our maximum
 * page width. If pages ever get much shorter than the panel (a landscape
 * exhibit, or a much wider window) this should become a geometry calculation.
 */
const CANVAS_WINDOW = 3

export interface SeekTarget {
  page: number
  /** Bumped on every request, so seeking to the page you are on still works. */
  nonce: number
  /**
   * Dragging the thumb strip should track the thumb, not animate to each page
   * it passes. Clicking an issue should show you the journey.
   */
  behavior: ScrollBehavior
}

interface DocumentViewerProps {
  url: string
  /** From the API, so heights are known before pdf.js has parsed anything. */
  pages: DocumentPage[]
  seek: SeekTarget
  onPageInView: (page: number) => void
  className?: string
}

export function DocumentViewer({
  url,
  pages,
  seek,
  onPageInView,
  className,
}: DocumentViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const suppressUntilSettled = useRef(false)
  /**
   * The last seek actually carried out. A seek arriving before the pages have
   * laid out has nothing to scroll to, so the effect runs again when layout
   * arrives rather than dropping the request. This is what stops it re-scrolling
   * on every later resize.
   */
  const appliedSeek = useRef(-1)
  /** The current reading-line measurement, so a settled seek can run it once. */
  const measureRef = useRef<() => void>(() => {})
  const [available, setAvailable] = useState(0)
  /**
   * Whether `<Document>` has swapped its loading message for the pages. Until it
   * does there are no page elements to scroll to, and nothing else re-renders
   * when they appear — so without this a seek made during the load has no target
   * and is never retried. Not a ref: the seek effect has to run again when it
   * flips, which is exactly what state is for.
   */
  const [pagesMounted, setPagesMounted] = useState(false)
  /**
   * Whether the counter is showing. Driven by scroll events, so a document that
   * fits its panel never raises it: with nothing to scroll there is nothing to
   * report.
   */
  const [scrolling, setScrolling] = useState(false)
  const idleTimer = useRef(0)
  // Kept here rather than lifted: this is the viewer's own rendering concern,
  // and the parent's focusedPage is about what the *rest of the app* highlights.
  const [nearPage, setNearPage] = useState(pages[0]?.page_num ?? 1)

  const pageWidth = Math.max(0, Math.min(available - PAGE_GUTTER * 2, MAX_PAGE_WIDTH))

  // Measured because the panel is resizable: the splitter changes this width at
  // will, and every reserved height depends on it.
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setAvailable((previous) => (previous === width ? previous : width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  /**
   * Which page am I looking at? The last page whose top has passed a line near
   * the top of the container. Deterministic, and correct for a page taller than
   * the viewport.
   *
   * Not an `IntersectionObserver`: its callbacks fire only when a threshold is
   * *crossed*, so distant pages keep reporting whatever ratio they last had, and
   * a page taller than the viewport never reaches the higher thresholds at all.
   */
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return

    let frame = 0

    const measure = () => {
      frame = 0
      if (suppressUntilSettled.current) return

      const bounds = scroller.getBoundingClientRect()
      // In the compact layout the inactive tab is `display: none`, and a hidden
      // element has no layout box: every page reports a top of 0, so the reading
      // line pins focusedPage to the final page and switching back shows page 34
      // with the canvas window around it, which reads as a blank document.
      if (bounds.height === 0 || bounds.width === 0) return

      const readingLine = bounds.top + Math.min(160, bounds.height * 0.25)

      let current = pages[0]?.page_num ?? 1
      for (let index = 0; index < pageRefs.current.length; index += 1) {
        const element = pageRefs.current[index]
        if (!element) continue
        // Pages are in document order, so the first one still below the line
        // means every later one is too. Cheap enough to run during momentum.
        if (element.getBoundingClientRect().top > readingLine) break
        current = pages[index].page_num
      }
      // On a tall panel the reading line cannot reach the last page. The line
      // sits a quarter of the way down, so it needs the page's top to rise above
      // it — but at the end of the scroll there is nothing below the last page
      // left to move, and if the panel is taller than one rendered page that top
      // never gets there. Measured on this fixture: an 806px panel puts page 34's
      // top 519px *above* the line and the loop is right without this; a 1506px
      // panel leaves it 181px below, and the strip sits on 33 while page 34 fills
      // the screen. So it is panel height that decides, not page height — every
      // page here is the same size.
      //
      // Not a lower reading line: that would misreport every *other* page, and
      // the line's position is what makes the measurement right in the general
      // case. The end of the scroll is its own answer — you can see the last
      // page, so that is the page you are on.
      //
      // Guarded on the content actually overflowing, or a document short enough
      // to fit in the panel reports its last page while you look at its first.
      const scrollable = scroller.scrollHeight - scroller.clientHeight
      if (scrollable > 1 && scrollable - scroller.scrollTop <= 2) {
        current = pages[pages.length - 1]?.page_num ?? current
      }

      onPageInView(current)
      setNearPage((previous) => (previous === current ? previous : current))
    }

    // Held so the seek can measure once the scroll it started has settled.
    // Measurement is otherwise driven entirely by scroll events, and a seek
    // suppresses those for the length of its own scroll.
    measureRef.current = measure

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    const onScroll = () => {
      // Raised here rather than inside `measure`, which is suppressed for the
      // length of a programmatic scroll. Clicking an issue should show the
      // counter on the way, and that is exactly when measurement is off.
      setScrolling(true)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => setScrolling(false), COUNTER_IDLE_MS)
      schedule()
    }

    measure()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    // Resize re-measures the reading line without raising the counter: dragging
    // the splitter is not reading, and a chip over the document while someone
    // sizes the panel is in the way.
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', schedule)
      window.clearTimeout(idleTimer.current)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pages, onPageInView])

  /** Seeking scrolls. The reading line then decides what the focused page is. */
  useEffect(() => {
    if (appliedSeek.current === seek.nonce) return

    const scroller = scrollRef.current
    const target = pageRefs.current[pages.findIndex((page) => page.page_num === seek.page)]
    // In the compact layout the panel may be behind the other tab, and early on
    // the pages may not exist yet. Either way there is nothing to scroll to, so
    // the request is kept and this effect runs again when the tab switches or
    // layout arrives.
    if (!scroller || !target || target.offsetParent === null) return
    // Before the pages have width they have no reserved height either, so every
    // scroll target computes to roughly zero. Scrolling then "succeeds" while
    // going nowhere, and marking it applied would strand the request for good.
    if (pageWidth <= 0) return

    appliedSeek.current = seek.nonce

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior =
      reduceMotion || seek.behavior === 'instant' ? 'instant' : 'smooth'

    const top =
      scroller.scrollTop +
      (target.getBoundingClientRect().top - scroller.getBoundingClientRect().top) -
      PAGE_GUTTER

    // Measurement is suppressed for the length of the scroll, so the canvas
    // window is moved by hand. Otherwise we arrive at page 33 in front of a page
    // that has not been told to paint.
    setNearPage(seek.page)

    suppressUntilSettled.current = true
    scroller.scrollTo({ top, behavior })

    const release = () => {
      suppressUntilSettled.current = false
      // Measure once, here. Measurement runs off scroll events, and by the time
      // suppression lifts the scroll may already be over — `scrollend` fires
      // before the settle timer whenever the scroll is short or the machine is
      // quick. No further scroll event then arrives, so without this the
      // focused page keeps whatever value it had before the seek: the document
      // sits on page 7 while the strip and status bar say page 1.
      measureRef.current()
    }
    const timer = window.setTimeout(
      release,
      behavior === 'instant'
        ? 0
        : SCROLL_END_SUPPORTED
          ? SCROLL_SETTLE_FALLBACK_MS
          : SCROLL_SETTLE_MS,
    )
    scroller.addEventListener('scrollend', release, { once: true })
    return () => {
      window.clearTimeout(timer)
      scroller.removeEventListener('scrollend', release)
      suppressUntilSettled.current = false
    }
    // The last three are the conditions the guards above bail on: a seek that
    // arrived before the panel had width, or before `<Document>` mounted its
    // pages, is carried out when that changes rather than lost.
  }, [seek, pages, available, pageWidth, pagesMounted])

  return (
    // The wrapper exists so the counter can sit against the panel rather than
    // against the content. Inside the scroller it would travel with the pages
    // and be somewhere else on every frame.
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/40"
      >
        <Document
          file={url}
          onLoadSuccess={() => setPagesMounted(true)}
          loading={<ViewerMessage>Loading the document…</ViewerMessage>}
          error={<ViewerMessage>The document could not be displayed.</ViewerMessage>}
          noData={<ViewerMessage>No document to display.</ViewerMessage>}
          className="flex flex-col items-center gap-6 py-6"
        >
        {pages.map((page, index) => (
          <div
            key={page.page_num}
            data-page={page.page_num}
            ref={(element) => {
              pageRefs.current[index] = element
            }}
            style={{
              width: pageWidth || undefined,
              // Reserved, not fixed: the page settles into its real height once
              // it paints, but the document has the right total height from the
              // first frame, so scroll targets are correct while it loads.
              minHeight: pageWidth ? (page.height / page.width) * pageWidth : undefined,
            }}
            className="relative bg-white shadow-sm ring-1 ring-black/5"
          >
            {pageWidth > 0 && (
              <Page
                pageNumber={page.page_num}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer
                // The text layer mounts either way; only the canvas is windowed.
                // Find needs the text layer everywhere; memory needs the canvas
                // only near the viewport.
                renderMode={
                  Math.abs(page.page_num - nearPage) <= CANVAS_WINDOW ? 'canvas' : 'none'
                }
                loading=""
              />
            )}
          </div>
        ))}
        </Document>
      </div>

      {/*
        Where you are, where your eyes already are. The status bar above the
        viewer carries the same page number, but during a scroll nobody is
        looking at the top of the panel.

        `aria-hidden` and no live region, for the reason the status bar gives:
        this changes on every page a momentum scroll passes, so announcing it
        would queue thirty updates about pages the listener has already left.
        The thumb strip's slider reports the same fact on demand.

        In fast, out slow. It has to be there the moment you start moving, and
        something that disappears the instant you stop reads as a glitch rather
        than as a control standing down.
      */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2',
          'rounded-full bg-paper-chip px-3 py-1.5 text-xs font-medium text-paper-chip-text tabular-nums shadow-lg',
          'transition-opacity motion-reduce:transition-none',
          scrolling ? 'opacity-100 duration-150' : 'opacity-0 duration-600',
        )}
      >
        {nearPage} / {pages.length}
      </div>
    </div>
  )
}

function ViewerMessage({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-sm text-muted-foreground">{children}</p>
}
