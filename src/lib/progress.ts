import type { Review } from '@/types/review'

/**
 * The reviewer's own "I've handled this" marks. A private worklist and nothing
 * more: it never reaches `canSubmit`, and it cannot, because that function takes a
 * whole `Review` and this is not part of one. If a checkbox could allow submission,
 * someone could submit a defective mortgage file by lying to a checkbox.
 * Resolution is proven by a new version arriving clean, never by an assertion in
 * the UI.
 *
 * Keyed by review id **and version**. When v3 arrives with a fresh issue list,
 * v2's ticks are meaningless, and a stale tick would claim a defect was handled
 * when it wasn't.
 */

function key(review: Pick<Review, 'id' | 'version'>): string {
  return `vera.done.${review.id}.v${review.version}`
}

export function readDone(review: Pick<Review, 'id' | 'version'>): Set<string> {
  try {
    const raw = localStorage.getItem(key(review))
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((v) => typeof v === 'string')) : new Set()
  } catch {
    // Private browsing, or a corrupt value. An empty worklist under-claims
    // progress rather than over-claiming it.
    return new Set()
  }
}

export function writeDone(review: Pick<Review, 'id' | 'version'>, done: ReadonlySet<string>): void {
  try {
    localStorage.setItem(key(review), JSON.stringify([...done]))
  } catch {
    // The marks just don't survive a reload. Nothing else breaks.
  }
}

export function clearDone(review: Pick<Review, 'id' | 'version'>): void {
  try {
    localStorage.removeItem(key(review))
  } catch {
    /* nothing to do */
  }
}
