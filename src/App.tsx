import { Suspense, lazy } from 'react'
import { ReviewPage } from '@/components/ReviewPage'

/**
 * `?demo` keeps the react-pdf spike reachable.
 *
 * It proved the four viewer behaviours the real one depends on, so it stays as
 * evidence rather than being deleted once the app exists. One line reading the
 * query string is cheaper than a router for a single alternate view.
 *
 * Lazily, though. A static import is cheaper in *code* and much more expensive
 * in *bytes*: react-pdf plus pdf.js is ~450 KB that every real user downloads
 * for a view none of them will open, and its worker is configured at module
 * scope, so merely importing it does work on every page load.
 */
const ReactPdfDemo = lazy(async () => ({
  default: (await import('@/demo/ReactPdfDemo')).ReactPdfDemo,
}))

export default function App() {
  if (new URLSearchParams(window.location.search).has('demo')) {
    return (
      <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading the spike…</p>}>
        <ReactPdfDemo />
      </Suspense>
    )
  }
  return <ReviewPage />
}
