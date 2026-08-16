import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { clearSubmission } from '@/lib/submission'
import type { CatalogDocument } from '@/lib/documents'

/**
 * Puts the demo back. Submission persists, because `status: 'submitted'` is a
 * value the API can return and the page has to render it on a cold load, which
 * leaves whoever is evaluating this build able to submit only once.
 *
 * The reset lives here, below the queue and marked as a demo control, not in
 * the row's overflow menu: a "clear submission" item inside product chrome
 * would read as an un-submit feature, and the spec's flow has no reopened
 * status and no arrow back. Corrections happen by uploading a new version.
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
    // Set apart from the queue by distance and by a dashed edge, so it reads as
    // an aside to whoever is evaluating the build. A reset styled like product
    // chrome would read as an un-submit feature.
    <div className="mt-10 mb-2 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <FlaskConical className="size-3.5" aria-hidden />
        {justReset ? 'Demo data cleared' : 'Reset demo data'}
      </button>
    </div>
  )
}
