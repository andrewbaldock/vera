import type { Issue, Review, Severity } from '@/types/review'

/**
 * The rules of the product, as pure functions over the review data.
 *
 * These are deliberately separate from any component: the gate is the thing
 * most worth being able to point at, reason about and test on its own.
 */

/** Critical and major must be resolved before submitting. Minor may be ignored. */
const BLOCKING: readonly Severity[] = ['critical', 'major']

export function isBlocking(issue: Issue): boolean {
  return BLOCKING.includes(issue.severity)
}

export function blockingIssues(issues: Issue[]): Issue[] {
  return issues.filter(isBlocking)
}

/**
 * The gate.
 *
 * Derived from the review data alone, and never from anything the user asserts
 * in the UI. Resolution happens outside this app — the user regenerates the
 * document in their own system and uploads a new version — so the only proof
 * that something was fixed is a new review that no longer reports it.
 *
 * Nothing here may ever consult the "I've handled this" checkboxes.
 */
export function canSubmit(review: Review): boolean {
  return blockingIssues(review.issues).length === 0
}

export type SeverityCounts = Record<Severity, number>

export function countBySeverity(issues: Issue[]): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, major: 0, minor: 0 }
  for (const issue of issues) {
    counts[issue.severity] += 1
  }
  return counts
}

export interface NumberedIssue extends Issue {
  /** Position in page order. Stable regardless of how the list is sorted. */
  number: number
}

/**
 * Numbers every issue by page order, once.
 *
 * The number has to be stable, because it appears in two places at the same
 * time — beside the row in the list and on the marker over the document. If it
 * were the row's index it would change when the list is re-sorted by severity,
 * and the two would disagree in front of the user.
 */
export function numberByPage(issues: Issue[]): NumberedIssue[] {
  const inPageOrder = [...issues].sort((a, b) => a.page - b.page)
  const numbers = new Map(inPageOrder.map((issue, index) => [issue.id, index + 1]))

  return issues.map((issue) => ({
    ...issue,
    number: numbers.get(issue.id) ?? 0,
  }))
}

/** Issues keyed by the page they appear on, for the status bar and the strip. */
export function groupByPage(issues: NumberedIssue[]): Map<number, NumberedIssue[]> {
  const byPage = new Map<number, NumberedIssue[]>()
  for (const issue of issues) {
    const existing = byPage.get(issue.page)
    if (existing) {
      existing.push(issue)
    } else {
      byPage.set(issue.page, [issue])
    }
  }
  return byPage
}
