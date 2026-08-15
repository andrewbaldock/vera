import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { SUBMIT_BLOCKED_ID } from '@/components/ReviewVerdict'
import { countBySeverity } from '@/lib/review'
import { cn } from '@/lib/utils'
import type { Review } from '@/types/review'

/**
 * The gate's control.
 *
 * `aria-disabled`, never `disabled`. A `disabled` button leaves the tab order
 * and announces nothing, so a keyboard user walks straight past the most
 * important control on the page and is never told why it can't be used. This
 * one stays focusable, points at the blocking summary through
 * `aria-describedby`, and simply does nothing when pressed while blocked.
 *
 * The confirmation is not ceremony. "Minor issues may be ignored" is a judgment
 * the user is making on a mortgage file, submission is a one-way door with no
 * un-submit anywhere in the spec's flow, and the dialog is the one moment to
 * say both things out loud. It names the count rather than saying "some issues"
 * — a number is a thing you can decide against.
 */

interface SubmitReviewButtonProps {
  review: Review
  submittable: boolean
  onConfirm: () => void
}

export function SubmitReviewButton({ review, submittable, onConfirm }: SubmitReviewButtonProps) {
  const minors = countBySeverity(review.issues).minor

  const trigger = (
    <Button
      aria-disabled={!submittable}
      aria-describedby={submittable ? undefined : SUBMIT_BLOCKED_ID}
      // shadcn's default button is 32px tall, under the 44px touch minimum, on
      // the one control this whole page exists to gate. The layout suite caught
      // it; it stays 44px in both shapes because it is the primary action in
      // both.
      className={cn('min-h-11', !submittable && 'opacity-50')}
    >
      Submit review
    </Button>
  )

  // Blocked: the button is present, focusable and explains itself, but opens
  // nothing. Wiring the dialog to a blocked button would make the gate a
  // formality you click past.
  if (!submittable) return trigger

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit this review?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Nothing critical or major is outstanding on{' '}
                <span className="font-medium text-foreground">
                  {review.name.replace(/\.pdf$/i, '')}
                </span>
                .
              </p>
              {minors > 0 && (
                <p>
                  <span className="font-medium text-foreground">
                    {minors} minor {minors === 1 ? 'issue' : 'issues'}
                  </span>{' '}
                  will be submitted unresolved.
                </p>
              )}
              <p>
                This can’t be undone. Corrections are made by uploading a new version of the
                document.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Keep reviewing</AlertDialogCancel>
          {/* The action names what happens, and matches the button that opened
              it — an interface people learn their way around says the same word
              at every step. */}
          <AlertDialogAction className="min-h-11" onClick={onConfirm}>
            Submit review
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
