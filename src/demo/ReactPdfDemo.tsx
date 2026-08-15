import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { useReview } from '@/hooks/useReview'

/**
 * A standalone harness for react-pdf. Not product code — deliberately
 * unstyled, self-contained, and kept.
 *
 * It was written before the viewer to prove the four behaviors the real one
 * depends on, while none of them were load-bearing yet:
 *
 *   1. Every page renders, with a text layer, all mounted at once.
 *   2. Native CMD+F finds text on pages that are far off screen.
 *   3. We can jump to an arbitrary page (issue click -> that issue's page).
 *   4. We can tell which page is currently in view (status bar + strip).
 *
 * All four work. Getting there surfaced three problems that would have been
 * far more expensive to meet inside a finished layout — see "Three things the
 * viewer spike taught us" in docs/DESIGN.md:
 *
 *   - Overlays must clear react-pdf's z-index 2/3, or invisible text layers
 *     silently swallow every click.
 *   - Page heights must be reserved from the API's dimensions before the
 *     canvases paint, or scroll targets land in the wrong place.
 *   - "Which page am I on" is a measurement, not an IntersectionObserver.
 *
 * Kept rather than deleted: it's the cheapest way to isolate a viewer problem
 * from the rest of the app, and it's the evidence that the riskiest part of
 * the build was tested rather than assumed.
 */

// The worker must be the exact version react-pdf pins (pdfjs-dist 5.4.296).
// Resolving it through import.meta.url lets Vite bundle the file it actually
// installed, rather than trusting a CDN copy to match.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const PDF_URL = '/docs/example_document.pdf'
const PAGE_WIDTH = 700

const buttonStyle: React.CSSProperties = {
  cursor: 'pointer',
  padding: '6px 12px',
  border: '1px solid #999',
  borderRadius: 6,
  background: '#f4f4f5',
  font: 'inherit',
  lineHeight: 1.2,
}

