import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Interface size: three stops, applied as the root font size.
 *
 * Tailwind sizes type *and* spacing in rem, so one value on `<html>` moves the
 * whole interface together: labels, padding, gaps and touch targets. That is
 * what separates this from browser zoom, which scales the rendered document
 * along with everything else. Someone who can read the pages and cannot read
 * the labels wants only one of the two to move, so the document keeps its own
 * zoom controls in the page bar and is untouched by this.
 *
 * The stops are percentages of the browser's own default, so a reader who has
 * already raised their base font size keeps that and gets this on top. A `px`
 * value here would quietly overrule them.
 *
 * A context rather than a bare hook like `useTheme`, though today the account
 * menu is its only consumer. The thumb strip needs the same number and does
 * *not* take it from here — it reads the root font size directly, inside the
 * observer it already runs, which is cheaper than a subscription. If anything
 * ever needs the preference itself rather than its effect, this is where it
 * comes from.
 *
 * Device-scoped, for the same reason as the theme: how large you want the type
 * depends on the screen you are looking at.
 */

export type UiScale = 'compact' | 'comfortable' | 'large'

const STORAGE_KEY = 'vera.uiScale'
const FALLBACK: UiScale = 'comfortable'

function isUiScale(value: unknown): value is UiScale {
  return value === 'compact' || value === 'comfortable' || value === 'large'
}

function readStoredUiScale(): UiScale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isUiScale(stored) ? stored : FALLBACK
  } catch {
    // Safari in private browsing throws on localStorage. A font size is not
    // worth taking the app down for.
    return FALLBACK
  }
}

interface UiScaleValue {
  scale: UiScale
  setScale: (next: UiScale) => void
}

const UiScaleContext = createContext<UiScaleValue | null>(null)

export function UiScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState<UiScale>(readStoredUiScale)

  useEffect(() => {
    // The inline script in index.html has already set this before first paint.
    // Writing it again here is what makes a change in the menu take effect.
    document.documentElement.dataset.uiScale = scale
    try {
      localStorage.setItem(STORAGE_KEY, scale)
    } catch {
      // The preference simply doesn't persist. The app still works.
    }
  }, [scale])

  const value = useMemo(() => ({ scale, setScale }), [scale])

  return <UiScaleContext.Provider value={value}>{children}</UiScaleContext.Provider>
}

export function useUiScale(): UiScaleValue {
  const context = useContext(UiScaleContext)
  if (!context) {
    throw new Error('useUiScale must be used inside <UiScaleProvider>')
  }
  return context
}
