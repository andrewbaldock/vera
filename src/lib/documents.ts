import type { ReviewStatus } from '@/types/review'

/**
 * The demo catalog. There is no documents endpoint: this page belongs to a
 * teammate's ticket and VERA owns the Review Page. This is the smallest list
 * that gives the review page somewhere to be opened from and returned to, so the
 * gate is demonstrable rather than a one-way trip.
 *
 * One document is real, with two versions behind it. The rest are inert and look
 * it: no link, no hover, muted. Not placeholders that look clickable, which
 * invite a click that goes nowhere.
 */

export interface DocumentVersion {
  version: number
  /** The fixture this version loads. */
  url: string
  uploadedAt: string
}

export interface CatalogDocument {
  id: string
  name: string
  versions: DocumentVersion[]
}

/**
 * Two versions of one document, sharing one PDF. They are the same document, so
 * identical pages is what you would expect; what differs is what the review
 * found in it.
 *
 * v2 is the supplied fixture, untouched. v3 is the same report after the
 * critical and major issues were resolved and it was uploaded again, the loop
 * the spec describes, which happens outside this app. v3 still carries minor
 * issues, so the open gate is a judgment call rather than a formality:
 * submitting means choosing to ignore them.
 */
export const REVIEW_DOCUMENT: CatalogDocument = {
  id: 'souj5sd12c8a3f',
  name: 'Annual Compliance Report - Northeast Region.pdf',
  versions: [
    { version: 2, url: '/review_mock.json', uploadedAt: '2025-03-20T14:30:00Z' },
    { version: 3, url: '/review_mock_clean.json', uploadedAt: '2025-04-02T09:15:00Z' },
  ],
}

/**
 * The file behind the demo document. The supplied mock points `pdf_url` at
 * example.com, so the local copy is substituted at the fetch boundary — the
 * fixture stays a faithful copy of what was supplied, and the substitution stays
 * visible in code rather than buried in edited JSON.
 *
 * Here rather than in `useReview` because it is catalog data: which file backs
 * this document is the same kind of fact as which versions it has, and the
 * documents list needs it to draw a cover without loading a review.
 */
export const LOCAL_PDF_URL = '/docs/example_document.pdf'

/** The version a reviewer lands on. */
export const DEFAULT_VERSION = 2

export function versionOf(document: CatalogDocument, version: number): DocumentVersion {
  return document.versions.find((v) => v.version === version) ?? document.versions[0]
}

/**
 * Enough neighbors to make the list read as a list. Not interactive and not
 * pretending to be: no href, no hover, no cursor change, muted text.
 */
export interface PlaceholderDocument {
  name: string
  version: number
  status: ReviewStatus
  uploadedAt: string
}

export const PLACEHOLDER_DOCUMENTS: PlaceholderDocument[] = [
  {
    name: 'Riverside Duplex - Uniform Appraisal.pdf',
    version: 1,
    status: 'processing',
    uploadedAt: '2025-04-01T16:05:00Z',
  },
  {
    name: 'Lakeview Condo - Field Review.pdf',
    version: 3,
    status: 'submitted',
    uploadedAt: '2025-03-28T11:42:00Z',
  },
  {
    name: 'Mill Street Multifamily - Desk Review.pdf',
    version: 1,
    status: 'created',
    uploadedAt: '2025-03-27T08:20:00Z',
  },
]
