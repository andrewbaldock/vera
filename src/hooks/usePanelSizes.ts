import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * How wide the panels are. Device-scoped, for the reason the theme is: how you
 * want a screen divided depends on the screen, and dragging a laptop's split
 * onto a 27" monitor helps nobody.
 *
 * Written on change and never on mount, following the scroll-tracking rule. It
 * matters more here: `strip` is `null` until the reader has actually dragged
 * the thumb strip, and that null is what keeps the strip a minimap by default.
 * An effect keyed on the value would stamp a width in on first render and
 * silently switch every reader into the resized behavior.
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
 * Drag it narrower than this and it closes instead of becoming a sliver. A
 * strip between 1px and the touch minimum is the one state that is no use to
 * anybody: too narrow to read, too narrow to grab, still taking room.
 */
export const STRIP_COLLAPSE_AT = 22

export interface PanelSizes {
  issues: number
  /** Null until dragged. See above — this is load-bearing, not laziness. */
  strip: number | null
  /**
   * Separate from `strip` so that closing a strip nobody ever resized reopens
   * it as the minimap it was, rather than pinning it at a width.
   *
   * ponytail: reopening restores whatever width the strip last held, which
   * after dragging it shut is the minimum — the drag passes through every width
   * on its way down and each one is recorded. Restoring the width it had before
   * the gesture began needs the splitter to report on release as well as on
   * move; worth adding if anyone minds.
   */
  stripOpen: boolean
}

const DEFAULTS: PanelSizes = { issues: ISSUES_DEFAULT, strip: null, stripOpen: true }

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

  const openStrip = useCallback(() => update({ stripOpen: true }), [update])

  return { panels, setIssuesWidth, setStripWidth, openStrip }
}
