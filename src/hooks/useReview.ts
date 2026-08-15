import { useCallback, useEffect, useState } from 'react'
import type { Review } from '@/types/review'
import {
  asSubmitted,
  clearSubmission,
  readSubmission,
  writeSubmission,
  type Submission,
} from '@/lib/submission'

/**
 * The mock stands in for an endpoint that doesn't exist yet. Fetched over HTTP
 * rather than imported, so the async boundary is real and the loading and error
 * states are not theater.
 *
 * Which fixture to load is a *version*, not a query string. Not `?fixture=clean`:
 * the supplied mock can only demonstrate the blocked half of the gate, and two
 * versions of one document show the other half without a demo-only param. v2 is
 * the supplied review, v3 the same report re-uploaded with the blockers
 * resolved.
 *
 * The gate never consults any of this. `canSubmit` reads the review's issues and
 * nothing else; a different version just gives it different issues.
 */

/**
 * The substitution happens here, at the boundary. The path itself lives in
 * `lib/documents` with the rest of the catalog, because the documents list draws
 * a cover from it without ever loading a review.
 */
import { LOCAL_PDF_URL } from '@/lib/documents'

export type ReviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; review: Review; submission: Submission | null }

export interface UseReview {
  state: ReviewState
  /** Records the submission and flips the review's status. One-way. */
  submit: () => void
  /**
   * Undoes it, for the documents list, so the gate can be demonstrated more than
   * once. Not a product feature: there is no reopened status in the enum and no
   * un-submit in the spec's flow.
   */
  clear: () => void
}

/**
 * A cast is a promise, not a check. This app is not overfitted to the mock, so
 * the boundary has to look at what arrives. Without it, `issues: null` sails
 * past the error state that exists for exactly this and dies later inside a
 * render, and an unrecognized severity degrades silently into an uncolored dot
 * and a count that reads NaN.
 *
 * Hand-written rather than a schema library: twenty lines and no dependency.
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

export function useReview(url: string): UseReview {
  const [state, setState] = useState<ReviewState>({ status: 'loading' })

  useEffect(() => {
    // Guards against setting state after unmount, and against a slow first
    // response landing on top of a faster second one.
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`)
        }
        const payload: unknown = await response.json()
        if (!isReview(payload)) {
          throw new Error('The review data was not in the expected shape.')
        }
        // The stored submission is layered over the fixture, so a submitted
        // review renders as submitted on a cold load, as a real endpoint
        // returning status: 'submitted' would.
        const review = withLocalPdf(payload)
        const submission = readSubmission(review)
        setState({
          status: 'ready',
          review: submission ? asSubmitted(review) : review,
          submission,
        })
      } catch (error) {
        if (controller.signal.aborted) return
        // Raw parser output ("Unexpected token '<'…") tells a reviewer nothing
        // and looks like a crash. The real message goes to the console.
        if (error instanceof Error) console.error('Failed to load review:', error)
        setState({ status: 'error', message: 'The review could not be loaded.' })
      }
    }

    // Re-runs when the version changes.
    setState({ status: 'loading' })
    load()
    return () => controller.abort()
  }, [url])

  const submit = useCallback(() => {
    setState((previous) => {
      if (previous.status !== 'ready' || previous.review.status === 'submitted') return previous
      const submission: Submission = {
        at: new Date().toISOString(),
        by: `${previous.review.user.first_name} ${previous.review.user.last_name}`,
      }
      writeSubmission(previous.review, submission)
      return { status: 'ready', review: asSubmitted(previous.review), submission }
    })
  }, [])

  const clear = useCallback(() => {
    setState((previous) => {
      if (previous.status !== 'ready') return previous
      clearSubmission(previous.review)
      return {
        status: 'ready',
        review: { ...previous.review, status: 'on_review' },
        submission: null,
      }
    })
  }, [])

  return { state, submit, clear }
}
