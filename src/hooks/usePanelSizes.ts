import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * How wide the panels are. Device-scoped, for the reason the theme is: how you
 * want a screen divided depends on the screen, and dragging a laptop's split
 * onto a 27" monitor helps nobody.
 *
 * Written on change and never on mount, following the scroll-tracking rule: a
 * reader who has never touched a splitter has no stored layout, so the defaults
 * here stay free to move without every existing visitor being pinned to the old
 * ones.
 *
 * Debounced, because a splitter reports on every pointer move and localStorage
 * is synchronous. The value on screen is live; only the record of it waits.
 */

const STORAGE_KEY = 'vera.panels'
const WRITE_DELAY_MS = 300

/** Issues panel, as a percentage of the split. */
export const ISSUES_MIN = 20
export const ISSUES_MAX = 50
export const ISSUES_DEFAULT = 32

/**
 * Thumb strip, in px. The minimum is the touch target it has to stay legal at,
 * and is also the width it shipped at. The maximum is where the strip stops
 * being an edge of the screen and starts competing with the document for it.
 */
export const STRIP_MIN = 44
export const STRIP_MAX = 140

/**
 * The width the strip has before anyone touches it, and the width it comes back
 * at when it is reopened.
 *
 * Wide enough that a page image is a shape you can tell from its neighbours,
 * which is the whole reason the images are there. The minimum is a legal touch
 * target rather than a legible one, so starting there asks every reader to
 * discover the resize before the strip is worth looking at.
 */
export const STRIP_DEFAULT = 100

/**
 * Drag it narrower than this and it closes instead of becoming a sliver. A
 * strip between 1px and the touch minimum is the one state that is no use to
 * anybody: too narrow to read, too narrow to grab, still taking room.
 */
export const STRIP_COLLAPSE_AT = 22

export interface PanelSizes {
  issues: number
  /**
   * Px. Nullable because `ThumbStrip` still accepts "no width given" and fits
   * the document into its column instead; the app itself always has a number.
   */
  strip: number | null
  /**
   * Separate from `strip` so that whether the strip is showing and how wide it
   * is stay independent questions.
   */
  stripOpen: boolean
}

const DEFAULTS: PanelSizes = { issues: ISSUES_DEFAULT, strip: STRIP_DEFAULT, stripOpen: true }

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function read(): PanelSizes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    // Anything stored here becomes a layout, so it is range-checked rather than
    // trusted. A hand-edited 5000 would put the strip over the whole document.
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULTS
    const { issues, strip, stripOpen } = parsed as Partial<PanelSizes>
    return {
      issues: inRange(issues, ISSUES_MIN, ISSUES_MAX) ? issues : DEFAULTS.issues,
      strip: inRange(strip, STRIP_MIN, STRIP_MAX) ? strip : DEFAULTS.strip,
      stripOpen: typeof stripOpen === 'boolean' ? stripOpen : DEFAULTS.stripOpen,
    }
  } catch {
    // Safari in private browsing throws on localStorage, and a truncated write
    // throws on parse. Neither is worth taking the layout down for.
    return DEFAULTS
  }
}

export function usePanelSizes() {
  const [panels, setPanels] = useState<PanelSizes>(read)
  /** The current value outside React's queue, so the debounced write has it. */
  const latest = useRef(panels)
  const timer = useRef(0)

  const update = useCallback((patch: Partial<PanelSizes>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setPanels(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // It doesn't persist. The drag still worked.
      }
    }, WRITE_DELAY_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const setIssuesWidth = useCallback((issues: number) => update({ issues }), [update])

  /**
   * One entry point for the strip, because closing it is something you do by
   * dragging it rather than a separate gesture. Below the collapse point the
   * width is deliberately left alone: it is what reopening restores.
   */
  const setStripWidth = useCallback(
    (next: number) => {
      if (next < STRIP_COLLAPSE_AT) {
        update({ stripOpen: false })
        return
      }
      update({ strip: Math.max(STRIP_MIN, next), stripOpen: true })
    },
    [update],
  )

  /**
   * Reopening comes back at the default rather than at the last width, because
   * the only way to close the strip is to drag it shut — and that drag passes
   * through every width on the way down, so the last width recorded is the
   * minimum. Restoring that would reopen it as the sliver it was closed to.
   */
  const openStrip = useCallback(
    () => update({ stripOpen: true, strip: STRIP_DEFAULT }),
    [update],
  )

  return { panels, setIssuesWidth, setStripWidth, openStrip }
}
