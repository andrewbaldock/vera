import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownWideNarrow, Check, MoreVertical, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeverityDot } from '@/components/severity'
import { SEVERITY_LABEL, SEVERITY_TEXT } from '@/lib/severity'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NumberedIssue, SortMode } from '@/lib/review'

/**
 * The list, and only the list. The verdict is not in here: it is derived from
 * the whole review, while this component renders a sorted and filtered *view* of
 * the issues, and a verdict computed from the view would under-report the moment
 * anything is hidden.
 *
 * Whether the list follows the document is the user's choice, because both
 * answers are defensible and neither is obviously right. Following keeps the
 * issue next to the page it is about, which matters most on a document you do
 * not know. Not following leaves a panel you scrolled somewhere on purpose
 * exactly where you left it, which is the difference between a tool and one
 * that feels possessed. The tint marks the rows either way, and the status bar
 * above the document names them, so nothing is lost with it off.
 */

/**
 * The grid's columns: the issue, its note, its Done box. Named once and derived
 * everywhere. Not a hardcoded bound: a stale `Math.min(1, col)` clamp snaps every
 * rightward move back one cell as soon as a column is added.
 */
const COLUMNS = ['issue', 'note', 'done'] as const
const LAST_COLUMN = COLUMNS.length - 1

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
  scrollTracking: boolean
  onScrollTrackingChange: (tracking: boolean) => void
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
  scrollTracking,
  onScrollTrackingChange,
}: IssuesPanelProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const gridRef = useRef<HTMLUListElement>(null)
  /**
   * Which cell owns the tab stop. Tracked rather than derived from
   * `document.activeElement`, so the list keeps its place when focus leaves and
   * comes back instead of landing on row one again.
   */
  const [active, setActive] = useState({ row: 0, col: 0 })

  /**
   * Follow the document, when the user has asked for it. `block: 'nearest'` and
   * not `'center'` or `'start'`: nearest does nothing at all when the row is
   * already visible, so reading down the list does not jerk it around, and
   * clicking an issue — which sets the focused page to one already on screen —
   * leaves the list alone. The other two re-center on every page change.
   *
   * Scrolling only, never focus. Moving focus here would take the keyboard away
   * from whatever the user was doing, and the roving tabindex already owns where
   * focus lives.
   */
  useEffect(() => {
    if (!scrollTracking) return
    const row = gridRef.current?.querySelector<HTMLElement>(`[data-page="${focusedPage}"]`)
    if (!row) return
    row.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }, [focusedPage, scrollTracking])

  const moveTo = useCallback(
    (row: number, col: number) => {
      const clampedRow = Math.max(0, Math.min(issues.length - 1, row))
      const clampedCol = Math.max(0, Math.min(LAST_COLUMN, col))
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
      // truth here, and it moves without going through `moveTo`: a click, a
      // browser restoring focus, a re-render between two fast keystrokes.
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
          moveTo(event.ctrlKey || event.metaKey ? issues.length - 1 : row, LAST_COLUMN)
          return
        case 'Tab': {
          // Tab crosses the row rather than leaving immediately. At the far edge
          // it is left alone, so Tab still escapes the grid in both directions.
          const next = event.shiftKey ? col - 1 : col + 1
          if (next < 0 || next > LAST_COLUMN) return
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
      {/* Three slots, so the sort control stays centered whatever the length of
          the count text on the left.

          Above the scroller rather than sticky inside it: it says how many
          issues are shown and how they are ordered, which you want while
          reading the list. Sticky would keep it in view but leaves it inside
          the scrolling box, so the scrollbar runs up the side of it. */}
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-3 py-1.5">
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
            <DropdownMenuContent align="end" className="min-w-52">
              {/* A checkbox item, not an item that toggles: the role is
                  `menuitemcheckbox`, so a screen reader is told the state
                  rather than only the label. */}
              <DropdownMenuCheckboxItem
                checked={scrollTracking}
                onCheckedChange={onScrollTrackingChange}
              >
                Scroll tracking
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={done.size === 0} onSelect={onClearDone}>
                Clear all done
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* The panel scrolls from here down, so the scrollbar starts below the
          toolbar instead of running alongside it. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {issues.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {totalCount === 0
              ? 'No issues were found in this document.'
              : 'Every severity is hidden. Turn one back on above.'}
          </p>
        )}

      {/*
        The list is a grid and moves like one. Three columns (the issue, its note
        and its Done box) with a roving tabindex, so the whole list is one tab
        stop and the arrow keys move inside it: up and down walk the issues,
        Enter opens the page, right or Tab crosses to the checkbox, left or
        Shift+Tab comes back. Otherwise twenty-five rows with two focusable
        controls each is fifty tab stops.
      */}
      <ul
        ref={gridRef}
        role="grid"
        aria-label="Issues"
        aria-colcount={COLUMNS.length}
        aria-rowcount={issues.length}
        onKeyDown={onGridKeyDown}
        className="divide-y"
      >
      {issues.map((issue, rowIndex) => {
        const onFocusedPage = issue.page === focusedPage
        const isDone = done.has(issue.id)
        return (
          // The checkbox is a sibling of the row button, never inside it:
          // nesting one interactive control in another is invalid, and ticking
          // something off would also navigate away from it.
          <li
            key={issue.id}
            role="row"
            // What scroll tracking scrolls to. First match wins, which under
            // severity sort is the worst issue on the page rather than the
            // topmost — the right one to be taken to.
            data-page={issue.page}
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
                  The description is the finding itself: "Effective Date
                  Mismatch" names the problem, but only this says the cover page
                  reads 03/10/2025 while page 3 reads 01/15/2024. Shown in full,
                  not clamped, because these run two or three lines and the
                  decisive detail is usually the last clause.
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
              // Full width under the row rather than squeezed into the column. A
              // note is prose someone will read months from now, and prose in a
              // 90px column is a reason nobody writes one.
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
                      // must not see them. Tab is NOT swallowed: it is the way
                      // out, and a textarea you cannot leave by keyboard is a
                      // trap.
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
      </div>
    </>
  )
}
