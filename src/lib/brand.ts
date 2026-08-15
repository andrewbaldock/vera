/**
 * The public name, in one place.
 *
 * **UNDIRT is the codename** — it names the repo, the localStorage keys, the
 * docs and the comments, and it stays that way. Renaming a codebase because
 * marketing picked a word is churn with no reader on the other end, and every
 * real product carries an internal name that outlives the branding.
 *
 * VERA is what the user sees, and always in capitals — MIRA is set that way
 * everywhere on HomeVision's own site, so a sibling product that shows up as
 * "Vera" reads as a different kind of thing. The name is Latin *verus* — true.
 * MIRA finds the problems; VERA is where a person decides.
 *
 * Two places necessarily duplicate this, because they are static files loaded
 * before any JavaScript: the `<title>` in `index.html` and the `name` fields in
 * `manifest.webmanifest`. Both point back here in a comment. Everything the app
 * renders reads it from this constant.
 */
export const PRODUCT_NAME = 'VERA'

/** Used in the browser tab and anywhere the product introduces itself. */
export const PRODUCT_TAGLINE = 'Document review'
