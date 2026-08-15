import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { DocumentsPage } from '@/components/DocumentsPage'
import { ReviewPage } from '@/components/ReviewPage'

/**
 * Two real routes, and the spike.
 *
 * A router rather than a hand-rolled `pushState`, for the same reason the build
 * uses shadcn instead of hand-rolled components and react-pdf instead of raw
 * pdf.js: use the library when one exists, and build it yourself only when
 * nothing covers it. Writing a router for two routes is the same mistake as
 * writing a pdf.js binding — and this page is one screen of four in the spec's
 * own flow, so the second and third routes are not hypothetical.
 *
 * `/documents` is the canonical list. `/` redirects rather than duplicating it,
 * so there is one URL per thing.
 *
 * The `?demo` spike is lazily loaded: react-pdf and pdf.js are ~420 KB, and a
 * view nobody opens should not be on anybody's critical path.
 */
const ReactPdfDemo = lazy(async () => ({
  default: (await import('@/demo/ReactPdfDemo')).ReactPdfDemo,
}))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/documents" replace />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/reviews/:documentId" element={<ReviewPage />} />
        <Route
          path="/demo"
          element={
            <Suspense
              fallback={<p className="p-6 text-sm text-muted-foreground">Loading the spike…</p>}
            >
              <ReactPdfDemo />
            </Suspense>
          }
        />
        {/* Anything else is a typo, not a page. Send it somewhere real. */}
        <Route path="*" element={<Navigate to="/documents" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
