import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import '@/lib/pdf'
import { clampZoom } from '@/lib/zoom'
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


/** Below this much movement a two-finger touch is a scroll, not a pinch. */
const PINCH_DEADZONE = 0.02

/** How long after the last trackpad wheel event the zoom is made real. */
const WHEEL_COMMIT_MS = 120

/** Two taps closer together than this, and near enough, mean "reset". */
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_SLOP_PX = 30

function distance(a: { clientX: number; clientY: number }, b: typeof a) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}


/**
 * Hard ceiling on a single page's backing store, in device pixels.
 *
 * react-pdf rasterises at `width x devicePixelRatio`. At full zoom on a Retina
 * screen that is 900 x 4 x 2 = 7200px wide, and iOS Safari refuses a canvas over
 * 4096px on a side — it allocates a blank one instead, so the pages simply go
 * white on the device the gesture exists for.
 *
 * This is a different problem from `CANVAS_WINDOW`, which limits how *many*
 * canvases exist and does nothing about how big any one of them is.
 */
const MAX_RASTER_PX = 4096

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
  /** Owned by the panel, because the control for it lives in the page bar. */
  zoom: number
  onZoomChange: (zoom: number) => void
  className?: string
}

export function DocumentViewer({
  url,
  pages,
  seek,
  onPageInView,
  zoom,
  onZoomChange,
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
  /**
   * Committed zoom, and the live scale a pinch is currently showing.
   *
   * Two values rather than one because they cost different things. Committed
   * zoom changes `pageWidth`, which re-renders every nearby page at the new
   * size: crisp, and far too slow to do on every frame of a gesture. The live
   * scale is a CSS transform on the pages already painted, which costs nothing
   * and is what the finger follows. The transform is thrown away and the real
   * width applied the moment the fingers lift.
   */
  const [pinchScale, setPinchScale] = useState(1)
  /** Active touches, by pointer id, so a pinch can be told from a scroll. */
  const touches = useRef(new Map<number, { clientX: number; clientY: number }>())
  const pinch = useRef<{ startDistance: number; startZoom: number } | null>(null)
  /**
   * Where the fingers are, in the scaled wrapper's own coordinates, so the
   * transform grows the content under them.
   *
   * `transform-origin: top center` scales from the top of the *whole document*,
   * which is tens of thousands of pixels above the reader. At page 20 a 1.2x
   * pinch would push everything down by a fifth of the scroll offset — the
   * content launches off the bottom of the panel instead of growing in place,
   * and it looks fine on page 1, which is why it survives a casual test.
   */
  const [pinchOrigin, setPinchOrigin] = useState({ x: 0, y: 0 })
  const wheelCommit = useRef(0)
  const wheelPending = useRef(false)
  /** The live gesture scale, so a pointerup does not read a stale render. */
  const pinchScaleRef = useRef(1)
  const lastTap = useRef({ time: 0, x: 0, y: 0 })
  /**
   * Where to land after a zoom. Committed zoom changes every reserved height,
   * so the scroll offset that meant "page 14" before means something else
   * after. Captured before the change and restored once the new layout exists.
   */
  const anchor = useRef<{ page: number; offset: number } | null>(null)
  // Kept here rather than lifted: this is the viewer's own rendering concern,
  // and the parent's focusedPage is about what the *rest of the app* highlights.
  const [nearPage, setNearPage] = useState(pages[0]?.page_num ?? 1)

  /** Fit-to-panel, before any zoom. Zoom multiplies it. */
  const fitWidth = Math.max(0, Math.min(available - PAGE_GUTTER * 2, MAX_PAGE_WIDTH))
  const pageWidth = fitWidth * zoom

  /**
   * A canvas costs the square of the zoom, so the window narrows as it opens.
   * At 4x a single page is sixteen times the pixels it was, and the constant
   * that was safe for seven pages at 1x would be 112 pages' worth of memory.
   */
  const canvasWindow = Math.max(1, Math.round(CANVAS_WINDOW / zoom))

  /**
   * Device pixels per CSS pixel, held under the platform's canvas limit. Above
   * the cap the page renders slightly soft; over it, it renders as nothing.
   */
  const tallestRatio = Math.max(1, ...pages.map((page) => page.height / page.width))
  const rasterRatio =
    pageWidth > 0
      ? Math.min(
          typeof window === 'undefined' ? 1 : window.devicePixelRatio,
          // Against the *larger* rendered side. These pages are portrait, so
          // height is what hits the limit first and a width-only cap does
          // nothing at all.
          MAX_RASTER_PX / (pageWidth * tallestRatio),
        )
      : 1

  /**
   * Remembers which page is where, so a zoom can put it back. Called before the
   * committed zoom changes, read after the layout it invalidated has been redone.
   */
  function captureAnchor() {
    const scroller = scrollRef.current
    const index = pages.findIndex((page) => page.page_num === nearPage)
    const element = pageRefs.current[index]
    if (!scroller || !element) return
    anchor.current = {
      page: nearPage,
      offset: element.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
    }
  }

  function applyZoom(next: number) {
    const value = clampZoom(next)
    if (value === zoom) return
    captureAnchor()
    onZoomChange(value)
  }

  // Put the anchored page back where it was. Layout effect, so it happens
  // before the browser paints and the document never appears to jump.
  useLayoutEffect(() => {
    const target = anchor.current
    const scroller = scrollRef.current
    if (!target || !scroller || pageWidth <= 0) return
    anchor.current = null
    const index = pages.findIndex((page) => page.page_num === target.page)
    const element = pageRefs.current[index]
    if (!element) return
    scroller.scrollTop +=
      element.getBoundingClientRect().top - scroller.getBoundingClientRect().top - target.offset
  }, [pageWidth, pages])

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

  /**
   * Trackpad pinch, which the platform reports as a wheel event with `ctrlKey`
   * set. Attached by hand rather than with `onWheel` because it has to be
   * non-passive: without `preventDefault` the browser zooms the entire app,
   * which is the thing the reader was trying to avoid by pinching the document.
   */
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      // Exponential, so a given amount of finger travel is the same proportion
      // of zoom whether you are at 1x or at 3x.
      //
      // Accumulated into the transform and committed on a trailing timer, for
      // the same reason the touch path does: a trackpad pinch delivers wheel
      // events at refresh rate, and committing each one re-renders every
      // windowed page at a new width.
      const target = clampZoom(zoom * pinchScaleRef.current * Math.exp(-event.deltaY / 180))
      const next = target / zoom
      pinchScaleRef.current = next
      setPinchScale(next)

      if (!wheelPending.current) {
        const scroller = scrollRef.current!
        const bounds = scroller.getBoundingClientRect()
        setPinchOrigin({
          x: event.clientX - bounds.left + scroller.scrollLeft,
          y: event.clientY - bounds.top + scroller.scrollTop,
        })
        captureAnchor()
        wheelPending.current = true
      }

      window.clearTimeout(wheelCommit.current)
      wheelCommit.current = window.setTimeout(() => {
        wheelPending.current = false
        const settled = clampZoom(zoom * pinchScaleRef.current)
        pinchScaleRef.current = 1
        setPinchScale(1)
        if (settled === zoom) anchor.current = null
        else onZoomChange(settled)
      }, WHEEL_COMMIT_MS)
    }
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', onWheel)
    // Everything the handler closes over. Left off, the listener keeps an old
    // zoom and every pinch starts again from wherever the first one did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, nearPage, pages])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch') return
    touches.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })
    const points = [...touches.current.values()]
    if (points.length === 2) {
      pinch.current = { startDistance: distance(points[0], points[1]), startZoom: zoom }
      const scroller = scrollRef.current
      if (scroller) {
        const bounds = scroller.getBoundingClientRect()
        const midX = (points[0].clientX + points[1].clientX) / 2 - bounds.left
        const midY = (points[0].clientY + points[1].clientY) / 2 - bounds.top
        setPinchOrigin({ x: midX + scroller.scrollLeft, y: midY + scroller.scrollTop })
      }
      captureAnchor()
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || !touches.current.has(event.pointerId)) return
    touches.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })

    const gesture = pinch.current
    const points = [...touches.current.values()]
    if (!gesture || points.length !== 2 || gesture.startDistance === 0) return

    const ratio = distance(points[0], points[1]) / gesture.startDistance
    if (Math.abs(ratio - 1) < PINCH_DEADZONE) return
    // The transform is relative to what is already painted, so it is the target
    // zoom over the committed one.
    const next = clampZoom(gesture.startZoom * ratio) / zoom
    pinchScaleRef.current = next
    setPinchScale(next)
  }

  function endPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch') return
    const gesture = pinch.current
    touches.current.delete(event.pointerId)
    if (!gesture || touches.current.size > 0) return

    pinch.current = null
    // Read from the ref, not from state: pointermove is a continuous event and
    // React may not have committed the final setPinchScale before this discrete
    // pointerup flushes, which would commit the second-to-last frame's scale.
    const scale = pinchScaleRef.current
    pinchScaleRef.current = 1
    setPinchScale(1)

    const next = clampZoom(zoom * scale)
    if (next === zoom) {
      // The gesture resolved without changing anything — under the deadzone, or
      // already at a bound. `captureAnchor` ran at the second finger-down, and
      // only a width change clears it, so without this the anchor stays armed
      // and the next unrelated resize yanks the reader back to here.
      anchor.current = null
      return
    }
    onZoomChange(next)
  }

  /** Double-tap anywhere on the document returns it to fit. */
  function handlePointerUpTap(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || touches.current.size > 1 || pinch.current) return
    const now = event.timeStamp
    const previous = lastTap.current
    const near =
      Math.abs(event.clientX - previous.x) < DOUBLE_TAP_SLOP_PX &&
      Math.abs(event.clientY - previous.y) < DOUBLE_TAP_SLOP_PX
    if (now - previous.time < DOUBLE_TAP_MS && near && zoom !== 1) {
      applyZoom(1)
      lastTap.current = { time: 0, x: 0, y: 0 }
      return
    }
    lastTap.current = { time: now, x: event.clientX, y: event.clientY }
  }

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
    <div className={cn('relative flex min-h-0 min-w-0 flex-1 flex-col', className)}>
      <div
        ref={scrollRef}
        data-scroller="document"
        /*
          A focus stop, because this scrolls and a scrollable area a keyboard
          cannot reach is one a keyboard user cannot read. Tab lands here and
          the arrow keys, Page Up/Down, Home and End then work — all native, no
          key handler. It is labelled because it is a stop on the tab order and
          "group" alone tells a screen-reader user nothing about what they have
          landed on.
        */
        tabIndex={0}
        role="group"
        aria-label="Document pages, scrollable"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          handlePointerUpTap(event)
          endPointer(event)
        }}
        onPointerCancel={endPointer}
        // `pan-x pan-y` keeps one-finger scrolling native and takes pinch away
        // from the browser, which would otherwise zoom the whole app. That is
        // the distinction the reader is making with the gesture: this document,
        // not this page.
        // Both axes named separately rather than `overflow-auto`: the layout
        // suite selects this element by its vertical-scroll class, which is the
        // honest description of what it is when nothing is zoomed.
        className="min-h-0 min-w-0 flex-1 touch-pan-x touch-pan-y overflow-x-auto overflow-y-auto overscroll-contain bg-muted/40"
      >
        {/*
          The pinch transform lives on a wrapper, because `<Document>` takes no
          style of its own. `will-change` keeps the scaling on the compositor,
          which is the whole reason a gesture uses a transform rather than the
          real width.
        */}
        <div
          style={
            pinchScale === 1
              ? undefined
              : {
                  transform: `scale(${pinchScale})`,
                  transformOrigin: `${pinchOrigin.x}px ${pinchOrigin.y}px`,
                  willChange: 'transform',
                }
          }
        >
        <Document
          file={url}
          onLoadSuccess={() => setPagesMounted(true)}
          loading={<ViewerMessage>Loading the document…</ViewerMessage>}
          error={<ViewerMessage>The document could not be displayed.</ViewerMessage>}
          noData={<ViewerMessage>No document to display.</ViewerMessage>}
          // `min-w-max` so a page wider than the panel can be panned to rather
          // than clipped: centring a flex item that overflows puts its left edge
          // out of reach.
          className="flex min-w-max flex-col items-center gap-6 py-6"
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
                devicePixelRatio={rasterRatio}
                renderAnnotationLayer={false}
                renderTextLayer
                // The text layer mounts either way; only the canvas is windowed.
                // Find needs the text layer everywhere; memory needs the canvas
                // only near the viewport.
                renderMode={
                  Math.abs(page.page_num - nearPage) <= canvasWindow ? 'canvas' : 'none'
                }
                loading=""
              />
            )}
          </div>
        ))}
        </Document>
        </div>
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
        data-readout={`${nearPage} / ${pages.length}`}
        className={cn(
          'readout pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2',
          'rounded-full bg-paper-chip px-3 py-1.5 text-xs font-medium text-paper-chip-text tabular-nums shadow-lg',
          'transition-opacity motion-reduce:transition-none',
          scrolling ? 'opacity-100 duration-150' : 'opacity-0 duration-600',
        )}
      >
      </div>
    </div>
  )
}

function ViewerMessage({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-sm text-muted-foreground">{children}</p>
}
