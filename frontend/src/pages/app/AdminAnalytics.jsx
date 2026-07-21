import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useAdminStore } from '../../store/adminStore'
import { BarChart2, Users, Activity, Loader2 } from 'lucide-react'

const BLUE = '#3B82F6'
const GREEN = '#4CAF7D'

const EVENT_LABEL = {
  signup_completed: 'Signups', login: 'Logins',
  onboarding_form_done: 'Intake forms', onboarding_videos_done: 'Onboarding videos',
  first_trade_logged: 'First trades', trade_logged: 'Trades logged',
  alan_message_sent: 'Alan messages', lesson_completed: 'Lessons completed',
  chart_analyzed: 'Charts analyzed',
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div style={{ background: '#242424', border: '1px solid #3A3A3A', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8A8A8A', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>
        <Icon size={14} color={BLUE} /> {label}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.7rem', color: '#F5F5F5', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export default function AdminAnalytics() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { if (!isAdmin) navigate('/app/dashboard', { replace: true }) }, [isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    fetch('/api/admin/analytics', { headers: { 'x-admin-key': useAdminStore.getState().sessionKey }, credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (!alive) return; if (d.ok) setData(d); else setError(d.error || d.reason || 'Could not load analytics'); setLoading(false) })
      .catch(e => { if (alive) { setError(String(e.message || e)); setLoading(false) } })
    return () => { alive = false }
  }, [isAdmin])

  if (!isAdmin) return null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8A8A8A', padding: 40 }}>
      <Loader2 size={18} className="animate-spin" /> Loading analytics…
    </div>
  )

  if (error) return (
    <div style={{ color: '#E05252', padding: 30 }}>Analytics unavailable: {error}</div>
  )

  const maxFunnel = Math.max(1, ...data.funnel.map(f => f.count))
  const maxDaily  = Math.max(1, ...data.daily.map(d => d.active))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 4 }}>
        <BarChart2 size={20} color={BLUE} />
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Analytics</h1>
      </div>
      <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 22px' }}>What people actually do in the app. Events only — no trade or journal content.</p>

      {/* Top stats */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 26 }}>
        <Stat label="Active (7 days)"  value={data.activeUsers7d}  icon={Users} />
        <Stat label="Active (30 days)" value={data.activeUsers30d} icon={Users} />
        <Stat label="Events (30 days)" value={data.totalEvents30d} icon={Activity} />
      </div>

      {/* Onboarding funnel */}
      <div style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 12, padding: '18px 20px', marginBottom: 22 }}>
        <h3 style={{ color: '#F5F5F5', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 4px' }}>Onboarding funnel</h3>
        <p style={{ color: '#777', fontSize: '0.75rem', margin: '0 0 16px' }}>Distinct people who reached each step (last 30 days).</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.funnel.map((f, i) => {
            const prev = i > 0 ? data.funnel[i - 1].count : null
            const pct = prev ? Math.round((f.count / Math.max(1, prev)) * 100) : null
            return (
              <div key={f.step} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 130, flexShrink: 0, color: '#C8C8C8', fontSize: '0.82rem' }}>{f.step}</span>
                <div style={{ flex: 1, height: 22, background: '#242424', borderRadius: 5, overflow: 'hidden', minWidth: 60 }}>
                  <div style={{ width: `${(f.count / maxFunnel) * 100}%`, height: '100%', background: BLUE, borderRadius: 5, transition: 'width .4s' }} />
                </div>
                <span style={{ width: 42, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#F5F5F5', fontSize: '0.85rem' }}>{f.count}</span>
                <span style={{ width: 54, textAlign: 'right', color: pct != null && pct < 60 ? '#E0A33D' : '#5E5E5E', fontSize: '0.72rem' }}>
                  {pct != null ? `${pct}%` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
        {/* Daily active */}
        <div style={{ flex: 1, minWidth: 300, background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 12, padding: '18px 20px' }}>
          <h3 style={{ color: '#F5F5F5', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 16px' }}>Daily active users (14 days)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120 }}>
            {data.daily.map(d => (
              <div key={d.date} title={`${d.date}: ${d.active}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${(d.active / maxDaily) * 100}%`, minHeight: d.active ? 3 : 0, background: BLUE, borderRadius: '3px 3px 0 0' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: '#5E5E5E', fontSize: '0.66rem' }}>
            <span>{data.daily[0]?.date.slice(5)}</span>
            <span>today</span>
          </div>
        </div>

        {/* Event counts */}
        <div style={{ flex: 1, minWidth: 300, background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 12, padding: '18px 20px' }}>
          <h3 style={{ color: '#F5F5F5', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 16px' }}>Events (last 30 days)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {data.eventCounts.map(e => (
              <div key={e.event} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#B0B0B0', fontSize: '0.82rem' }}>{EVENT_LABEL[e.event] || e.event}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: e.count ? GREEN : '#4A4A4A', fontSize: '0.85rem' }}>{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
