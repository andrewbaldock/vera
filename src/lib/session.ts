import type { ReviewUser } from '@/types/review'

/**
 * Who is signed in.
 *
 * Deliberately not read from the review. A review carries the user it is
 * *assigned to*; the session carries the person holding the keyboard. They
 * happen to be the same person in this fixture, and treating that coincidence
 * as structure is how an app ends up unable to show you someone else's review.
 *
 * In production this comes from auth — the seam is this constant and nothing
 * else. The documents list needs it before any review has loaded, which is what
 * made the distinction obvious.
 */
export const CURRENT_USER: ReviewUser = {
  id: 'user_42',
  first_name: 'Jane',
  last_name: 'Cooper',
}
