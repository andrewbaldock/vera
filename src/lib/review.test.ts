import { describe, expect, it } from 'vitest'
import {
  blockingIssues,
  canSubmit,
  countBySeverity,
  groupByPage,
  isBlocking,
  numberByPage,
  sortIssues,
} from './review'
import type { Issue, Review, Severity } from '@/types/review'

/**
 * The rules, tested on their own. They are pure functions over data, with no
 * DOM, component or browser, which is why they live in `lib/` and why the tests
 * are cheapest here. The layout suite covers the other half in a real browser.
 *
 * The cases that matter are the ones the supplied mock cannot show: the clean
 * document, the document with only minors, and numbering that has to survive
 * being re-sorted.
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
    // The number appears beside the row AND on the document. As a row index,
    // sorting by severity would renumber the list and the two would disagree.
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
})

describe('sorting', () => {
  // a=1 (p1), b=2 (p5), c=3 (p5), d=4 (p9).
  const issues = numberByPage([
    issue('a', 'minor', 1),
    issue('b', 'critical', 5),
    issue('c', 'major', 5),
    issue('d', 'critical', 9),
  ])

  it('breaks every tie, so the same set always comes back in the same order', () => {
    // The comparator has four keys, and only a total ordering makes the list
    // stable. Left partial, two issues of one severity on one page would swap
    // places depending on the order they arrived in — the list reshuffling
    // under a filter that should not have touched it.
    const forward = sortIssues(issues, 'severity')
    const backward = sortIssues([...issues].reverse(), 'severity')

    expect(forward.map((i) => i.id)).toEqual(['b', 'd', 'c', 'a'])
    expect(backward.map((i) => i.id)).toEqual(forward.map((i) => i.id))
  })

  it('sinks what is handled, because severity order is a worklist', () => {
    const sorted = sortIssues(issues, 'severity', new Set(['b']))
    // 'b' is the worst issue in the set and still goes last: what is left to do
    // belongs at the top.
    expect(sorted.map((i) => i.id)).toEqual(['d', 'c', 'a', 'b'])
  })

  it('leaves a handled issue in place in page order, because that is a map', () => {
    // Moving it would misdescribe where things are in the document.
    expect(sortIssues(issues, 'page', new Set(['a'])).map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('does not mutate the array it was given', () => {
    const original = [...issues]
    sortIssues(original, 'severity')
    expect(original.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
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
