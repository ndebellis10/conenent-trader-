import { useState, useEffect, useMemo } from 'react'
import { NotebookPen, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const BLUE = '#3B82F6'

/* A daily notebook — journal your day whether or not you took a trade.
   One entry per calendar day, stored per account. Local-first (survives on
   this browser); syncs can be layered on later. */
const nbKey = email => `ct-notebook__${String(email || 'guest').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const prettyDate = key => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
const shiftDay = (key, delta) => {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const MOODS = [
  { key: 'green',   label: 'Great',   color: '#4CAF7D' },
  { key: 'neutral', label: 'Okay',    color: '#3B82F6' },
  { key: 'red',     label: 'Rough',   color: '#E05252' },
]

export default function Notebook() {
  const { user } = useAuth()
  const email = user?.email || null

  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(nbKey(email)) || '{}') } catch { return {} }
  })
  const [day, setDay] = useState(todayKey)

  // Persist on any change
  useEffect(() => {
    try { localStorage.setItem(nbKey(email), JSON.stringify(entries)) } catch { /* private mode */ }
  }, [entries, email])

  const entry = entries[day] || { text: '', mood: '' }
  const setText = text => setEntries(prev => ({ ...prev, [day]: { ...(prev[day] || {}), text } }))
  const setMood = mood => setEntries(prev => ({ ...prev, [day]: { ...(prev[day] || {}), mood: (prev[day]?.mood === mood ? '' : mood) } }))

  const pastDays = useMemo(
    () => Object.keys(entries)
      .filter(k => (entries[k]?.text || '').trim())
      .sort((a, b) => b.localeCompare(a)),
    [entries]
  )

  const isToday = day === todayKey()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 4 }}>
        <NotebookPen size={20} color={BLUE} />
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Notebook</h1>
      </div>
      <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 22px' }}>Journal your day — trade or no trade. One entry per day, private to you.</p>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Today's / selected day's entry */}
        <div style={{ flex: 2, minWidth: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button onClick={() => setDay(d => shiftDay(d, -1))} style={navBtn} title="Previous day"><ChevronLeft size={16} /></button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#F0F0F0', fontSize: '0.95rem', fontWeight: 700 }}>{isToday ? 'Today' : prettyDate(day)}</div>
              {isToday && <div style={{ color: '#6E6E6E', fontSize: '0.72rem' }}>{prettyDate(day)}</div>}
            </div>
            <button onClick={() => setDay(d => shiftDay(d, 1))} disabled={isToday} style={{ ...navBtn, opacity: isToday ? 0.35 : 1, cursor: isToday ? 'default' : 'pointer' }} title="Next day"><ChevronRight size={16} /></button>
            <input type="date" value={day} max={todayKey()} onChange={e => e.target.value && setDay(e.target.value)}
              style={{ background: '#242424', border: '1px solid #3A3A3A', borderRadius: 8, color: '#C0C0C0', padding: '7px 10px', fontSize: '0.8rem', outline: 'none' }} />
          </div>

          {/* Mood */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {MOODS.map(m => {
              const on = entry.mood === m.key
              return (
                <button key={m.key} onClick={() => setMood(m.key)}
                  style={{ padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '0.78rem', fontWeight: on ? 700 : 500,
                    border: `1px solid ${on ? m.color : '#333'}`, background: on ? `${m.color}22` : 'transparent', color: on ? m.color : '#8A8A8A' }}>
                  {m.label}
                </button>
              )
            })}
          </div>

          <textarea
            value={entry.text}
            onChange={e => setText(e.target.value)}
            placeholder="How did the day go? What did you see, feel, learn? Even a no-trade day is worth writing down…"
            rows={14}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#151515', border: '1px solid #2E2E2E', borderRadius: 12,
              padding: '15px 17px', color: '#E4E4E4', fontSize: '0.9rem', lineHeight: 1.7, fontFamily: 'Inter, sans-serif', outline: 'none' }}
          />
          <div style={{ color: '#4A4A4A', fontSize: '0.72rem', marginTop: 6 }}>{entry.text.trim() ? 'Saved automatically' : ''}</div>
        </div>

        {/* Past entries */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, color: '#9A9A9A', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Calendar size={13} /> Past entries
          </div>
          {pastDays.length === 0 ? (
            <p style={{ color: '#5E5E5E', fontSize: '0.82rem' }}>No entries yet. Start with today.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pastDays.map(k => {
                const m = MOODS.find(x => x.key === entries[k]?.mood)
                return (
                  <button key={k} onClick={() => setDay(k)}
                    style={{ textAlign: 'left', background: k === day ? 'rgba(59,130,246,0.1)' : '#1C1C1C', border: `1px solid ${k === day ? 'rgba(59,130,246,0.4)' : '#2A2A2A'}`,
                      borderRadius: 10, padding: '11px 13px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m && <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />}
                      <span style={{ color: '#D0D0D0', fontSize: '0.8rem', fontWeight: 600 }}>{prettyDate(k)}</span>
                    </div>
                    <div style={{ color: '#6E6E6E', fontSize: '0.76rem', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(entries[k].text || '').trim().slice(0, 60)}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const navBtn = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid #333', background: '#1E1E1E',
  color: '#A0A0A0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
