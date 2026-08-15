import { useCallback, useRef, useState } from 'react'
import { ArrowDownWideNarrow, Check, MoreVertical, StickyNote } from 'lucide-react'
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
  notes: Readonly<Record<string, string>>
  onNoteChange: (issueId: string, text: string) => void
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
  notes,
  onNoteChange,
}: IssuesPanelProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const gridRef = useRef<HTMLUListElement>(null)
  /**
   * Which cell owns the tab stop.
   *
   * Tracked rather than derived from `document.activeElement` so the list keeps
   * its place when focus leaves and comes back — returning to a list and
   * landing on row one again is its own small insult.
   */
  const [active, setActive] = useState({ row: 0, col: 0 })

  const moveTo = useCallback(
    (row: number, col: number) => {
      const clampedRow = Math.max(0, Math.min(issues.length - 1, row))
      const clampedCol = Math.max(0, Math.min(1, col))
      const cell = gridRef.current?.querySelector<HTMLElement>(
        `[data-cell="${clampedRow}-${clampedCol}"]`,
      )
      if (!cell) return false
      setActive({ row: clampedRow, col: clampedCol })
      // Focus directly rather than through an effect: an effect would steal
      // focus on mount and every time the list re-sorts.
      cell.focus()
      return true
    },
    [issues.length],
  )

  const onGridKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Read the current cell from the DOM rather than from state. Focus is the
      // truth here, and it can move without going through `moveTo` — a click,
      // a browser restoring focus, a re-render between two fast keystrokes.
      // Deriving it removes a whole class of "the handler was one render
      // behind" bug rather than trying to keep two sources agreeing.
      const source = (event.target as HTMLElement).closest<HTMLElement>('[data-cell]')
      const [row, col] = source
        ? source.dataset.cell!.split('-').map(Number)
        : [active.row, active.col]
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          moveTo(row + 1, col)
          return
        case 'ArrowUp':
          event.preventDefault()
          moveTo(row - 1, col)
          return
        case 'ArrowRight':
          event.preventDefault()
          moveTo(row, col + 1)
          return
        case 'ArrowLeft':
          event.preventDefault()
          moveTo(row, col - 1)
          return
        case 'Home':
          event.preventDefault()
          moveTo(event.ctrlKey || event.metaKey ? 0 : row, 0)
          return
        case 'End':
          event.preventDefault()
          moveTo(event.ctrlKey || event.metaKey ? issues.length - 1 : row, 2)
          return
        case 'Tab': {
          // Tab crosses the row rather than leaving immediately, which is what
          // a two-column list feels like it should do. At the far edge it is
          // left alone, so Tab still escapes the grid in both directions and
          // nobody is trapped.
          const next = event.shiftKey ? col - 1 : col + 1
          if (next < 0 || next > 2) return
          event.preventDefault()
          moveTo(row, next)
          return
        }
        default:
      }
    },
    [active, issues.length, moveTo],
  )

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

      {/*
        The list is a grid, and moves like one.
        Two columns — the issue and its Done box — with a roving tabindex, so
        the whole list is one tab stop and the arrow keys move inside it. Up and
        down walk the issues, Enter opens the page, right or Tab crosses to the
        checkbox, left or Shift+Tab comes back. Twenty-five rows with two
        focusable controls each is fifty tab stops otherwise, which is a
        keyboard user's afternoon.
      */}
      <ul
        ref={gridRef}
        role="grid"
        aria-label="Issues"
        aria-colcount={3}
        aria-rowcount={issues.length}
        onKeyDown={onGridKeyDown}
        className="divide-y"
      >
      {issues.map((issue, rowIndex) => {
        const onFocusedPage = issue.page === focusedPage
        const isDone = done.has(issue.id)
        return (
          // The checkbox is a sibling of the row button, never inside it —
          // nesting one interactive control in another is invalid, and it would
          // mean ticking something off also navigated you away from it.
          <li
            key={issue.id}
            role="row"
            aria-rowindex={rowIndex + 1}
            className={cn(
              'relative flex flex-wrap items-start transition-colors',
              onFocusedPage && 'bg-focus-tint',
              isDone && 'opacity-60',
            )}
          >
            <div role="gridcell" className="flex flex-1">
            <button
              type="button"
              data-cell={`${rowIndex}-0`}
              tabIndex={active.row === rowIndex && active.col === 0 ? 0 : -1}
              onFocus={() => setActive({ row: rowIndex, col: 0 })}
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
            </div>

            <div role="gridcell" className="flex">
              <button
                type="button"
                data-cell={`${rowIndex}-1`}
                tabIndex={active.row === rowIndex && active.col === 1 ? 0 : -1}
                onFocus={() => setActive({ row: rowIndex, col: 1 })}
                onClick={() => setEditing((current) => (current === issue.id ? null : issue.id))}
                aria-expanded={editing === issue.id}
                aria-label={
                  notes[issue.id]
                    ? `Edit note on "${issue.title}"`
                    : `Add a note to "${issue.title}"`
                }
                className={cn(
                  'flex min-h-11 shrink-0 items-center gap-1 self-stretch px-1.5 text-[11px] transition-colors',
                  'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                  notes[issue.id]
                    ? 'text-primary hover:text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <StickyNote className="size-4" aria-hidden />
                <span aria-hidden>Note</span>
              </button>
            </div>

            <div role="gridcell" className="flex">
            <label
              className={cn(
                'flex min-h-11 shrink-0 cursor-pointer select-none items-center gap-1.5 self-stretch py-3 pe-3 ps-1 text-[11px]',
                'text-muted-foreground hover:text-foreground',
              )}
            >
              <Checkbox
                data-cell={`${rowIndex}-2`}
                tabIndex={active.row === rowIndex && active.col === 2 ? 0 : -1}
                onFocus={() => setActive({ row: rowIndex, col: 2 })}
                checked={isDone}
                onCheckedChange={() => onToggleDone(issue.id)}
                aria-label={`Mark "${issue.title}" done`}
              />
              <span aria-hidden>Done</span>
            </label>
            </div>

            {(editing === issue.id || notes[issue.id]) && (
              // Full width under the row rather than squeezed into the column.
              // A note is prose — a reason someone will read months from now —
              // and prose in a 90px column is a reason nobody writes one.
              <div className="basis-full px-4 pb-3">
                {editing === issue.id ? (
                  <textarea
                    autoFocus
                    defaultValue={notes[issue.id] ?? ''}
                    onBlur={(event) => {
                      onNoteChange(issue.id, event.target.value)
                      setEditing(null)
                    }}
                    aria-label={`Note on "${issue.title}"`}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        setEditing(null)
                        // Hand focus back to the cell that opened it, or the
                        // grid loses its place entirely.
                        gridRef.current
                          ?.querySelector<HTMLElement>(`[data-cell="${rowIndex}-1"]`)
                          ?.focus()
                      }
                      // Enter saves; Shift+Enter is a new line.
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                      // Arrows move the cursor inside a text field, so the grid
                      // must not see them. Tab is deliberately NOT swallowed —
                      // it is the way out, and a textarea you cannot leave by
                      // keyboard is a trap.
                      if (event.key.startsWith('Arrow')) event.stopPropagation()
                    }}
                    rows={2}
                    placeholder="Why this is acceptable, what still needs doing, who to ask…"
                    className="w-full resize-y rounded-md border bg-background p-2 font-[family-name:var(--font-note)] text-[13px] focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                  />
                ) : (
                  <p className="rounded-md border-s-2 border-primary/50 bg-muted/60 px-2 py-1.5 font-[family-name:var(--font-note)] text-[13px] leading-snug whitespace-pre-wrap">
                    {notes[issue.id]}
                  </p>
                )}
              </div>
            )}
          </li>
        )
      })}
      </ul>
    </>
  )
}
