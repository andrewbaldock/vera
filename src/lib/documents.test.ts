import { describe, expect, it } from 'vitest'
import { DEFAULT_VERSION, REVIEW_DOCUMENT, versionOf } from './documents'
import { canSubmit } from './review'
import { isReview } from '@/hooks/useReview'
import v2 from '../../public/review_mock.json'
import v3 from '../../public/review_mock_clean.json'

/**
 * The catalog and the fixtures have to agree. Nothing else catches a drift
 * between them: each file is individually valid, so a v3 whose id, name or
 * version disagrees with the catalog type-checks fine and shows up as a document
 * that renames itself when you switch version, and a reset that clears the wrong
 * storage key.
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

    // Same document, later version, not a different document that happens to
    // share a PDF. The id is what submission is stored against, so a mismatch
    // here silently breaks submitting and resetting.
    expect(payload.id).toBe(REVIEW_DOCUMENT.id)
    expect(payload.name).toBe(REVIEW_DOCUMENT.name)
    expect(payload.version).toBe(version)
  })

  it('gives the two gate states the demo depends on', () => {
    const [blocked, resolved] = FIXTURES.map((f) => f.payload)
    if (!isReview(blocked) || !isReview(resolved)) throw new Error('fixtures are not reviews')

    // The reason there are two: one shows the gate closed, one shows it open. If
    // they ever agree, the build can only demonstrate half the rule.
    expect(canSubmit(blocked)).toBe(false)
    expect(canSubmit(resolved)).toBe(true)

    // The resolved one keeps minors, so submitting stays a judgment call.
    expect(resolved.issues.length).toBeGreaterThan(0)
  })

  it('shares one PDF across versions, which is why they must be one document', () => {
    const urls = new Set(FIXTURES.map((f) => (f.payload as { document: { pdf_url: string } }).document.pdf_url))
    expect(urls.size).toBe(1)
  })
})
