import { useEffect, useState, useMemo, useCallback } from 'react'
import { Newspaper, RefreshCw, Loader2, AlertTriangle, Folder } from 'lucide-react'

/* USD economic news — ForexFactory weekly calendar, filtered to USD + TODAY (Eastern).
   The feed reports times in UTC; we convert to US Eastern (America/New_York, EST/EDT).
   Resets to the new day at Eastern midnight. Data via /api/leaderboard-data?action=news. */

const ET = 'America/New_York'

const IMPACT = {
  High:    { color: '#E05252', label: 'High' },   // red folder
  Medium:  { color: '#F59E0B', label: 'Medium' }, // orange folder
  Low:     { color: '#EAB308', label: 'Low' },    // yellow folder
  Holiday: { color: '#7A7A7A', label: 'Holiday' },
}

function impactMeta(raw) {
  const key = Object.keys(IMPACT).find(k => (raw || '').toLowerCase().includes(k.toLowerCase()))
  return IMPACT[key] || { color: '#7A7A7A', label: raw || '—' }
}

/* Eastern date key ("YYYY-MM-DD") for a JS Date */
function etDateKey(date) {
  return date.toLocaleDateString('en-CA', { timeZone: ET }) // en-CA => ISO-like YYYY-MM-DD
}

/* Parse a feed event (date MM-DD-YYYY, time "h:mmam"/"All Day"/…, in UTC)
   into { key: eastern date key, time: eastern time label, ts: sort key, allDay } */
function parseEvent(ev) {
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
function msToNextEtMidnight() {
  const parts = new Date().toLocaleTimeString('en-US', { timeZone: ET, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const [h, m, s] = parts.split(':').map(Number)
  const elapsed = (h % 24) * 3600 + m * 60 + s
  return (86400 - elapsed + 5) * 1000
}

export default function News() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Newspaper size={22} color="#3B82F6" />
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#F5F5F5', margin: 0 }}>USD News — Today</h1>
          </div>
          <p style={{ color: '#888', fontSize: '0.82rem', margin: '4px 0 0 32px' }}>
            {todayLabel} · U.S. events · times in ET · via ForexFactory
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.08)', color: '#3B82F6', fontSize: '0.82rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      {/* Impact legend */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 18, flexWrap: 'wrap' }}>
        {['High', 'Medium', 'Low'].map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Folder size={15} color={IMPACT[k].color} fill={IMPACT[k].color} fillOpacity={0.85} />
            <span style={{ color: '#999', fontSize: '0.75rem' }}>{IMPACT[k].label} impact</span>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
          <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: '#3B82F6' }} />
          <div style={{ marginTop: 12, fontSize: '0.85rem' }}>Loading today's USD news…</div>
        </div>
      )}

      {!loading && error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 10, padding: '14px 18px', color: '#E05252', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {!loading && !error && !todaysEvents.length && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666', fontSize: '0.9rem' }}>
          No USD events scheduled for today.
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todaysEvents.map((ev, i) => {
            const im = impactMeta(ev.impact)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#242424', border: '1px solid #3A3A3A', borderLeft: `3px solid ${im.color}`, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ width: 78, flexShrink: 0, color: '#A0A0A0', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>{ev._et.time || '—'}</div>
                <Folder size={17} color={im.color} fill={im.color} fillOpacity={0.85} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#F5F5F5', fontSize: '0.9rem', fontWeight: 600 }}>{ev.title}</div>
                  {(ev.forecast || ev.previous) && (
                    <div style={{ color: '#777', fontSize: '0.75rem', marginTop: 3, display: 'flex', gap: 16 }}>
                      {ev.forecast ? <span>Forecast: <span style={{ color: '#A0A0A0' }}>{ev.forecast}</span></span> : null}
                      {ev.previous ? <span>Previous: <span style={{ color: '#A0A0A0' }}>{ev.previous}</span></span> : null}
                    </div>
                  )}
                </div>
                <span style={{ flexShrink: 0, color: im.color, fontSize: '0.72rem', fontWeight: 700 }}>{im.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {updated && !loading && (
        <div style={{ textAlign: 'center', color: '#555', fontSize: '0.72rem', marginTop: 16 }}>
          Updated {new Date(updated).toLocaleString('en-US', { timeZone: ET })} ET
        </div>
      )}
    </div>
  )
}
