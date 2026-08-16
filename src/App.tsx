import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { DocumentsPage } from '@/components/DocumentsPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ReviewPage } from '@/components/ReviewPage'
import { UiScaleProvider } from '@/hooks/useUiScale'

/**
 * Three routes: the queue, a review, and the viewer harness.
 *
 * A router rather than a hand-rolled `pushState`, for the same reason the build
 * uses shadcn over hand-rolled components and react-pdf over raw pdf.js: use the
 * library when one exists. This page is one screen of four in the spec's flow,
 * so more routes are coming.
 *
 * `/documents` is the canonical list. `/` redirects rather than duplicating it,
 * so there is one URL per thing.
 *
 * `/demo` is lazily loaded: react-pdf and pdf.js are ~420 KB, and a view nobody
 * opens should not sit on everybody's critical path.
 */
const ReactPdfDemo = lazy(async () => ({
  default: (await import('@/demo/ReactPdfDemo')).ReactPdfDemo,
}))

export default function App() {
  return (
    // Outside the router: without a boundary anywhere, React unmounts the whole
    // tree on any uncaught error and leaves the background color and nothing
    // else — content that flashes and then vanishes, with no console on a
    // tablet to say why.
    <ErrorBoundary>
      {/* Above the router: the size preference belongs to the whole app, and
          the thumb strip reads the value rather than only the CSS. */}
      <UiScaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/documents" replace />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/reviews/:documentId" element={<ReviewPage />} />
            <Route
              path="/demo"
              element={
                <Suspense
                  fallback={
                    <p className="p-6 text-sm text-muted-foreground">Loading the harness…</p>
                  }
                >
                  <ReactPdfDemo />
                </Suspense>
              }
            />
            {/* Anything else is a typo, not a page. Send it somewhere real. */}
            <Route path="*" element={<Navigate to="/documents" replace />} />
          </Routes>
        </BrowserRouter>
      </UiScaleProvider>
    </ErrorBoundary>
  )
}
