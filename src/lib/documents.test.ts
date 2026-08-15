import { describe, expect, it } from 'vitest'
import { DEFAULT_VERSION, REVIEW_DOCUMENT, versionOf } from './documents'
import { canSubmit } from './review'
import { isReview } from '@/hooks/useReview'
import v2 from '../../public/review_mock.json'
import v3 from '../../public/review_mock_clean.json'

/**
 * The catalog and the fixtures have to agree.
 *
 * They drifted once already, silently: the v3 fixture was built as a separate
 * document before the design settled on it being the *same* document
 * re-uploaded, and nothing noticed that its id, name and version number all
 * disagreed with the catalog. The visible symptoms were a document that renamed
 * itself when you switched version, and a reset that cleared the wrong storage
 * key — neither of which any type could have caught, because both files were
 * individually valid.
 */

const FIXTURES = [
  { version: 2, payload: v2 as unknown },
  { version: 3, payload: v3 as unknown },
]

describe('the demo catalog', () => {
  it('lists a version for every fixture, and a fixture for every version', () => {
    expect(REVIEW_DOCUMENT.versions.map((v) => v.version)).toEqual(FIXTURES.map((f) => f.version))
  })

  it('opens on a version that exists', () => {
    expect(versionOf(REVIEW_DOCUMENT, DEFAULT_VERSION).version).toBe(DEFAULT_VERSION)
  })

  it.each(FIXTURES)('v$version is the same document as the catalog says', ({ version, payload }) => {
    expect(isReview(payload)).toBe(true)
    if (!isReview(payload)) return

    // Same document, later version — not a different document that happens to
    // share a PDF. The id is what submission is stored against, so a mismatch
    // here silently breaks submitting and resetting.
    expect(payload.id).toBe(REVIEW_DOCUMENT.id)
    expect(payload.name).toBe(REVIEW_DOCUMENT.name)
    expect(payload.version).toBe(version)
  })

  it('gives the two gate states the demo depends on', () => {
    const [blocked, resolved] = FIXTURES.map((f) => f.payload)
    if (!isReview(blocked) || !isReview(resolved)) throw new Error('fixtures are not reviews')

    // The whole reason there are two: one shows the gate closed, one shows it
    // open. If they ever agree, the build can only demonstrate half its own
    // most important rule.
    expect(canSubmit(blocked)).toBe(false)
    expect(canSubmit(resolved)).toBe(true)

    // And the resolved one keeps minors, so submitting stays a judgment call
    // rather than a formality.
    expect(resolved.issues.length).toBeGreaterThan(0)
  })

  it('shares one PDF across versions, which is why they must be one document', () => {
    const urls = new Set(FIXTURES.map((f) => (f.payload as { document: { pdf_url: string } }).document.pdf_url))
    expect(urls.size).toBe(1)
  })
})
