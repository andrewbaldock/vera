import { Suspense, lazy, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SeekTarget } from '@/components/DocumentViewer'

/**
 * The viewer is split out of the entry chunk. pdf.js is ~420 KB and the verdict,
 * the answer to acceptance criterion #3, needs none of it. Loaded eagerly, a
 * phone on cellular waits for a rendering engine before it can be told what is
 * blocking submission.
 */
const DocumentViewer = lazy(async () => ({
  default: (await import('@/components/DocumentViewer')).DocumentViewer,
}))
import { SeverityDot } from '@/components/severity'
import { SEVERITY_LABEL, SEVERITY_TEXT } from '@/lib/severity'
import type { NumberedIssue } from '@/lib/review'
import type { DocumentPage } from '@/types/review'
import { cn } from '@/lib/utils'

/**
 * Status bar, then the document. The status bar stands in for drawing on the
 * page: the API gives a page number and no coordinates, so anything positioned
 * inside a page would be a claim we cannot support, and roughly half these
 * issues are absences ("Missing Summary of Findings") with nothing to point at.
 *
 * It expands rather than truncating, in two steps. Three issues on one page
 * needs ~580px and a phone has under 300, so the bar says how many, opening it
 * says which, and opening a finding says what it actually is. Severity is
 * carried by a label as well as a color at every step.
 *
 * `z-10` clears pdf.js's own layers. react-pdf ships its CSS, where `.textLayer` is
 * `z-index: 2` and `.annotationLayer` is `z-index: 3`. At equal z-index the
 * pages win on DOM order, so a scrolled-past page's invisible text layer sits
 * over the UI and eats every click.
 */

interface DocumentPanelProps {
  focusedPage: number
  /** The API's page dimensions. The viewer reserves heights from them. */
  pages: DocumentPage[]
  pdfUrl: string
  issuesOnPage: NumberedIssue[]
  seek: SeekTarget
  onPageInView: (page: number) => void
  className?: string
}

export function DocumentPanel({
  focusedPage,
  pages,
  pdfUrl,
  issuesOnPage,
  seek,
  onPageInView,
  className,
}: DocumentPanelProps) {
  /**
   * Open by default. This bar is the only thing naming what is wrong on the
   * page you are looking at, and collapsed it made the reader ask for
   * information the screen already had. Still a toggle, and the choice sticks
   * while you scroll: a user who closed it does not want it reopening on every
   * page that happens to have a finding.
   */
  const [expanded, setExpanded] = useState(true)

  /** Which descriptions are open. Independent, not one-at-a-time: two findings
   *  on a page are usually read together, and closing one to read the next is
   *  the kind of help nobody asked for. */
  const [openIssues, setOpenIssues] = useState<ReadonlySet<string>>(new Set())

  function toggleIssue(id: string) {
    setOpenIssues((previous) => {
      const next = new Set(previous)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }
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
          /*
            Each finding opens on its own. A title names the finding; the
            description *is* the finding, and without it this view can only tell
            you something is wrong on the page you are looking at. Showing every
            description at once would push the document off a phone, so they are
            a second disclosure inside the first, and the list stays capped for
            the case where several are open at once.
          */
          <ul className="max-h-[45dvh] divide-y overflow-y-auto overscroll-contain border-t px-3 pb-2">
            {issuesOnPage.map((issue) => {
              const isOpen = openIssues.has(issue.id)
              return (
                <li key={issue.id} className="text-xs">
                  <button
                    type="button"
                    onClick={() => toggleIssue(issue.id)}
                    aria-expanded={isOpen}
                    className="flex min-h-11 w-full items-start gap-2 py-2 text-start"
                  >
                    <SeverityDot severity={issue.severity} className="mt-1 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {/* Hashed for the same reason as the issues list: a bare
                            number against a title reads as a count. */}
                        <span className="tabular-nums text-muted-foreground">
                          <span className="sr-only">Issue </span>
                          <span aria-hidden>#</span>
                          {issue.number}
                        </span>{' '}
                        {issue.title}
                      </span>
                      {/* Severity as a word, not only as a color. */}
                      <span className={cn('ms-1.5', SEVERITY_TEXT[issue.severity])}>
                        {SEVERITY_LABEL[issue.severity]}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-2 pe-6 ps-4 text-muted-foreground">{issue.description}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/*
        No aria-live here. This text changes on every page the reading line
        passes, so a momentum scroll would queue thirty polite announcements and
        leave a screen-reader user listening to pages they left. The thumb
        strip's slider reports the same fact through aria-valuetext, on demand.
      */}
      <Suspense
        fallback={
          <p className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Loading the document…
          </p>
        }
      >
        <DocumentViewer url={pdfUrl} pages={pages} seek={seek} onPageInView={onPageInView} />
      </Suspense>
    </div>
  )
}
