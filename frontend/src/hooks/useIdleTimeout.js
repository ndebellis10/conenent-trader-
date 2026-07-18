/**
 * Auto-logout after 30 minutes of inactivity.
 * Shows a warning toast at 25 minutes.
 *
 * Usage (in AppLayout or a top-level component):
 *   useIdleTimeout({ onTimeout: logout, onWarning: () => toast.warn(...) })
 */
import { useEffect, useRef, useCallback } from 'react'

const IDLE_MS    = 30 * 60 * 1000   // 30 minutes
const WARN_MS    = 25 * 60 * 1000   // warn at 25 minutes
const TICK_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'focus']

export function useIdleTimeout({ onTimeout, onWarning } = {}) {
  const timeoutRef = useRef(null)
  const warnRef    = useRef(null)
  const warnedRef  = useRef(false)

  const reset = useCallback(() => {
    warnedRef.current = false
    clearTimeout(timeoutRef.current)
    clearTimeout(warnRef.current)

    warnRef.current = setTimeout(() => {
      if (!warnedRef.current) {
        warnedRef.current = true
        onWarning?.()
      }
    }, WARN_MS)

    timeoutRef.current = setTimeout(() => {
      onTimeout?.()
    }, IDLE_MS)
  }, [onTimeout, onWarning])

  useEffect(() => {
    TICK_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      TICK_EVENTS.forEach(e => window.removeEventListener(e, reset))
      clearTimeout(timeoutRef.current)
      clearTimeout(warnRef.current)
    }
  }, [reset])
}
