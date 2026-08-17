import type { Issue, Review, Severity } from '@/types/review'

/**
 * The rules of the product, as pure functions over the review data. Kept out of
 * any component so the submit rule can be reasoned about and tested on its own.
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
 * The submit rule. Derived from the review data alone, never from anything the user
 * asserts in the UI. Resolution happens outside this app: the user regenerates
 * the document in their own system and uploads a new version, so the only proof
 * an issue was fixed is a new review that no longer reports it. This must never
 * consult the "I've handled this" checkboxes.
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
 * The number appears in two places at once, beside the row in the list and on
 * the marker over the document, so it cannot be the row index: that would change
 * when the list is re-sorted by severity and the two would disagree. Page order
 * comes back with the numbering because re-sorting at the call site is where the
 * order would diverge from it.
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

/** How the list is ordered. Page order is the default. */
export type SortMode = 'page' | 'severity'

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, major: 1, minor: 2 }

/**
 * Order the list without touching the numbering. Sorting rearranges rows; it
 * must never renumber them, because the same number labels the marker on the
 * document.
 *
 * Page order is the default because that is the order the document is worked
 * through. Severity order answers *what is worst*, which the verdict above the
 * list already covers for *what is blocking*. Severity sort falls back to page
 * order within a severity, so the ordering is total rather than dependent on
 * input order.
 */
export function sortIssues(
  issues: NumberedIssue[],
  mode: SortMode,
  done: ReadonlySet<string> = new Set(),
): NumberedIssue[] {
  // Page order is a map of the document, so a handled issue keeps its place —
  // moving it would misdescribe where things are. Severity order is a worklist,
  // so anything already handled sinks: what is left to do belongs at the top.
  if (mode === 'page') return [...issues].sort((a, b) => a.page - b.page || a.number - b.number)
  return [...issues].sort(
    (a, b) =>
      Number(done.has(a.id)) - Number(done.has(b.id)) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.page - b.page ||
      a.number - b.number,
  )
}

/**
 * Hide whole severities from the list. Applied only to what the list renders:
 * the verdict is computed from the whole review, so hiding the thirteen minors
 * still leaves the summary reporting thirteen of them.
 */
export function visibleIssues(
  issues: NumberedIssue[],
  hidden: ReadonlySet<Severity>,
  options: { done?: ReadonlySet<string>; hideDone?: boolean } = {},
): NumberedIssue[] {
  const { done, hideDone } = options
  return issues.filter((issue) => {
    if (hidden.has(issue.severity)) return false
    if (hideDone && done?.has(issue.id)) return false
    return true
  })
}
