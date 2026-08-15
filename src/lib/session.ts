import type { ReviewUser } from '@/types/review'

/**
 * Who is signed in. Not read from the review: a review carries the user it is
 * *assigned to*, the session carries the person holding the keyboard. They are
 * the same person in this fixture, and treating that coincidence as structure is
 * how an app ends up unable to show you someone else's review.
 *
 * In production this comes from auth, and this constant is the only seam. The
 * documents list needs it before any review has loaded.
 */
export const CURRENT_USER: ReviewUser = {
  id: 'user_42',
  first_name: 'Jane',
  last_name: 'Cooper',
}
