import { describe, expect, it } from 'vitest'
import {
  blockingIssues,
  canSubmit,
  countBySeverity,
  groupByPage,
  isBlocking,
  numberByPage,
} from './review'
import type { Issue, Review, Severity } from '@/types/review'

/**
 * The rules, tested on their own.
 *
 * These are the product, and they are pure functions over data — no DOM, no
 * component, no browser. That is the whole reason they live in `lib/`, so this
 * is where the tests are cheapest and mean the most. The layout suite covers
 * the other half, in a real browser, because layout can't be tested here.
 *
 * The cases that matter are the ones the supplied mock cannot show us: the
 * clean document, the document with only minors, and numbering that has to
 * survive being re-sorted.
 */

function issue(id: string, severity: Severity, page: number): Issue {
  return { id, title: `Issue ${id}`, description: '', severity, page }
}

function review(issues: Issue[]): Review {
  return {
    id: 'r1',
    name: 'Test.pdf',
    uploaded_at: '2025-03-20T14:30:00Z',
    status: 'on_review',
    version: 1,
    document: { pdf_url: '/test.pdf', pages: [{ page_num: 1, width: 612, height: 792 }] },
    user: { id: 'u1', first_name: 'Jane', last_name: 'Cooper' },
    issues,
  }
}

describe('the gate', () => {
  it('treats critical and major as blocking, and minor as not', () => {
    expect(isBlocking(issue('a', 'critical', 1))).toBe(true)
    expect(isBlocking(issue('b', 'major', 1))).toBe(true)
    expect(isBlocking(issue('c', 'minor', 1))).toBe(false)
  })

  it('blocks submission while any critical or major remains', () => {
    expect(canSubmit(review([issue('a', 'critical', 1)]))).toBe(false)
    expect(canSubmit(review([issue('a', 'major', 1)]))).toBe(false)
  })

  it('opens when only minor issues are left — the case the mock cannot show', () => {
    const minorsOnly = review([issue('a', 'minor', 1), issue('b', 'minor', 4)])
    expect(canSubmit(minorsOnly)).toBe(true)
    expect(blockingIssues(minorsOnly.issues)).toHaveLength(0)
  })

  it('opens on a clean document', () => {
    expect(canSubmit(review([]))).toBe(true)
  })

  it('never consults anything but the review data', () => {
    // The signature is the guarantee: canSubmit takes a Review, so there is no
    // argument through which a checkbox, a filter or a UI flag could reach it.
    // A user asserting "I fixed it" must not be able to open the gate.
    const blocked = review([issue('a', 'critical', 2), issue('b', 'minor', 3)])
    expect(canSubmit(blocked)).toBe(false)
    expect(canSubmit({ ...blocked, status: 'submitted' })).toBe(false)
  })
})

describe('counting', () => {
  it('reports every severity, including the ones with no issues', () => {
    expect(countBySeverity([issue('a', 'critical', 1), issue('b', 'minor', 2)])).toEqual({
      critical: 1,
      major: 0,
      minor: 1,
    })
  })

  it('returns zeroes rather than an empty object for a clean document', () => {
    expect(countBySeverity([])).toEqual({ critical: 0, major: 0, minor: 0 })
  })
})

describe('numbering', () => {
  it('numbers by page and returns the issues in that order', () => {
    const numbered = numberByPage([
      issue('c', 'minor', 30),
      issue('a', 'critical', 3),
      issue('b', 'major', 12),
    ])
    expect(numbered.map((i) => [i.id, i.number, i.page])).toEqual([
      ['a', 1, 3],
      ['b', 2, 12],
      ['c', 3, 30],
    ])
  })

  it('keeps a number attached to its issue when the list is re-sorted', () => {
    // The number appears beside the row AND on the document. If it were the row
    // index, sorting by severity would renumber the list and the two would
    // disagree in front of the user.
    const numbered = numberByPage([
      issue('a', 'minor', 1),
      issue('b', 'critical', 9),
      issue('c', 'major', 5),
    ])
    const bySeverity = [...numbered].sort((x, y) => x.severity.localeCompare(y.severity))
    expect(bySeverity.map((i) => [i.id, i.number])).toEqual([
      ['b', 3],
      ['c', 2],
      ['a', 1],
    ])
  })

  it('does not mutate the array it was given', () => {
    const original = [issue('c', 'minor', 30), issue('a', 'critical', 3)]
    numberByPage(original)
    expect(original.map((i) => i.id)).toEqual(['c', 'a'])
  })

  it('handles a clean document', () => {
    expect(numberByPage([])).toEqual([])
  })
})

describe('grouping by page', () => {
  it('collects every issue that shares a page', () => {
    const grouped = groupByPage(
      numberByPage([
        issue('a', 'critical', 7),
        issue('b', 'minor', 7),
        issue('c', 'major', 12),
      ]),
    )
    expect(grouped.get(7)?.map((i) => i.id)).toEqual(['a', 'b'])
    expect(grouped.get(12)?.map((i) => i.id)).toEqual(['c'])
  })

  it('has no entry for a clean page, rather than an empty array', () => {
    // The status bar and the strip both branch on presence, so "no key" and
    // "key with an empty array" must not both be reachable.
    const grouped = groupByPage(numberByPage([issue('a', 'critical', 7)]))
    expect(grouped.has(8)).toBe(false)
  })
})
