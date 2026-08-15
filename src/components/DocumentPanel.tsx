import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SeverityDot } from '@/components/severity'
import { SEVERITY_LABEL } from '@/lib/severity'
import type { NumberedIssue } from '@/lib/review'
import { cn } from '@/lib/utils'

/**
 * Status bar, then the document.
 *
 * The status bar is what we have instead of drawing on the page. The API gives
 * a page number and no coordinates, so anything positioned inside a page would
 * be a claim we cannot support — and roughly half these issues are absences
 * ("Missing Summary of Findings") with nothing to point at in the first place.
 * Naming the issues on the page you are looking at is the honest version.
 *
 * It expands rather than truncating. Three issues on one page needs ~580px and
 * a phone has under 300, so collapsed it says how many and expanded it says
 * which — with severity carried by a label as well as a colour, because a
 * truncated string with a coloured dot is two ways of saying nothing.
 *
 * `z-10` is not arbitrary: react-pdf ships pdf.js's CSS, where `.textLayer` is
 * `z-index: 2` and `.annotationLayer` is `z-index: 3`. At equal z-index the
 * pages win on DOM order, so a scrolled-past page's invisible text layer sits
 * over the UI and silently eats every click.
 */

interface DocumentPanelProps {
  focusedPage: number
  pageCount: number
  issuesOnPage: NumberedIssue[]
  className?: string
}

export function DocumentPanel({
  focusedPage,
  pageCount,
  issuesOnPage,
  className,
}: DocumentPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const count = issuesOnPage.length
  const summary =
    count === 0 ? 'No issues on this page' : `${count} ${count === 1 ? 'issue' : 'issues'}`

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col bg-muted/40', className)}>
      <div className={cn('relative z-10 shrink-0 border-b', count > 0 ? 'bg-focus-tint' : 'bg-card')}>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          disabled={count === 0}
          aria-expanded={count === 0 ? undefined : expanded}
          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-focus-edge/10 active:bg-focus-edge/15 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none"
        >
          <span className="font-semibold tracking-wide uppercase tabular-nums">
            Page {focusedPage}
          </span>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {summary}
            {count > 0 && !expanded && (
              <span className="ms-1">— {issuesOnPage.map((issue) => issue.title).join(' · ')}</span>
            )}
          </span>
          {count > 0 && (
            <ChevronDown
              className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
          )}
        </button>

        {expanded && count > 0 && (
          <ul className="border-t px-3 pb-2">
            {issuesOnPage.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2 py-1.5 text-xs">
                <SeverityDot severity={issue.severity} className="mt-1" />
                <span className="min-w-0">
                  <span className="font-medium">
                    <span className="tabular-nums text-muted-foreground">{issue.number}</span>{' '}
                    {issue.title}
                  </span>
                  {/* Severity as a word, not only as a colour. */}
                  <span className="ms-1.5 text-muted-foreground">
                    {SEVERITY_LABEL[issue.severity]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        No aria-live here. Once the viewer lands, this text changes on every page
        the reading line passes — a momentum scroll would queue thirty polite
        announcements and leave a screen-reader user listening to pages they
        left. The thumb strip's slider already reports the same fact through
        aria-valuetext, on demand, when they ask for it.
      */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain p-6">
        <p className="text-sm text-muted-foreground">Document viewer — {pageCount} pages</p>
      </div>
    </div>
  )
}
