/**
 * Product analytics — event tracking only.
 *
 * PRIVACY: never pass trade content, P&L, journal text, prayers, or any
 * personal data as props. Only event names and small non-sensitive context
 * (e.g. a lesson id, an onboarding step). The backend also whitelists.
 *
 * Fire-and-forget: never blocks the UI, never throws, silently no-ops on error.
 */

// The only events we record. Anything not in here is dropped server-side too.
export const EVENTS = {
  SIGNUP: 'signup_completed',
  LOGIN: 'login',
  ONBOARDING_FORM: 'onboarding_form_done',
  ONBOARDING_VIDEOS: 'onboarding_videos_done',
  FIRST_TRADE: 'first_trade_logged',
  TRADE_LOGGED: 'trade_logged',
  ALAN_MESSAGE: 'alan_message_sent',
  LESSON_COMPLETED: 'lesson_completed',
  CHART_ANALYZED: 'chart_analyzed',
}

export function track(event, props = {}) {
  try {
    if (!event) return
    // Keep props tiny and safe — strings/numbers/bools only, capped length
    const safe = {}
    for (const [k, v] of Object.entries(props || {})) {
      if (['string', 'number', 'boolean'].includes(typeof v)) {
        safe[k] = typeof v === 'string' ? v.slice(0, 120) : v
      }
    }
    fetch('/api/user/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ event, props: safe }),
      keepalive: true, // still sends if the page is navigating away
    }).catch(() => {})
  } catch { /* analytics must never break the app */ }
}
