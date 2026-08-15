import { blockingIssues, countBySeverity } from '@/lib/review'
import { SeverityDot } from '@/components/severity'
import { SEVERITY_LABEL, SEVERITY_TEXT } from '@/lib/severity'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'
import type { Review, Severity } from '@/types/review'
import type { Submission } from '@/lib/submission'

/**
 * The answer to acceptance criterion #3, in one place.
 *
 * It takes the whole `review` and never a list of issues. That is the point of
 * the signature: the panel beside it renders a *view* of the issues — sorted,
 * and shortly filtered — and a verdict derived from that view would quietly
 * report "0 minor" the moment someone hides the minors. The summary has to
 * account for issues the list isn't showing.
 *
 * It also has to read correctly when the gate is open. A build that can only
 * say "12 issues must be fixed" is overfitted to the mock it was handed; give
 * this one a clean document and it says so.
 */

/**
 * The id `aria-describedby` on the submit button points at.
 *
 * Carried by the panel verdict only, never the compact bar — both render at
 * once (CSS hides one), and two elements sharing an id is invalid HTML that
 * makes the description resolve to whichever happens to come first in the
 * document. The panel version is also the fuller statement, which is the one
 * worth hearing.
 */
const SUBMIT_BLOCKED_ID = 'submit-blocked'

interface ReviewVerdictProps {
  review: Review
  submission?: Submission | null
  /** The compact bottom bar has one line to work with, not four. */
  compact?: boolean
  /** Severities currently hidden from the list. */
  hidden?: ReadonlySet<Severity>
  onToggleSeverity?: (severity: Severity) => void
  className?: string
}

function submittedOn(submission: Submission | null | undefined): string | null {
  if (!submission) return null
  return new Date(submission.at).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ReviewVerdict({
  review,
  submission,
  compact = false,
  hidden,
  onToggleSeverity,
  className,
}: ReviewVerdictProps) {
  const blocking = blockingIssues(review.issues)
  const counts = countBySeverity(review.issues)
  const blocked = blocking.length > 0

  /**
   * Once submitted, the page has answered its own question and should stop
   * asking it. Leaving a blocking summary and a submit-shaped control on screen
   * would be the interface still posing a question it has already resolved —
   * and `status: 'submitted'` is a value the API can return, so this is a state
   * you can *arrive* in, not only one you click into. Someone opening a
   * finished review should know within the first half second.
   *
   * The counts stay, past tense: they are the record of what this document was
   * submitted with, which is the thing a compliance file needs to show later.
   */
  if (review.status === 'submitted') {
    const on = submittedOn(submission)
    // The headline already says "Submitted"; this line is the when and the who.
    const summary = [on, submission?.by].filter(Boolean).join(' · ') || 'Awaiting processing'

    if (compact) {
      return (
        <p aria-live="polite" className={cn('min-w-0 flex-1 text-sm', className)}>
          <span className="font-semibold">Submitted</span>{' '}
          <span className="text-muted-foreground">{on ?? 'for processing'}</span>
        </p>
      )
    }

    return (
      <div id={SUBMIT_BLOCKED_ID} aria-live="polite" className={cn('border-b px-4 py-4', className)}>
        <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <CheckCircle2 className="size-5 shrink-0 text-severity-minor" aria-hidden />
          Submitted
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{summary}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {blocked
            ? `Submitted with ${blocking.length} outstanding.`
            : `${counts.minor} minor ${counts.minor === 1 ? 'issue' : 'issues'} accepted as-is.`}{' '}
          Corrections require a new version.
        </p>
      </div>
    )
  }

  const headline = blocked
    ? `${blocking.length} ${blocking.length === 1 ? 'issue' : 'issues'} must be fixed`
    : 'Ready to submit'

  /**
   * "Accepted", not "ignored".
   *
   * The brief's own wording is "minor may be ignored", and that is fine for a
   * requirements document — but in the product it is the wrong verb. Ignored
   * means *not looked at*. What actually happens is that a qualified reviewer
   * sees the finding, judges it non-material and accepts it, which is the whole
   * value of the record. No lender wants a compliance file saying six findings
   * were ignored.
   */
  const detail = blocked
    ? 'before you can submit'
    : counts.minor > 0
      ? `${counts.minor} minor ${counts.minor === 1 ? 'issue' : 'issues'} can be accepted`
      : 'No issues found'

  if (compact) {
    return (
      <p aria-live="polite" className={cn('min-w-0 flex-1 text-sm', className)}>
        <span className="font-semibold">{headline}</span>{' '}
        <span className="text-muted-foreground">{detail}</span>
      </p>
    )
  }

  return (
    <div id={SUBMIT_BLOCKED_ID} aria-live="polite" className={cn('border-b px-4 py-4', className)}>
      <p className="text-lg font-semibold tracking-tight text-balance">{headline}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>

      {/*
        The breakdown and the filter are the same control on purpose.
        Crucially the *number* never changes when a severity is hidden — only
        the opacity does. So the summary keeps telling the truth about the
        document while the list shows a subset of it, which is what makes it
        safe for one element to both state the verdict and filter the list.
      */}
      <ul aria-label="Severity breakdown" className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(counts) as Severity[]).map((severity) => {
          const isHidden = hidden?.has(severity) ?? false
          const label = `${counts[severity]} ${SEVERITY_LABEL[severity]}`
          return (
            <li key={severity}>
              <button
                type="button"
                onClick={() => onToggleSeverity?.(severity)}
                disabled={!onToggleSeverity || counts[severity] === 0}
                aria-pressed={onToggleSeverity ? !isHidden : undefined}
                aria-label={isHidden ? `${label} — hidden, show them` : `${label} — hide them`}
                className={cn(
                  'flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-opacity',
                  'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                  onToggleSeverity && counts[severity] > 0
                    ? 'hover:bg-accent active:bg-accent'
                    : 'cursor-default',
                  isHidden && 'opacity-50',
                )}
              >
                <SeverityDot severity={severity} />
                <span className="font-medium tabular-nums">{counts[severity]}</span>
                <span className={SEVERITY_TEXT[severity]}>{SEVERITY_LABEL[severity]}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { SUBMIT_BLOCKED_ID }
