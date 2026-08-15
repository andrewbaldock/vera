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

/**
 * A cast is a promise, not a check.
 *
 * The whole argument for this app is that it isn't overfitted to the mock —
 * hand it a different payload and it behaves correctly. That argument needs a
 * boundary that actually looks. Without one, `issues: null` sails past the
 * error state that exists for exactly this and dies later inside a render,
 * and an unrecognised severity degrades *silently* into an uncoloured dot and
 * a count that reads NaN.
 *
 * Hand-written rather than a schema library: it is twenty lines, it needs no
 * dependency, and every line of it is explainable.
 */
const SEVERITIES = ['critical', 'major', 'minor']
const STATUSES = ['created', 'processing', 'on_review', 'submitted']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isReview(value: unknown): value is Review {
  if (!isRecord(value)) return false
  const { id, name, uploaded_at, status, version, document, user, issues } = value

  if (typeof id !== 'string' || typeof name !== 'string' || typeof uploaded_at !== 'string') {
    return false
  }
  if (typeof version !== 'number' || typeof status !== 'string' || !STATUSES.includes(status)) {
    return false
  }
  if (!isRecord(user) || typeof user.first_name !== 'string' || typeof user.last_name !== 'string') {
    return false
  }
  if (!isRecord(document) || typeof document.pdf_url !== 'string') return false
  if (!Array.isArray(document.pages) || document.pages.length === 0) return false
  if (
    !document.pages.every(
      (page) =>
        isRecord(page) &&
        typeof page.page_num === 'number' &&
        typeof page.width === 'number' &&
        typeof page.height === 'number' &&
        page.width > 0 &&
        page.height > 0,
    )
  ) {
    return false
  }

  return (
    Array.isArray(issues) &&
    issues.every(
      (issue) =>
        isRecord(issue) &&
        typeof issue.id === 'string' &&
        typeof issue.title === 'string' &&
        typeof issue.description === 'string' &&
        typeof issue.page === 'number' &&
        typeof issue.severity === 'string' &&
        SEVERITIES.includes(issue.severity),
    )
  )
}

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
        const payload: unknown = await response.json()
        if (!isReview(payload)) {
          throw new Error('The review data was not in the expected shape.')
        }
        setState({ status: 'ready', review: withLocalPdf(payload) })
      } catch (error) {
        if (controller.signal.aborted) return
        // Raw parser output ("Unexpected token '<'…") tells a reviewer nothing
        // and looks like a crash. The real message goes to the console for us.
        if (error instanceof Error) console.error('Failed to load review:', error)
        setState({ status: 'error', message: 'The review could not be loaded.' })
      }
    }

    load()
    return () => controller.abort()
  }, [])

  return state
}
