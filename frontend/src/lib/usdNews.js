/* Shared USD economic-news logic (ForexFactory weekly calendar).
   The feed reports times in UTC; everything here is converted to US Eastern
   (America/New_York, EST/EDT) and filtered to TODAY, resetting at ET midnight.
   Used by the full News page and by the Dashboard news panel. */
import { useEffect, useState, useMemo, useCallback } from 'react'

export const ET = 'America/New_York'

export const IMPACT = {
  High:    { color: '#E05252', label: 'High' },   // red folder
  Medium:  { color: '#F59E0B', label: 'Medium' }, // orange folder
  Low:     { color: '#EAB308', label: 'Low' },    // yellow folder
  Holiday: { color: '#7A7A7A', label: 'Holiday' },
}

export function impactMeta(raw) {
  const key = Object.keys(IMPACT).find(k => (raw || '').toLowerCase().includes(k.toLowerCase()))
  return IMPACT[key] || { color: '#7A7A7A', label: raw || '—' }
}

/* Eastern date key ("YYYY-MM-DD") for a JS Date */
export function etDateKey(date) {
  return date.toLocaleDateString('en-CA', { timeZone: ET }) // en-CA => ISO-like YYYY-MM-DD
}

/* Parse a feed event (date MM-DD-YYYY, time "h:mmam"/"All Day"/…, in UTC)
   into { key: eastern date key, time: eastern time label, ts: sort key, allDay } */
export function parseEvent(ev) {
  const dm = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ev.date || '')
  if (!dm) return { key: '', time: ev.time || '', ts: 0, allDay: true }
  const [, mm, dd, yyyy] = dm.map(Number)
  const tm = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec((ev.time || '').trim())
  if (!tm) {
    // All Day / Tentative / blank — anchor to the feed date, no timezone shift
    return { key: `${dm[3]}-${dm[1]}-${dm[2]}`, time: ev.time || 'All Day', ts: Date.UTC(yyyy, mm - 1, dd), allDay: true }
  }
  let hour = Number(tm[1]) % 12
  if (/pm/i.test(tm[3])) hour += 12
  const utc = new Date(Date.UTC(yyyy, mm - 1, dd, hour, Number(tm[2])))
  return {
    key:  etDateKey(utc),
    time: utc.toLocaleTimeString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' }),
    ts:   utc.getTime(),
    allDay: false,
  }
}

/* ms until the next Eastern midnight (for the daily reset) */
export function msToNextEtMidnight() {
  const parts = new Date().toLocaleTimeString('en-US', { timeZone: ET, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const [h, m, s] = parts.split(':').map(Number)
  const elapsed = (h % 24) * 3600 + m * 60 + s
  return (86400 - elapsed + 5) * 1000
}

/* Today's USD events in ET, with loading/error state and an ET-midnight reset. */
export function useUsdNews() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [updated, setUpdated] = useState(null)
  const [dayTick, setDayTick] = useState(0) // bumps at Eastern midnight to re-filter to the new day

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/leaderboard-data?action=news')
      const data = await r.json()
      if (data.error && !data.events?.length) throw new Error(data.error)
      setEvents(data.events || [])
      setUpdated(data.updated || null)
    } catch (e) {
      setError(e.message || 'Could not load news.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Reset at Eastern midnight: re-filter to the new day and re-fetch
  useEffect(() => {
    const t = setTimeout(() => { setDayTick(x => x + 1); load() }, msToNextEtMidnight())
    return () => clearTimeout(t)
  }, [dayTick, load])

  const todayKey = useMemo(() => etDateKey(new Date()), [dayTick])

  const todaysEvents = useMemo(() => {
    return events
      .map(ev => ({ ...ev, _et: parseEvent(ev) }))
      .filter(ev => ev._et.key === todayKey)
      .sort((a, b) => a._et.ts - b._et.ts)
  }, [events, todayKey])

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { timeZone: ET, weekday: 'long', month: 'long', day: 'numeric' }),
    [dayTick]
  )

  return { todaysEvents, loading, error, updated, todayLabel, reload: load }
}
