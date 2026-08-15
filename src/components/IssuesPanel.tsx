import { ArrowDownWideNarrow, Check, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeverityDot } from '@/components/severity'
import { SEVERITY_LABEL, SEVERITY_TEXT } from '@/lib/severity'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NumberedIssue, SortMode } from '@/lib/review'

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

const SORT_LABEL: Record<SortMode, string> = {
  page: 'Page order',
  severity: 'Severity',
}

interface IssuesPanelProps {
  issues: NumberedIssue[]
  /** Before filtering — so an empty list can say whether it is empty or hidden. */
  totalCount: number
  focusedPage: number
  onSeek: (page: number) => void
  sort: SortMode
  onSortChange: (sort: SortMode) => void
  done: ReadonlySet<string>
  onToggleDone: (issueId: string) => void
  onClearDone: () => void
}

export function IssuesPanel({
  issues,
  totalCount,
  focusedPage,
  onSeek,
  sort,
  onSortChange,
  done,
  onToggleDone,
  onClearDone,
}: IssuesPanelProps) {
  return (
    <>
      {/* Three slots so the sort control sits centred regardless of how long
          the count text on the left happens to be. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-3 py-1.5">
        <p className="text-xs text-muted-foreground tabular-nums">
          {issues.length === totalCount
            ? `${totalCount} ${totalCount === 1 ? 'issue' : 'issues'}`
            : `${issues.length} of ${totalCount} shown`}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="min-h-8 gap-1.5 px-2 text-xs">
              <ArrowDownWideNarrow className="size-3.5" aria-hidden />
              {SORT_LABEL[sort]}
              <span className="sr-only">Change sort order</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            {(Object.keys(SORT_LABEL) as SortMode[]).map((mode) => (
              <DropdownMenuItem key={mode} onSelect={() => onSortChange(mode)} className="gap-6">
                <span className="flex-1">{SORT_LABEL[mode]}</span>
                {mode === sort && <Check className="size-4" aria-hidden />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" aria-hidden />
                <span className="sr-only">List options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={done.size === 0} onSelect={onClearDone}>
                Clear all done
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {issues.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {totalCount === 0
            ? 'No issues were found in this document.'
            : 'Every severity is hidden. Turn one back on above.'}
        </p>
      )}

      <ul aria-label="Issues" className="divide-y">
      {issues.map((issue) => {
        const onFocusedPage = issue.page === focusedPage
        const isDone = done.has(issue.id)
        return (
          // The checkbox is a sibling of the row button, never inside it —
          // nesting one interactive control in another is invalid, and it would
          // mean ticking something off also navigated you away from it.
          <li
            key={issue.id}
            className={cn(
              'relative flex items-start transition-colors',
              onFocusedPage && 'bg-focus-tint',
              isDone && 'opacity-60',
            )}
          >
            <button
              type="button"
              onClick={() => onSeek(issue.page)}
              aria-current={onFocusedPage ? 'page' : undefined}
              className={cn(
                'relative flex min-h-11 flex-1 items-start gap-3 py-3 ps-4 pe-2 text-left transition-colors',
                'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                'hover:bg-accent/60 active:bg-accent',
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
                <span className="mt-1.5 block text-xs font-medium">
                  <span className={SEVERITY_TEXT[issue.severity]}>
                    {SEVERITY_LABEL[issue.severity]}
                  </span>
                  <span className="text-muted-foreground"> · Page {issue.page}</span>
                </span>
              </span>
            </button>

            <label
              className={cn(
                'flex min-h-11 shrink-0 cursor-pointer select-none items-center gap-2 self-stretch py-3 pe-4 ps-2 text-xs',
                'text-muted-foreground hover:text-foreground',
              )}
            >
              <Checkbox
                checked={isDone}
                onCheckedChange={() => onToggleDone(issue.id)}
                aria-label={`Mark "${issue.title}" done`}
              />
              <span aria-hidden>Done</span>
            </label>
          </li>
        )
      })}
      </ul>
    </>
  )
}
