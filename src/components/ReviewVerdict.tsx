import { blockingIssues, countBySeverity } from '@/lib/review'
import { SeverityDot } from '@/components/severity'
import { SEVERITY_BADGE_FILL, SEVERITY_LABEL, SEVERITY_TEXT } from '@/lib/severity'
import { cn } from '@/lib/utils'
import { BadgeAlert, BadgeCheck, Check, CheckCircle2 } from 'lucide-react'
import type { Review, Severity } from '@/types/review'
import type { Submission } from '@/lib/submission'

/**
 * The answer to acceptance criterion #3, in one place. It takes the whole
 * `review` and never a list of issues: the panel beside it renders a sorted and
 * filtered *view*, and a verdict derived from that view would report "0 minor"
 * the moment someone hides the minors. The summary has to account for issues the
 * list isn't showing.
 *
 * It also reads correctly when the gate is open. A build that can only say
 * "12 issues must be fixed" is overfitted to the mock it was handed.
 */

/**
 * The id `aria-describedby` on the submit button points at. Carried by the panel
 * verdict only, never the compact bar: both render at once (CSS hides one), and
 * two elements sharing an id is invalid HTML that resolves the description to
 * whichever comes first in the document. The panel version is also the fuller
 * statement.
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
  /** How many issues the reviewer has ticked off, and whether they're listed. */
  doneCount?: number
  hideDone?: boolean
  onToggleDone?: () => void
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
  doneCount = 0,
  hideDone = false,
  onToggleDone,
  className,
}: ReviewVerdictProps) {
  const blocking = blockingIssues(review.issues)
  const counts = countBySeverity(review.issues)
  const blocked = blocking.length > 0

  /**
   * Once submitted, the page stops asking its own question: a blocking summary
   * and a submit-shaped control would still be posing one it has resolved.
   * `status: 'submitted'` is a value the API can return, so this is a state you
   * can *arrive* in, not only one you click into.
   *
   * The counts stay, past tense: they are the record of what this document was
   * submitted with, which is what a compliance file has to show later.
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

  /**
   * The worst severity still blocking. Only critical and major block, so when
   * anything is blocking at all it is one of these two and there is no third
   * case to fall through to. Read off the counts rather than sorted issues:
   * "is there a critical" is the whole question.
   */
  const worstBlocking: Severity = counts.critical > 0 ? 'critical' : 'major'

  const headline = blocked
    ? `${blocking.length} ${blocking.length === 1 ? 'issue' : 'issues'} must be fixed`
    : 'Ready to submit'

  /**
   * "Accepted", not "ignored". The brief's wording is "minor may be ignored",
   * which is right for a requirements document and wrong in the product:
   * ignored means *not looked at*, while what happens is that a qualified
   * reviewer sees the finding, judges it non-material and accepts it. No lender
   * wants a compliance file saying six findings were ignored.
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
    <div
      id={SUBMIT_BLOCKED_ID}
      aria-live="polite"
      className={cn('border-b px-4 py-4', !blocked && 'bg-ready-surface', className)}
    >
      {/*
        Progress sits on the opposite edge from the verdict, not appended to it.
        Ticking issues off changes nothing about what is blocking, so the two
        counts share a line without reading as one sentence.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={cn(
            'flex items-center gap-2 text-lg font-semibold tracking-tight text-balance',
            !blocked && 'text-ready-text',
          )}
        >
          {/*
            The one moment this product has good news, so it is marked rather
            than merely worded. A filled rosette and not a bare check glyph: an
            outline check is what the Done boxes use, and this line is a verdict
            on the whole document rather than another thing to tick.
          */}
          {blocked ? (
            /*
              The same rosette as the cleared state, so the verdict is one badge
              that changes its content rather than two unrelated icons. It takes
              the color of the worst thing still outstanding, turning red to
              amber as the criticals clear.

              Filled from the *text* tokens, not the dot fills: the glyph is
              white, and white on the amber dot is about 2:1. The darkened pair
              exists for exactly this, and here it is a background rather than
              the ink.
            */
            <BadgeAlert
              className={cn('size-6 shrink-0 text-white', SEVERITY_BADGE_FILL[worstBlocking])}
              aria-hidden
            />
          ) : (
            <BadgeCheck className="size-6 shrink-0 fill-ready text-white" aria-hidden />
          )}
          {headline}
        </p>
        {doneCount > 0 && (
          <p className="shrink-0 text-sm font-normal text-muted-foreground tabular-nums">
            {doneCount} marked done
          </p>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>

      {/*
        The breakdown and the filter are the same control. The *number* never
        changes when a severity is hidden, only the opacity, so the summary keeps
        describing the document while the list shows a subset of it.
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
                  'flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-opacity',
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

        {doneCount > 0 && onToggleDone && (
          <li>
            <button
              type="button"
              onClick={onToggleDone}
              aria-pressed={!hideDone}
              aria-label={
                hideDone
                  ? `${doneCount} marked done — hidden, show them`
                  : `${doneCount} marked done — hide them`
              }
              className={cn(
                'flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-opacity',
                'hover:bg-accent active:bg-accent',
                'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                hideDone && 'opacity-50',
              )}
            >
              <Check className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="font-medium tabular-nums">{doneCount}</span>
              <span className="text-muted-foreground">Done</span>
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}

export { SUBMIT_BLOCKED_ID }
