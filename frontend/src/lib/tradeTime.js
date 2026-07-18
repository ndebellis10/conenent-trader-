/* Trade duration ("time in trade") helpers.

   Trades can carry times in two shapes:
   - Manual log form:  entryTime/exitTime as "HH:MM", paired with the trade's `date`
   - Tradovate import: entryTime/exitTime as full ISO timestamps
   Anything without both ends returns null so callers can skip it. */

const ISO_LIKE = /\d{4}-\d{2}-\d{2}T/
const HHMM     = /^(\d{1,2}):(\d{2})$/

const DAY_MS = 86400000

function toMs(value, fallbackDate) {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null

  if (ISO_LIKE.test(raw)) {
    const t = new Date(raw).getTime()
    return isNaN(t) ? null : t
  }

  const m = HHMM.exec(raw)
  if (!m) return null
  const day = String(fallbackDate || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const t = new Date(`${day}T${m[1].padStart(2, '0')}:${m[2]}:00`).getTime()
  return isNaN(t) ? null : t
}

/* Duration of a trade in ms, or null when it isn't known. */
export function tradeDurationMs(trade) {
  if (!trade) return null
  const start = toMs(trade.entryTime, trade.date)
  const end   = toMs(trade.exitTime,  trade.date)
  if (start == null || end == null) return null

  let diff = end - start
  if (diff < 0) diff += DAY_MS // crossed midnight on a same-day "HH:MM" pair
  if (diff < 0 || diff > 30 * DAY_MS) return null // implausible — treat as unknown
  return diff
}

/* "4h 12m" / "38m" / "45s" */
export function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return '—'
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 1) return `${Math.max(0, Math.round(ms / 1000))}s`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

/* Average duration across trades that have both ends recorded.
   Returns { ms, counted } — counted is how many trades contributed. */
export function avgTradeDuration(trades = []) {
  const durations = trades.map(tradeDurationMs).filter(d => d != null)
  if (!durations.length) return { ms: null, counted: 0 }
  return { ms: durations.reduce((a, b) => a + b, 0) / durations.length, counted: durations.length }
}
