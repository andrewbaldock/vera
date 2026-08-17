import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { UserMenu } from '@/components/UserMenu'
import { HelpButton } from '@/components/UserGuide'
import { Wordmark } from '@/components/Wordmark'
import { DemoReset } from '@/components/DemoReset'
import { CoverThumb } from '@/components/CoverThumb'
import {
  DEFAULT_VERSION,
  LOCAL_PDF_URL,
  PLACEHOLDER_DOCUMENTS,
  REVIEW_DOCUMENT,
  versionOf,
  type PlaceholderDocument,
} from '@/lib/documents'
import { blockingIssues, countBySeverity } from '@/lib/review'
import { isReview } from '@/hooks/useReview'
import { cn } from '@/lib/utils'
import { readSubmission } from '@/lib/submission'
import type { ReviewStatus } from '@/types/review'

/**
 * The documents list. **Not** the Documents Page from the spec's flow diagram,
 * which belongs to a teammate's ticket and would mean owning upload, filtering,
 * pagination and assignment. This is the smallest surface that gives the Review
 * Page somewhere to be opened from and returned to, so submitting is something a
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

/**
 * Why the row reads the way it does. "Awaiting review" says what state the
 * document is in and immediately raises the question it cannot answer — waiting
 * on what? A queue where every row looks equally stuck is a queue you have to
 * open one at a time to triage.
 *
 * Counted from the fixture rather than stored beside the catalog. The number is
 * a property of the findings, and one typed into the catalog is one that goes
 * quietly wrong the first time a fixture changes.
 */
function useRowSummary(version: number) {
  const [summary, setSummary] = useState<{ blocking: number; minor: number } | null>(null)

  useEffect(() => {
    // Aborted rather than flagged, matching `useReview`. A boolean only stops
    // the setState; the request still runs to completion and is thrown away,
    // which under StrictMode means the queue fetches this twice on every load.
    const controller = new AbortController()
    fetch(versionOf(REVIEW_DOCUMENT, version).url, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: unknown) => {
        if (controller.signal.aborted || !isReview(payload)) return
        setSummary({
          blocking: blockingIssues(payload.issues).length,
          minor: countBySeverity(payload.issues).minor,
        })
      })
      // A row that cannot say why is still a row that says what. The queue must
      // not fail to render because a summary did not arrive.
      .catch(() => {})
    return () => controller.abort()
  }, [version])

  return summary
}

/** The same vocabulary the review itself uses, so the queue and the page agree. */
function summaryLabel(
  summary: { blocking: number; minor: number } | null,
  submitted: boolean,
): string | null {
  if (!summary) return null
  if (submitted) {
    return summary.minor > 0
      ? `${summary.minor} minor accepted as-is`
      : 'Nothing outstanding'
  }
  if (summary.blocking === 0) return 'Ready to submit'
  return `${summary.blocking} ${summary.blocking === 1 ? 'issue' : 'issues'} must be fixed`
}

export function DocumentsPage() {
  const latest = REVIEW_DOCUMENT.versions[REVIEW_DOCUMENT.versions.length - 1]
  const [params, setParams] = useSearchParams()

  /**
   * The row that was just finished. Read once on mount rather than tracked from
   * the URL: the reward is for the arrival, and a reload should not replay it.
   * The parameter stays in the address bar, which makes the flow inspectable.
   */
  const [justSubmitted, setJustSubmitted] = useState(() => params.get('submitted'))

  // Status comes from the stored submission, not a hardcoded label: the list
  // has to be able to say "Submitted" for a review that already is. The version
  // and not just a boolean, because the row then has to summarize *that* one.
  const [submittedVersion, setSubmittedVersion] = useState<number | null>(null)
  const readSubmittedVersion = useCallback(() => {
    const found = REVIEW_DOCUMENT.versions.find(
      (version) => readSubmission({ id: REVIEW_DOCUMENT.id, version: version.version }) !== null,
    )
    setSubmittedVersion(found?.version ?? null)
  }, [])
  // On mount, and again whenever the demo reset clears the storage it reads.
  useEffect(() => readSubmittedVersion(), [readSubmittedVersion])
  const submitted = submittedVersion !== null

  /**
   * Reset puts the address bar back too. `?submitted=` is the record of an
   * arrival, and once the submission it names is gone the URL describes
   * something that did not happen — copy it, reload it, and the row plays its
   * arrival animation for a document that is merely awaiting review. Replaced
   * rather than pushed, so the back button does not walk into the same stale
   * claim.
   */
  const resetDemo = useCallback(() => {
    readSubmittedVersion()
    setJustSubmitted(null)
    setParams({}, { replace: true })
  }, [readSubmittedVersion, setParams])

  /**
   * The version this row is about: the one you would land on, or the one that
   * was submitted. They are different questions and the row can only answer one,
   * so it answers the one the status pill just raised.
   */
  const summary = useRowSummary(submittedVersion ?? DEFAULT_VERSION)

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
          className="divide-y overflow-hidden rounded-md border bg-card shadow-sm"
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
              <CoverThumb pdfUrl={LOCAL_PDF_URL} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {stripExtension(REVIEW_DOCUMENT.name)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {REVIEW_DOCUMENT.versions.length} versions · latest v{latest.version} ·{' '}
                  {formatDate(latest.uploadedAt)}
                </span>
                {/* The reason, on its own line and in the severity's own color
                    when something is blocking. Appended to the line above it
                    would read as one more piece of filing metadata, which is
                    exactly what it is not. */}
                {summaryLabel(summary, submitted) && (
                  <span
                    className={cn(
                      'mt-1 block text-xs font-medium',
                      !submitted && summary && summary.blocking > 0
                        ? 'text-severity-critical-text'
                        : 'text-muted-foreground',
                    )}
                  >
                    {summaryLabel(summary, submitted)}
                  </span>
                )}
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

          <DemoReset document={REVIEW_DOCUMENT} onReset={resetDemo} />
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
        <CoverThumb />
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
