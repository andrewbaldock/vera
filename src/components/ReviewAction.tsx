import { useCallback, useState } from 'react'
import { Check, Loader2, Upload } from 'lucide-react'
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
import { UploadDialog } from '@/components/UploadDialog'
import { countBySeverity } from '@/lib/review'
import { cn } from '@/lib/utils'
import type { Review } from '@/types/review'

/**
 * The one thing to do next, whichever state the review is in.
 *
 * **Blocked, the action is not "submit".** A button labeled with something it
 * refuses to perform is a lie told on every render, and disabling it only makes
 * the lie quieter. What is available while critical or major issues remain is a
 * new version of the document, so that is what the control says, as a real link
 * rather than a dead button. Not an `aria-disabled` submit: not having an
 * unavailable control beats explaining one, and `aria-describedby` still points
 * at the blocking summary either way.
 *
 * VERA does not upload. That flow is another screen in the spec's diagram and
 * someone else's ticket, so the control opens the conversation and stops at the
 * boundary, inert. See UploadDialog.
 *
 * **Open, the action is submit**, and it asks first. Accepting minor findings is
 * a judgment on a mortgage file and submission is a one-way door with no
 * un-submit anywhere in the flow. The dialog names the count rather than saying
 * "some issues", because a number is something you can decide against.
 */

interface ReviewActionProps {
  review: Review
  submittable: boolean
  onConfirm: () => void
}

/**
 * How long the submission is shown taking. There is no backend, but a real
 * submission of a mortgage file is a network round trip, and collapsing the one
 * irreversible action in the app into an instant nothing makes it feel like it
 * did not happen. Unhurried for the same reason the confirmation exists.
 */
const SUBMITTING_MS = 1500
const LANDED_MS = 1200

type Phase = 'idle' | 'submitting' | 'landed'

export function ReviewAction({ review, submittable, onConfirm }: ReviewActionProps) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const run = useCallback(() => {
    setPhase('submitting')
    window.setTimeout(() => {
      setPhase('landed')
      window.setTimeout(onConfirm, LANDED_MS)
    }, SUBMITTING_MS)
  }, [onConfirm])

  const uploadAction = (
    <UploadDialog
      review={review}
      trigger={
        // Outlined, not filled, but still in the brand color. Submitting is the
        // goal of this page and keeps the solid weight; uploading steps back
        // without becoming gray furniture. A neutral outline would read as a
        // cancel.
        //
        // Shortened in the compact layout rather than reduced to an icon. An
        // upward arrow on its own is not a word: it reads as export, or share,
        // or open — and this is the only route out of a blocked review, so the
        // one control that must not be a guess was the one with no label. The
        // full phrase stays in the accessible name at every width.
        <Button
          variant="outline"
          className="min-h-11 border-2 border-primary/55 px-3 text-primary hover:border-primary/75 hover:bg-accent hover:text-primary active:bg-accent"
          aria-describedby={submittable ? undefined : SUBMIT_BLOCKED_ID}
        >
          <Upload aria-hidden />
          <span>
            Upload<span className="max-lg:sr-only"> new version</span>
          </span>
        </Button>
      }
    />
  )

  /**
   * Uploading a new version is available for as long as the review is open, not
   * only while it is blocked. Spotting something after the gate opens is
   * ordinary, and hiding the escape hatch the moment the document passes would
   * make the clean state feel like a trap.
   */
  if (!submittable) return uploadAction

  const busy = phase !== 'idle'

  return (
    <div className="flex shrink-0 items-center gap-2">
      {uploadAction}
      <AlertDialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <AlertDialogTrigger asChild>
        {/* 44px, because shadcn's default is 32: under the touch minimum, on the
            one control this whole page exists to gate. */}
        <Button className={cn('min-h-11')}>Submit review</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {busy ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div
              className={cn(
                'flex size-16 items-center justify-center rounded-full',
                phase === 'landed' ? 'halo bg-primary text-primary-foreground' : 'bg-accent',
              )}
            >
              {phase === 'landed' ? (
                <Check className="land size-8" strokeWidth={3} aria-hidden />
              ) : (
                <Loader2 className="sweep size-8 text-primary" aria-hidden />
              )}
            </div>
            <p className="text-lg font-semibold" role="status">
              {phase === 'landed' ? 'Submitted' : 'Submitting…'}
            </p>
            <p className="text-sm text-muted-foreground">
              {phase === 'landed'
                ? 'Returning you to your documents.'
                : 'Recording your decision on this version.'}
            </p>
          </div>
        ) : (
          <>
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
              {countBySeverity(review.issues).minor > 0 && (
                <p>
                  <span className="font-medium text-foreground">
                    {countBySeverity(review.issues).minor} minor{' '}
                    {countBySeverity(review.issues).minor === 1 ? 'issue' : 'issues'}
                  </span>{' '}
                  will be accepted as-is.
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
          {/* The action names what happens and matches the button that opened
              it: the same word at every step. */}
          <AlertDialogAction
            className="min-h-11"
            onClick={(event) => {
              // Hold the dialog open: it becomes the progress surface rather
              // than vanishing and leaving the page to explain itself.
              event.preventDefault()
              run()
            }}
          >
            Submit review
          </AlertDialogAction>
        </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
