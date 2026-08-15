import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { UserMenu } from '@/components/UserMenu'
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
 * The documents list.
 *
 * Explicitly **not** the Documents Page from the spec's flow diagram — that
 * belongs to a teammate's ticket, and building it properly would mean owning
 * upload, filtering, pagination and assignment. This is the smallest surface
 * that gives the Review Page somewhere to be opened from and somewhere to
 * return to, which is what turns the gate from a one-way trip into something a
 * reviewer can actually exercise.
 *
 * One row is live. The rest are inert, and look inert: no link, no hover, no
 * cursor change. A placeholder that looks clickable and isn't is worse than one
 * that plainly isn't.
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
   * The row that was just finished.
   *
   * Read once on mount rather than kept in the URL — the reward is for the
   * arrival, and a reload should not replay it. The parameter stays in the
   * address bar, which is harmless and makes the flow inspectable.
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
        <UserMenu />
      </header>

      {/*
        A width, not a wall.
        Full-bleed rows are right on a phone and wrong on a 1440px monitor —
        a name and a status pill separated by three feet of nothing reads as a
        page that was never designed for the screen it is on. The list gets a
        measure and becomes a card, so the desktop layout is a shape rather
        than the phone one stretched. Same principle as the review page.
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
 * Inert by construction — a `<div>`, not a link or a button, so there is
 * nothing to focus, nothing to press, and no keyboard user is offered a control
 * that goes nowhere. `aria-disabled` on the row says the same thing to a screen
 * reader that the muted treatment says to everyone else.
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
