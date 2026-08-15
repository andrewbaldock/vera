import { useState } from 'react'
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
    <div className="border-t px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-xs text-muted-foreground">
        The rows below the first are placeholders. Submitting is recorded on this device so a
        submitted review still reads as submitted after a reload — clear it to run through the
        flow again.
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
