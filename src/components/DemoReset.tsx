import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { clearSubmission } from '@/lib/submission'
import type { CatalogDocument } from '@/lib/documents'

/**
 * Puts the demo back. Submission persists, because `status: 'submitted'` is a
 * value the API can return and the page has to render it on a cold load, which
 * leaves whoever is evaluating this build able to submit only once.
 *
 * The reset lives here, labeled as a demo control, not in the row's overflow
 * menu: a "clear submission" item inside product chrome would read as an
 * un-submit feature, and the spec's flow has no reopened status and no arrow
 * back. Corrections happen by uploading a new version.
 */
export function DemoReset({
  document,
  onReset,
}: {
  document: CatalogDocument
  /**
   * Told, not left to notice. The queue reads the stored submission once on
   * mount, so clearing storage underneath it leaves the row saying "Submitted"
   * until a reload — a reset control whose effect you cannot see is worse than
   * none, because the next thing the evaluator tries is submitting again.
   */
  onReset?: () => void
}) {
  const [justReset, setJustReset] = useState(false)

  function reset() {
    for (const version of document.versions) {
      clearSubmission({ id: document.id, version: version.version })
    }
    onReset?.()
    setJustReset(true)
    window.setTimeout(() => setJustReset(false), 2500)
  }

  return (
    // Visibly not the product: dashed, off to one side, and labeled as an aside
    // to whoever is evaluating the build. A reset styled like product chrome
    // would read as an un-submit feature.
    <div className="mt-6 mb-2 rounded-lg border border-dashed px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
        <FlaskConical className="size-3.5" aria-hidden />
        Note for reviewers — not part of the product
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Every row but the first is a placeholder. Submitting is recorded on this device so a
        submitted review still reads as submitted after a reload, which is what a real endpoint
        would do — so clearing it is the only way to run the flow twice.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 min-h-11 rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
      >
        {justReset ? 'Demo data cleared' : 'Reset demo data'}
      </button>
    </div>
  )
}
