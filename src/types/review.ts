/**
 * The shape of the review endpoint's response.
 *
 * Modelled from the supplied `review_mock.json` rather than from the prose in
 * the brief — where the two disagree, the payload wins. Two things the prose
 * doesn't tell you: `user` is an object rather than a string, and an issue
 * carries a `page` number and nothing else about its location.
 */

export type Severity = 'critical' | 'major' | 'minor'

export type ReviewStatus = 'created' | 'processing' | 'on_review' | 'submitted'

export interface Issue {
  id: string
  title: string
  description: string
  severity: Severity
  /**
   * The page this issue appears on. There are no coordinates, no bounding
   * boxes and no text offsets — a page number is the finest location the API
   * gives us, which is why nothing is drawn inside a page.
   */
  page: number
}

export interface DocumentPage {
  page_num: number
  /** Points. 612 x 792 is US Letter. */
  height: number
  width: number
}

export interface ReviewDocument {
  pdf_url: string
  pages: DocumentPage[]
}

export interface ReviewUser {
  id: string
  first_name: string
  last_name: string
}

export interface Review {
  id: string
  name: string
  /** ISO datetime of the latest version's upload. */
  uploaded_at: string
  status: ReviewStatus
  /** Increments with every re-upload. The API returns only the current one. */
  version: number
  document: ReviewDocument
  user: ReviewUser
  issues: Issue[]
}
