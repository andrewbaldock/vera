import type { Review } from '@/types/review'

/**
 * Submission, persisted on the device.
 *
 * There is no backend to accept a submission, so it is recorded locally and
 * layered over the fixture when the review loads. That is deliberately more
 * than a boolean in component state: `status: 'submitted'` is a value the API
 * can already return, so the page has to render a submitted review on a cold
 * load with no click involved. Persisting it here means the demo exercises the
 * real path — reload the page and it is still submitted, because that is what
 * would happen with a real endpoint.
 *
 * Keyed by review id and version. A new version is a new review to look at, and
 * inheriting the previous version's submission would be wrong in the one
 * direction that matters: it would show a gate as closed when it isn't.
 */

export interface Submission {
  /** ISO timestamp. */
  at: string
  by: string
}

function key(review: Pick<Review, 'id' | 'version'>): string {
  return `undirt.submitted.${review.id}.v${review.version}`
}

export function readSubmission(review: Pick<Review, 'id' | 'version'>): Submission | null {
  try {
    const raw = localStorage.getItem(key(review))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Submission).at === 'string' &&
      typeof (parsed as Submission).by === 'string'
    ) {
      return parsed as Submission
    }
    return null
  } catch {
    // Safari in private browsing throws on localStorage, and a corrupt value
    // should not take the page down. An unsubmitted review is the safe default:
    // it shows the gate, which is the state that asks for a decision.
    return null
  }
}

export function writeSubmission(review: Review, submission: Submission): void {
  try {
    localStorage.setItem(key(review), JSON.stringify(submission))
  } catch {
    // Nothing to do. The in-memory state still updates, so the flow completes;
    // it just won't survive a reload.
  }
}

export function clearSubmission(review: Pick<Review, 'id' | 'version'>): void {
  try {
    localStorage.removeItem(key(review))
  } catch {
    // Same as above.
  }
}

/** The review as the API would return it once submitted. */
export function asSubmitted(review: Review): Review {
  return { ...review, status: 'submitted' }
}
