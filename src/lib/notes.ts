import type { Review } from '@/types/review'

/**
 * The reviewer's notes, one per issue.
 *
 * Why something is being accepted, what still needs doing, who to ask — the
 * reasoning that otherwise lives in someone's head or a separate email thread.
 * On a compliance file that reasoning is the most valuable thing in the room,
 * because it is what has to be defended months later.
 *
 * **Keyed by review and issue, deliberately NOT by version.** This is the
 * opposite scoping from the Done ticks, and the difference is the point. A tick
 * says "I have handled this", which stops being true the moment a new version
 * arrives with a fresh set of findings. A note says "here is why this is
 * acceptable" — and if the same issue is raised again on v4, that reasoning is
 * exactly what you want back in front of you rather than retyped.
 *
 * It rests on issue ids being stable across re-parses, which the spec does not
 * promise. That is written down as a question for the backend rather than
 * assumed away: if ids turn out to be per-parse, notes want a content hash
 * instead. The failure mode is mild in the meantime — a note attached to
 * nothing simply never reappears.
 */

function key(review: Pick<Review, 'id'>): string {
  return `vera.notes.${review.id}`
}

export type Notes = Readonly<Record<string, string>>

export function readNotes(review: Pick<Review, 'id'>): Notes {
  try {
    const raw = localStorage.getItem(key(review))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === 'string' && value.trim() !== '',
      ),
    ) as Notes
  } catch {
    return {}
  }
}

export function writeNotes(review: Pick<Review, 'id'>, notes: Notes): void {
  try {
    localStorage.setItem(key(review), JSON.stringify(notes))
  } catch {
    // The note stays in memory for this session and no further.
  }
}
