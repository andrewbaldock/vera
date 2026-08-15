import { cn } from '@/lib/utils'
import { SeverityDot } from '@/components/severity'
import { SEVERITY_LABEL } from '@/lib/severity'
import type { NumberedIssue } from '@/lib/review'

/**
 * The list, and only the list.
 *
 * The verdict deliberately isn't in here. It has to be derived from the whole
 * review while this component renders a *view* of the issues — sorted, and
 * shortly filtered — and a verdict computed from the view would under-report
 * the moment anything is hidden. Keeping them apart makes that mistake
 * impossible rather than merely unlikely.
 *
 * The list never scrolls itself. Rows on the focused page are tinted, but if
 * they are out of view they stay out of view: this panel belongs to the user,
 * who scrolled it where they wanted it. Moving it under them because the
 * document moved is the thing that makes a panel feel possessed. The status
 * bar above the document still names the issues on the page, so nothing is
 * actually lost.
 */

interface IssuesPanelProps {
  issues: NumberedIssue[]
  focusedPage: number
  onSeek: (page: number) => void
}

export function IssuesPanel({ issues, focusedPage, onSeek }: IssuesPanelProps) {
  return (
    <ul aria-label="Issues" className="divide-y">
      {issues.map((issue) => {
        const onFocusedPage = issue.page === focusedPage
        return (
          <li key={issue.id}>
            <button
              type="button"
              onClick={() => onSeek(issue.page)}
              aria-current={onFocusedPage ? 'page' : undefined}
              className={cn(
                'relative flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                'hover:bg-accent/60 active:bg-accent',
                onFocusedPage && 'bg-focus-tint hover:bg-focus-tint',
              )}
            >
              {/* Not color alone: the focused rows carry an edge marker too. */}
              {onFocusedPage && (
                <span className="absolute inset-y-0 left-0 w-[3px] bg-focus-edge" aria-hidden />
              )}
              <SeverityDot severity={issue.severity} className="mt-1.5" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  <span className="tabular-nums text-muted-foreground">{issue.number}</span>{' '}
                  {issue.title}
                </span>
                {/*
                  The description is the actual finding — "Effective Date
                  Mismatch" names the problem, but only this says the cover page
                  reads 03/10/2025 while page 3 reads 01/15/2024.
                  Shown in full, not truncated: these run two or three lines and
                  the decisive detail is usually the last clause, so clamping
                  would hide precisely the part worth reading. Twenty-five rows
                  is a scroll, not a problem.
                */}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {issue.description}
                </span>
                <span className="mt-1.5 block text-xs font-medium text-muted-foreground">
                  {SEVERITY_LABEL[issue.severity]} · Page {issue.page}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
