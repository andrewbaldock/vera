import { CloudUpload, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Review } from '@/types/review'

/**
 * What happens next, shown rather than described, and inert. VERA does not
 * upload: the spec's flow gives that to a separate screen, and building it would
 * mean owning file handling, virus scanning, format validation and the version
 * bump.
 *
 * A blocked state with no visible next step looks like a dead end
 * when it is a loop, so the control opens the real conversation and stops at the
 * boundary. The drop zone is disabled and the dialog says whose screen this is,
 * rather than pretending this app owns the flow.
 */
export function UploadDialog({ review, trigger }: { review: Review; trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a new version</DialogTitle>
          <DialogDescription>
            Corrections are made outside this review. A new version of{' '}
            <span className="font-medium text-foreground">
              {review.name.replace(/\.pdf$/i, '')}
            </span>{' '}
            replaces v{review.version} and is checked again from scratch.
          </DialogDescription>
        </DialogHeader>

        {/* Inert. See the note above. */}
        <div
          aria-disabled
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center opacity-60"
        >
          <CloudUpload className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Drop a PDF here, or choose a file</p>
          <p className="text-xs text-muted-foreground">PDF up to 50 MB</p>
        </div>

        <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Uploading belongs to the Documents screen and isn’t part of this build — this is
            here to show where the loop goes, not to work.
          </span>
        </p>

        <DialogFooter>
          <Button disabled className="min-h-11">
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
