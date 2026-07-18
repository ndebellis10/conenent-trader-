import { useNavigate } from 'react-router-dom'
import { Newspaper, Loader2, AlertTriangle, Folder } from 'lucide-react'
import { impactMeta, useUsdNews } from '../../lib/usdNews'

/* Compact "Today's USD News" panel for the Dashboard.
   Shares its data + ET handling with the full News page via useUsdNews(). */
export default function NewsPanel({ limit = 5 }) {
  const navigate = useNavigate()
  const { todaysEvents, loading, error, todayLabel } = useUsdNews()

  const shown = todaysEvents.slice(0, limit)
  const extra = todaysEvents.length - shown.length

  return (
    <div style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '20px 22px' }}>
      {/* Head */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Newspaper size={16} color="#3B82F6" />
          <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700 }}>Today's USD News</span>
          <span style={{ color: '#555', fontSize: '0.75rem' }}>{todayLabel} · ET</span>
        </div>
        <button
          onClick={() => navigate('/app/news')}
          style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
        >
          View all →
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#666', fontSize: '0.82rem', padding: '14px 0' }}>
          <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', color: '#3B82F6' }} /> Loading today's news…
        </div>
      )}

      {!loading && error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#E05252', fontSize: '0.82rem', padding: '10px 0' }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {!loading && !error && !todaysEvents.length && (
        <div style={{ color: '#666', fontSize: '0.85rem', padding: '14px 0' }}>
          No USD events scheduled for today.
        </div>
      )}

      {!loading && !error && !!shown.length && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.map((ev, i) => {
            const im = impactMeta(ev.impact)
            return (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid #252525' : 'none' }}
              >
                <div style={{ width: 68, flexShrink: 0, color: '#A0A0A0', fontSize: '0.76rem', fontFamily: 'JetBrains Mono, monospace' }}>
                  {ev._et.time || '—'}
                </div>
                <Folder size={15} color={im.color} fill={im.color} fillOpacity={0.85} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#E8E8E8', fontSize: '0.84rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.title}
                  </div>
                </div>
                {ev.forecast ? (
                  <span style={{ flexShrink: 0, color: '#777', fontSize: '0.74rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    fc {ev.forecast}
                  </span>
                ) : null}
                <span style={{ flexShrink: 0, color: im.color, fontSize: '0.7rem', fontWeight: 700, width: 48, textAlign: 'right' }}>{im.label}</span>
              </div>
            )
          })}

          {extra > 0 && (
            <button
              onClick={() => navigate('/app/news')}
              style={{ marginTop: 10, background: 'none', border: 'none', color: '#666', fontSize: '0.76rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
              +{extra} more {extra === 1 ? 'event' : 'events'} today →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