export function ReactPdfDemo() {
  const [pageCount, setPageCount] = useState(0)
  const [visiblePage, setVisiblePage] = useState(1)
  const [firstPageSize, setFirstPageSize] = useState<string>('—')
  const [jumpTo, setJumpTo] = useState('30')

  // The API's per-page dimensions, used to reserve each page's height before
  // its canvas paints. Without this the document has almost no height while it
  // renders, so scrolling to page 30 lands near the top and then everything
  // grows underneath you. This is what those height/width fields are *for*.
  const review = useReview()
  const apiPages = review.status === 'ready' ? review.review.document.pages : []

  // One entry per page wrapper, so we can both scroll to a page and measure it.
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  const [debug, setDebug] = useState('—')

  /**
   * Absolute scroll rather than scrollIntoView, so the sticky-toolbar offset is
   * explicit rather than relying on scroll-margin.
   *
   * Smooth by default — moving the page under someone tells them *where* they
   * went, which a hard jump doesn't. But honor prefers-reduced-motion: for
   * some people a long smooth scroll is nauseating, not helpful.
   */
  const scrollToPage = useCallback((page: number) => {
    const element = pageRefs.current[page - 1]
    if (!element) {
      setDebug(`page ${page}: no element (refs: ${pageRefs.current.length})`)
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const top = element.getBoundingClientRect().top + window.scrollY - 150

    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
    setDebug(`page ${page} · target ${Math.round(top)}${reduceMotion ? ' (reduced motion)' : ''}`)
  }, [])

  /**
   * Which page am I looking at?
   *
   * Measured against a "reading line" just below the toolbar: the current page
   * is the last one whose top has scrolled past it. Deterministic, and it holds
   * for a page taller than the viewport.
   *
   * An IntersectionObserver was the first attempt and was wrong here. Its
   * entries only fire when a threshold is *crossed*, so pages that are far away
   * keep whatever ratio they last reported, and a page taller than the viewport
   * can never reach the higher thresholds at all — the answer got stuck after
   * the first scroll.
   */
  useEffect(() => {
    if (pageCount === 0) return

    const READING_LINE = 200
    let frame = 0

    const measure = () => {
      frame = 0
      let current = 1
      for (let index = 0; index < pageRefs.current.length; index += 1) {
        const element = pageRefs.current[index]
        if (!element) continue
        // Pages are in document order, so the first one still below the line
        // means every later page is too.
        if (element.getBoundingClientRect().top > READING_LINE) break
        current = index + 1
      }
      setVisiblePage(current)
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pageCount])

  return (
    <div style={{ font: '14px/1.5 system-ui', padding: 16 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          // Must clear react-pdf's layers, which set their own stacking:
          //   .textLayer       { z-index: 2 }
          //   .annotationLayer { z-index: 3 }
          // At an equal z-index the pages win on DOM order and their invisible
          // text spans cover this bar — it still *looks* fine, but every click
          // lands on the text layer instead of the buttons.
          zIndex: 10,
          background: '#fff',
          borderBottom: '1px solid #ddd',
          padding: '12px 0',
          marginBottom: 16,
        }}
      >
        <strong>react-pdf demo</strong> — pages loaded: <b>{pageCount || '…'}</b> · page in
        view: <b>{visiblePage}</b> · first page size: <b>{firstPageSize}</b> · API dims:{' '}
        <b>{review.status === 'ready' ? `${apiPages.length} pages` : review.status}</b>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => scrollToPage(Math.max(1, visiblePage - 1))}
          >
            ← prev
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => scrollToPage(Math.min(pageCount, visiblePage + 1))}
          >
            next →
          </button>
          <input
            value={jumpTo}
            onChange={(event) => setJumpTo(event.target.value)}
            style={{
              width: 64,
              padding: '6px 8px',
              border: '1px solid #999',
              borderRadius: 6,
              font: 'inherit',
            }}
            aria-label="Page number"
          />
          <button type="button" style={buttonStyle} onClick={() => scrollToPage(Number(jumpTo) || 1)}>
            jump to page
          </button>
          <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>{debug}</span>
        </div>
        <p style={{ margin: '10px 0 0', color: '#555' }}>
          <b>Test 1 — whole-document find:</b> scroll to a late page, pick a word off it,
          then press <kbd>⌘F</kbd> and search for it. It should highlight without you
          scrolling back.
          <br />
          <b>Test 2 — text layer alignment:</b> select text on page 20+ by dragging. The
          selection should sit on the glyphs, not offset from them.
          <br />
          <b>Test 3 — jump:</b> the controls above. <b>Test 4 — page in view:</b> the
          readout above should track as you scroll.
        </p>
      </div>

      <Document
        file={PDF_URL}
        onLoadSuccess={(pdf) => setPageCount(pdf.numPages)}
        onLoadError={(error) => console.error('PDF load failed', error)}
        loading="Loading document…"
      >
        {Array.from({ length: pageCount }, (_, index) => {
          const pageNumber = index + 1
          const apiPage = apiPages[index]
          // Reserve the right height up front. Falls back to US Letter if the
          // API hasn't answered yet.
          const ratio = apiPage ? apiPage.height / apiPage.width : 792 / 612

          return (
            <div
              key={pageNumber}
              data-page={pageNumber}
              ref={(element) => {
                pageRefs.current[index] = element
              }}
              style={{
                marginBottom: 24,
                minHeight: PAGE_WIDTH * ratio,
                // Clears the sticky toolbar when we scroll a page into view.
                scrollMarginTop: 150,
              }}
            >
              <div style={{ color: '#888', fontSize: 12 }}>page {pageNumber}</div>
              <Page
                pageNumber={pageNumber}
                width={PAGE_WIDTH}
                renderTextLayer
                renderAnnotationLayer={false}
                onLoadSuccess={(page) => {
                  if (pageNumber === 1) {
                    setFirstPageSize(`${page.originalWidth} × ${page.originalHeight}`)
                  }
                }}
              />
            </div>
          )
        })}
      </Document>
    </div>
  )
}
