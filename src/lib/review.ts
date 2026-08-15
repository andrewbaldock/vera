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
 * Numbers every issue by page order, and returns them in it.
 *
 * The number has to be stable, because it appears in two places at the same
 * time — beside the row in the list and on the marker over the document. If it
 * were the row's index it would change when the list is re-sorted by severity,
 * and the two would disagree in front of the user.
 *
 * Returning page order too is not a separate favour: it is what every caller
 * wants, it is the list's documented default, and computing the order here and
 * then throwing it away only invites the caller to re-sort — which is one more
 * place for the order to quietly diverge from the numbering.
 */
export function numberByPage(issues: Issue[]): NumberedIssue[] {
  return [...issues]
    .sort((a, b) => a.page - b.page)
    .map((issue, index) => ({ ...issue, number: index + 1 }))
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

/** How the list is ordered. Page order is the default; see below. */
export type SortMode = 'page' | 'severity'

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, major: 1, minor: 2 }

/**
 * Order the list without touching the numbering.
 *
 * The number stays attached to its issue no matter how the rows are arranged —
 * that is `numberByPage`'s job, and it matters because the same number appears
 * beside the row and against the document. Sorting rearranges rows; it must
 * never renumber them.
 *
 * Page order is the default because that is the order the document is worked
 * through when someone goes to fix things. Severity order answers a different
 * question — *what is worst* — and the verdict above the list already answers
 * *what is blocking*, so this is a convenience rather than the main event.
 *
 * Severity sort falls back to page order within a severity, so the ordering is
 * total and stable rather than dependent on the input order.
 */
export function sortIssues(issues: NumberedIssue[], mode: SortMode): NumberedIssue[] {
  if (mode === 'page') return [...issues].sort((a, b) => a.page - b.page || a.number - b.number)
  return [...issues].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.page - b.page || a.number - b.number,
  )
}

/**
 * Hide whole severities from the list.
 *
 * Only ever applied to what the list renders. The verdict is computed from the
 * whole review and stays true while this is on — which is the point: you can
 * hide the thirteen minors to concentrate on what is blocking, and the summary
 * still says there are thirteen of them.
 */
export function visibleIssues(
  issues: NumberedIssue[],
  hidden: ReadonlySet<Severity>,
): NumberedIssue[] {
  return hidden.size === 0 ? issues : issues.filter((issue) => !hidden.has(issue.severity))
}
