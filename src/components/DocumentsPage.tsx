import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { UserMenu } from '@/components/UserMenu'
import { HelpButton } from '@/components/UserGuide'
import { Wordmark } from '@/components/Wordmark'
import { DemoReset } from '@/components/DemoReset'
import {
  PLACEHOLDER_DOCUMENTS,
  REVIEW_DOCUMENT,
  type PlaceholderDocument,
} from '@/lib/documents'
import { cn } from '@/lib/utils'
import { readSubmission } from '@/lib/submission'
import type { ReviewStatus } from '@/types/review'

/**
 * The documents list. **Not** the Documents Page from the spec's flow diagram,
 * which belongs to a teammate's ticket and would mean owning upload, filtering,
 * pagination and assignment. This is the smallest surface that gives the Review
 * Page somewhere to be opened from and returned to, so the gate is something a
 * reviewer can exercise rather than a one-way trip.
 *
 * One row is live. The rest are inert and look inert: no link, no hover, no
 * cursor change.
 */

const STATUS_LABEL: Record<ReviewStatus, string> = {
  created: 'Not started',
  processing: 'Processing',
  on_review: 'Awaiting review',
  submitted: 'Submitted',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function stripExtension(name: string): string {
  return name.replace(/\.pdf$/i, '')
}

export function DocumentsPage() {
  const latest = REVIEW_DOCUMENT.versions[REVIEW_DOCUMENT.versions.length - 1]
  const [params] = useSearchParams()

  /**
   * The row that was just finished. Read once on mount rather than tracked from
   * the URL: the reward is for the arrival, and a reload should not replay it.
   * The parameter stays in the address bar, which makes the flow inspectable.
   */
  const [justSubmitted] = useState(() => params.get('submitted'))

  // Status comes from the stored submission, not a hardcoded label: the list
  // has to be able to say "Submitted" for a review that already is.
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => {
    setSubmitted(
      REVIEW_DOCUMENT.versions.some(
        (version) => readSubmission({ id: REVIEW_DOCUMENT.id, version: version.version }) !== null,
      ),
    )
  }, [])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b bg-card px-4 pt-[env(safe-area-inset-top)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <Wordmark className="py-4" />
        <span className="h-5 w-px shrink-0 bg-border" aria-hidden />
        <h1 className="min-w-0 flex-1 truncate py-4 text-base font-semibold">Documents</h1>
        <HelpButton />
        <UserMenu />
      </header>

      {/*
        A width, not a wall. Full-bleed rows are right on a phone and wrong on a
        1440px monitor, where a name and a status pill sit either side of three
        feet of nothing. The list gets a measure and becomes a card, so the wide
        layout is a shape rather than the phone one stretched.
      */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 lg:py-8">
        <ul
          aria-label="Documents"
          className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <li className={cn(justSubmitted === REVIEW_DOCUMENT.id && 'settle')}>
            <Link
              to={`/reviews/${REVIEW_DOCUMENT.id}`}
              className={cn(
                'flex min-h-11 items-center gap-3 px-4 py-4 transition-colors sm:px-5',
                'hover:bg-accent/60 active:bg-accent',
                'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {stripExtension(REVIEW_DOCUMENT.name)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {REVIEW_DOCUMENT.versions.length} versions · latest v{latest.version} ·{' '}
                  {formatDate(latest.uploadedAt)}
                </span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                  submitted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {submitted ? STATUS_LABEL.submitted : STATUS_LABEL.on_review}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>

          {PLACEHOLDER_DOCUMENTS.map((document) => (
            <PlaceholderRow key={document.name} document={document} />
          ))}
        </ul>

          <DemoReset document={REVIEW_DOCUMENT} />
        </div>
      </div>
    </div>
  )
}

/**
 * Inert by construction: a `<div>`, not a link or a button, so there is nothing
 * to focus and no keyboard user is offered a control that goes nowhere.
 * `aria-disabled` says to a screen reader what the muted treatment says to
 * everyone else.
 */
function PlaceholderRow({ document }: { document: PlaceholderDocument }) {
  return (
    <li>
      <div aria-disabled className="flex min-h-11 items-center gap-3 px-4 py-4 opacity-45 sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {stripExtension(document.name)}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            v{document.version} · {formatDate(document.uploadedAt)}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
          {STATUS_LABEL[document.status]}
        </span>
      </div>
    </li>
  )
}
