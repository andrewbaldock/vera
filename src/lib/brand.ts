/**
 * The product name, in one place. Always capitals: the platform sets MIRA that way
 * everywhere on their own site, so a sibling product rendered as "Vera" reads as
 * a person's name rather than a system's.
 *
 * The name is Latin *verus*, true. MIRA finds the problems; VERA is where a
 * person decides. It sits in the same family as their product rather than
 * competing with it, which is also why the mark borrows their faceted
 * construction instead of their shape.
 *
 * Two places necessarily duplicate this, because they are static files parsed
 * before any JavaScript runs: the `<title>` in `index.html` and the `name`
 * fields in `manifest.webmanifest`. Both carry a comment pointing here.
 */
export const PRODUCT_NAME = 'VERA'

/** Used wherever the product introduces itself. */
export const PRODUCT_TAGLINE = 'Document review'
