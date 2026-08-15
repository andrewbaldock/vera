import { useCallback, useEffect, useState } from 'react'

/**
 * Theme preference: three values, two palettes.
 *
 * "System" is a *preference*, not a palette — so the resolving happens here and
 * the stylesheet only ever sees the `.dark` class. That keeps one definition of
 * dark in CSS instead of two (a class rule and a media query) that can drift
 * apart, and it means the toggle and the OS switch drive the same single path.
 *
 * Device-scoped rather than account-scoped, deliberately: which theme suits you
 * depends on the screen you are looking at and the light you are sitting in,
 * not on who you are. Signing in on a different machine should not drag your
 * laptop's dark mode onto a bright office monitor.
 */

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'vera.theme'

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    // Safari in private browsing throws on localStorage. A theme is not worth
    // taking the app down for.
    return 'system'
  }
}

function apply(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference)

  useEffect(() => {
    apply(preference)
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // Preference simply doesn't persist. The app still works.
    }
  }, [preference])

  // Following the system means following it while the app is open, not only at
  // load — macOS and iOS both switch on a schedule.
  useEffect(() => {
    if (preference !== 'system') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [preference])

  const setTheme = useCallback((next: ThemePreference) => setPreference(next), [])

  return { preference, setTheme }
}
