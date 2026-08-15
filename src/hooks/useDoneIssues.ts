import { useCallback, useEffect, useState } from 'react'
import { readDone, writeDone } from '@/lib/progress'
import type { Review } from '@/types/review'

/**
 * The reviewer's private worklist, persisted per document version.
 *
 * Deliberately its own hook rather than part of `useReview`. The review is what
 * the API says about the document; this is what the person sitting in front of
 * it has ticked off. Keeping them apart is the same instinct that keeps
 * `canSubmit` in a file that cannot see a checkbox.
 */
export function useDoneIssues(review: Pick<Review, 'id' | 'version'>) {
  // Destructured, because the review object is a fresh reference on every
  // render — depending on it directly would re-read storage constantly. The id
  // and version are the only parts that identify the worklist.
  const { id, version } = review
  const [done, setDone] = useState<ReadonlySet<string>>(() => readDone(review))

  // Re-read when the version changes: v2's ticks must not appear against v3.
  useEffect(() => {
    setDone(readDone({ id, version }))
  }, [id, version])

  const toggle = useCallback(
    (issueId: string) => {
      setDone((previous) => {
        const next = new Set(previous)
        if (next.has(issueId)) next.delete(issueId)
        else next.add(issueId)
        writeDone({ id, version }, next)
        return next
      })
    },
    [id, version],
  )

  const clearAll = useCallback(() => {
    setDone(new Set())
    writeDone({ id, version }, new Set())
  }, [id, version])

  return { done, toggle, clearAll }
}
