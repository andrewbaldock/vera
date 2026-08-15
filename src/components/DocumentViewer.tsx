import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import '@/lib/pdf'
import { cn } from '@/lib/utils'
import type { DocumentPage } from '@/types/review'

/**
 * The document, continuously scrolled, every page mounted.
 *
 * That architecture follows from acceptance criterion #1 rather than from
 * preference: browser find only searches the DOM, so a viewer that mounts one
 * page at a time cannot support whole-document search no matter how good its
 * own search box is. Mounting everything is the price of using the platform's
 * find instead of reimplementing it.
 *
 * **Heights are reserved before anything paints.** Pages render asynchronously,
 * so an unreserved document is nearly zero pixels tall while it loads — scroll
 * to page 30 in that state and you land near the top, then watch the content
 * grow underneath you. The API's per-page `width`/`height` are what prevent
 * that. They look like data for drawing the thumb strip; they are actually what
 * makes navigation correct.
 *
 * **Everything here measures against the scroll container, never the window.**
 * The spike proved these behaviors against `window.scrollY`, which was correct
 * for a page that scrolls — and this app has no window scroll at all. The shell
 * is a fixed-height frame with scrolling inside panels, and the layout suite
 * asserts the document never scrolls. Geometry taken from the viewport would be
 * silently wrong by the height of the header and the status bar.
 *
 * The annotation layer is off. It exists to make PDF hyperlinks clickable,
 * which this document does not need — and it is the layer that ships
 * `z-index: 3` and swallows clicks meant for the UI above it. Fewer moving
 * parts, one less hazard.
 */

/** Wide enough to read, narrow enough that a line of body text isn't a marathon. */
const MAX_PAGE_WIDTH = 900
const PAGE_GUTTER = 24

/**
 * A programmatic scroll passes over every page between here and there, and the
 * reading line dutifully reports each one — so the list strobes through five
 * pages on the way to page 17. Measurement is suppressed until the scroll
 * settles. `scrollend` is the right signal; the timeout is the fallback for
 * browsers that don't fire it, and for a scroll that never actually moves.
 */
const SCROLL_SETTLE_MS = 700

/**
 * How many pages either side of the one you are reading get a canvas.
 *
 * This is the whole mobile-memory argument in one constant. A full-width page
 * canvas is roughly 10 MB at devicePixelRatio 2, so painting all 34 approaches
 * 350 MB — and iOS Safari discards tabs for less. The text layer is what find
 * needs and it is only DOM spans, so the two are separable: mount every text
 * layer always, paint canvases only near the viewport.
 *
 * ponytail: a fixed page count, not a measured viewport-height window. Three
 * either side covers the tallest panel the split view can produce at our
 * maximum page width. If pages ever get much shorter than the panel — a
 * landscape exhibit, or a much wider window — this should become a geometry
 * calculation rather than a count.
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
  const [available, setAvailable] = useState(0)
  // Kept here rather than lifted: this is the viewer's own rendering concern,
  // and the parent's focusedPage is about what the *rest of the app* highlights.
  const [nearPage, setNearPage] = useState(pages[0]?.page_num ?? 1)

  // Measured, because the panel is resizable — the splitter changes this width
  // at will, and every reserved height depends on it.
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
   * Which page am I looking at?
   *
   * The last page whose top has passed a line near the top of the container.
   * Deterministic, and it stays correct for a page taller than the viewport.
   *
   * An `IntersectionObserver` was the obvious first answer and is wrong here:
   * its callbacks fire only when a threshold is *crossed*, so distant pages keep
   * reporting whatever ratio they last had, and a page taller than the viewport
   * never reaches the higher thresholds at all. The reading froze after one
   * scroll.
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
      // element has no layout box — every page then reports a top of 0, so the
      // reading line concludes "the last page whose top passed the line" and
      // pins focusedPage to the final page. Switching back left the viewer
      // showing page 34 with the canvas window around it, which reads as a
      // blank document. Measuring something with no geometry is never right.
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
      onPageInView(current)
      setNearPage((previous) => (previous === current ? previous : current))
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    measure()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pages, onPageInView])

  /** Seeking scrolls. The reading line then decides what the focused page is. */
  useEffect(() => {
    const scroller = scrollRef.current
    const target = pageRefs.current[pages.findIndex((page) => page.page_num === seek.page)]
    // In the compact layout the panel may be behind the other tab. Nothing to
    // scroll while it has no layout box; the tab switch re-runs this.
    if (!scroller || !target || target.offsetParent === null) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior =
      reduceMotion || seek.behavior === 'instant' ? 'instant' : 'smooth'

    const top =
      scroller.scrollTop +
      (target.getBoundingClientRect().top - scroller.getBoundingClientRect().top) -
      PAGE_GUTTER

    // Measurement is suppressed for the length of the scroll, so the window has
    // to be moved by hand — otherwise we arrive at page 33 in front of a page
    // that has not been told to paint yet.
    setNearPage(seek.page)

    suppressUntilSettled.current = true
    scroller.scrollTo({ top, behavior })

    const release = () => {
      suppressUntilSettled.current = false
    }
    const timer = window.setTimeout(release, behavior === 'instant' ? 0 : SCROLL_SETTLE_MS)
    scroller.addEventListener('scrollend', release, { once: true })
    return () => {
      window.clearTimeout(timer)
      scroller.removeEventListener('scrollend', release)
      suppressUntilSettled.current = false
    }
  }, [seek, pages])

  const pageWidth = Math.max(0, Math.min(available - PAGE_GUTTER * 2, MAX_PAGE_WIDTH))

  return (
    <div
      ref={scrollRef}
      className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/40', className)}
    >
      <Document
        file={url}
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
                // That is the separation the whole memory argument rests on.
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
  )
}

function ViewerMessage({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-sm text-muted-foreground">{children}</p>
}
