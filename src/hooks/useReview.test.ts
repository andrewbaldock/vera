import { describe, expect, it } from 'vitest'
import { isReview } from './useReview'
import mock from '../../public/review_mock.json'

/**
 * The boundary guard. The app is not overfitted to the supplied fixture, so the
 * first test is that the real fixture passes and the rest are the malformed
 * payloads that would otherwise sail past the error state and die inside a
 * render.
 */

function withoutKey<T extends object>(object: T, key: keyof T) {
  const copy = { ...object }
  delete copy[key]
  return copy
}

describe('isReview', () => {
  it('accepts the fixture we were actually given', () => {
    expect(isReview(mock)).toBe(true)
  })

  it('accepts a review with no issues at all', () => {
    expect(isReview({ ...mock, issues: [] })).toBe(true)
  })

  it('rejects anything that is not an object', () => {
    // A plain loop rather than `it.each`, which the two test runners disagree
    // about. This file has to pass under both.
    for (const value of [null, undefined, 'a string', 42, [], true]) {
      expect(isReview(value)).toBe(false)
    }
  })

  it('rejects a missing issues array rather than crashing later', () => {
    expect(isReview(withoutKey(mock, 'issues' as never))).toBe(false)
    expect(isReview({ ...mock, issues: null })).toBe(false)
  })

  it('rejects a severity outside the three we render', () => {
    // Unguarded, this produces an uncolored dot and a NaN in the summary.
    const issues = [{ ...mock.issues[0], severity: 'catastrophic' }]
    expect(isReview({ ...mock, issues })).toBe(false)
  })

  it('rejects a status outside the enum', () => {
    expect(isReview({ ...mock, status: 'in_review' })).toBe(false)
  })

  it('rejects a document with no pages, which the viewer cannot render', () => {
    expect(isReview({ ...mock, document: { ...mock.document, pages: [] } })).toBe(false)
  })

  it('rejects zero or missing page dimensions, which the thumb strip divides by', () => {
    const pages = [{ page_num: 1, width: 0, height: 792 }]
    expect(isReview({ ...mock, document: { ...mock.document, pages } })).toBe(false)
    expect(
      isReview({ ...mock, document: { ...mock.document, pages: [{ page_num: 1, width: 612 }] } }),
    ).toBe(false)
  })

  it('rejects a user that is a string, which the prose implied and the payload denied', () => {
    expect(isReview({ ...mock, user: 'Jane Cooper' })).toBe(false)
  })
})
