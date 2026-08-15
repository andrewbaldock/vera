import { useCallback, useEffect, useState } from 'react'
import { readNotes, writeNotes, type Notes } from '@/lib/notes'
import type { Review } from '@/types/review'

/**
 * Notes, scoped to the document rather than the version. A tick expires when the
 * findings change and a reason does not; see `lib/notes`.
 */
export function useIssueNotes(review: Pick<Review, 'id'>) {
  const { id } = review
  const [notes, setNotes] = useState<Notes>(() => readNotes(review))

  useEffect(() => {
    setNotes(readNotes({ id }))
  }, [id])

  const setNote = useCallback(
    (issueId: string, text: string) => {
      setNotes((previous) => {
        const next = { ...previous }
        if (text.trim() === '') delete next[issueId]
        else next[issueId] = text
        writeNotes({ id }, next)
        return next
      })
    },
    [id],
  )

  const clearAll = useCallback(() => {
    setNotes({})
    writeNotes({ id }, {})
  }, [id])

  return { notes, setNote, clearAll }
}
