import { useEffect, useState } from 'react'

const STORAGE_KEY = 'vera.scrollTracking'

/**
 * Whether the issues list follows the document. Two defensible behaviors, so it
 * is the user's call rather than ours: following keeps the issue you are reading
 * about next to the page you are reading, and not following leaves a panel you
 * scrolled somewhere on purpose exactly where you put it.
 *
 * Default on, because the highlight is easy to miss when it lands off-screen and
 * a reviewer working an unfamiliar document benefits from being taken there.
 * Stored as a word rather than a boolean so a missing key and an explicit "off"
 * cannot be confused: absent means never asked, which is on.
 */
export function useScrollTracking() {
  const [tracking, setTracking] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off'
    } catch {
      // Safari in private browsing throws. A preference is not worth taking the
      // app down for.
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, tracking ? 'on' : 'off')
    } catch {
      // It simply doesn't persist; the toggle still works for this session.
    }
  }, [tracking])

  return [tracking, setTracking] as const
}
