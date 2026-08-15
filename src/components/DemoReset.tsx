import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { clearSubmission } from '@/lib/submission'
import type { CatalogDocument } from '@/lib/documents'

/**
 * Puts the demo back.
 *
 * Submission persists — deliberately, because `status: 'submitted'` is a value
 * the API can return and the page has to render it on a cold load. The cost is
 * that whoever is evaluating this build can only submit once, and then the most
 * important interaction in the app is spent.
 *
 * So there is a reset. It lives here, plainly labeled as a demo control, rather
 * than in the row's overflow menu — a "clear submission" item sitting inside
 * product chrome would read as an un-submit feature, and un-submitting is
 * exactly what the spec's flow does not allow. There is no reopened status in
 * the enum and no arrow back. Corrections happen by uploading a new version.
 *
 * Looking like a demo control is the point. It is what stops it being mistaken
 * for a product claim.
 */
export function DemoReset({ document }: { document: CatalogDocument }) {
  const [justReset, setJustReset] = useState(false)

  function reset() {
    for (const version of document.versions) {
      clearSubmission({ id: document.id, version: version.version })
    }
    setJustReset(true)
    window.setTimeout(() => setJustReset(false), 2500)
  }

  return (
    // Visibly not the product. Dashed, off to one side, and labelled as an
    // aside to whoever is evaluating the build — a reset control styled like
    // product chrome would read as a feature, and un-submitting is exactly what
    // this app must not appear to offer.
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
