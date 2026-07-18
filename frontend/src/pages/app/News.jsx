import { Newspaper, RefreshCw, Loader2, AlertTriangle, Folder } from 'lucide-react'
import { ET, IMPACT, impactMeta, useUsdNews } from '../../lib/usdNews'

/* USD economic news — ForexFactory weekly calendar, filtered to USD + TODAY (Eastern).
   Feed parsing / ET conversion / daily reset all live in src/lib/usdNews.js, shared
   with the Dashboard news panel. Data via /api/leaderboard-data?action=news. */

export default function News() {
  const { todaysEvents, loading, error, updated, todayLabel, reload } = useUsdNews()

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
          onClick={reload}
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
