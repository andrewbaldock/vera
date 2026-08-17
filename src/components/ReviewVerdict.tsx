import { blockingIssues, countBySeverity } from '@/lib/review'
import { SeverityIcon } from '@/components/severity'
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
 * It also reads correctly when nothing is blocking. A build that can only say
 * "12 issues must be fixed" is overfitted to the mock it was handed.
 */

/** The id `aria-describedby` on the submit button points at. */
const SUBMIT_BLOCKED_ID = 'submit-blocked'

interface ReviewVerdictProps {
  review: Review
  submission?: Submission | null
  /**
   * The primary action, shown in this panel below `lg`. In the full layout it
   * lives in the app header, which the compact shape has no room for.
   */
  action?: React.ReactNode
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
  action,
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
      {/*
        Baseline where this row is two pieces of text, centred where it is text
        against a button: aligning a 44px control on the headline's baseline
        drops it, and the row opens a gap under the words to make room.
      */}
      <div className="flex items-center justify-between gap-3 lg:items-baseline">
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
        {/*
          Below `lg` this corner carries the primary action instead of the done
          count. The count is already on its own chip a row below, and the
          action has nowhere else to go: the compact shape has no app header
          slot for it, and no bar along the bottom.
        */}
        {action && <div className="shrink-0 lg:hidden">{action}</div>}
        {doneCount > 0 && (
          <p className="hidden shrink-0 text-sm font-normal text-muted-foreground tabular-nums lg:block">
            {doneCount} marked done
          </p>
        )}
      </div>
      {/*
        Cut below `lg`, where a line of the screen is worth more than the words.
        The headline states the fact and the control that resolves it is on the
        same row, which carries the meaning without the sentence.
      */}
      <p className="mt-0.5 text-sm text-muted-foreground max-lg:hidden">{detail}</p>

      {/*
        The breakdown and the filter are the same control. The *number* never
        changes when a severity is hidden, only the opacity, so the summary keeps
        describing the document while the list shows a subset of it.
      */}
      <ul aria-label="Severity breakdown" className="mt-1.5 flex flex-wrap gap-1.5 lg:mt-3">
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
                <SeverityIcon severity={severity} />
                <span className="font-medium tabular-nums">{counts[severity]}</span>
                {/*
                  Hidden below `lg`, where four of these wrap onto a second row
                  and cost a phone half its list. The shape and the color still
                  separate them, the row for each issue spells the word out
                  anyway, and `aria-label` above is unchanged — so this is the
                  sighted reader trading a word they can recover by scrolling
                  for the space to do the scrolling in.
                */}
                <span className={cn(SEVERITY_TEXT[severity], 'max-lg:hidden')}>
                  {SEVERITY_LABEL[severity]}
                </span>
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
              <span className="text-muted-foreground max-lg:hidden">Done</span>
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}

export { SUBMIT_BLOCKED_ID }
