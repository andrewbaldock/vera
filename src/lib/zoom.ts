/**
 * Zoom bounds for the document viewer, in `lib/` rather than beside the viewer
 * because the page bar needs them too.
 *
 * The viewer is lazily imported — pdf.js is ~420 KB and the queue screen needs
 * none of it — so a value import of it from the panel would pull the engine
 * into the entry chunk and undo that. Constants have no such cost.
 */

/** Fit to panel. Where it opens, and what a double-tap returns to. */
export const ZOOM_MIN = 1

/**
 * Past this a Letter page at the panel's width is wider than any phone can
 * usefully pan across, and the raster starts fighting the platform's canvas
 * limit even with the ratio capped.
 */
export const ZOOM_MAX = 4

/** One press of a zoom button. */
export const ZOOM_STEP = 1.25

export const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
