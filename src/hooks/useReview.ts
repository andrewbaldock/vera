import { useEffect, useState } from 'react'
import type { Review } from '@/types/review'

/**
 * The mock stands in for an endpoint that doesn't exist yet.
 *
 * It's fetched over HTTP rather than imported, so the async boundary is real
 * and the loading and error states are honest instead of theatre.
 */
const REVIEW_URL = '/review_mock.json'

/**
 * The supplied mock points `pdf_url` at example.com. We substitute the local
 * file here, at the boundary, rather than editing the fixture — the fixture
 * stays a faithful copy of what we were given, and the substitution stays
 * visible in code where it can be explained.
 */
const LOCAL_PDF_URL = '/docs/example_document.pdf'

export type ReviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; review: Review }

function withLocalPdf(review: Review): Review {
  return {
    ...review,
    document: { ...review.document, pdf_url: LOCAL_PDF_URL },
  }
}

export function useReview(): ReviewState {
  const [state, setState] = useState<ReviewState>({ status: 'loading' })

  useEffect(() => {
    // Guards against setting state after unmount, and against a slow first
    // response landing on top of a faster second one.
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(REVIEW_URL, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`)
        }
        const review = (await response.json()) as Review
        setState({ status: 'ready', review: withLocalPdf(review) })
      } catch (error) {
        if (controller.signal.aborted) return
        const message =
          error instanceof Error ? error.message : 'Could not load the review.'
        setState({ status: 'error', message })
      }
    }

    load()
    return () => controller.abort()
  }, [])

  return state
}
