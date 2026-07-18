import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react'
import { subDays } from 'date-fns'
import AlanMascot from '../AlanMascot'
import { faithAiApi } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

/* "What to work on" — Alan scans the last 30 days when you land on the dashboard
   and tells you the one thing to fix. The result is cached per user per day so
   logging in repeatedly doesn't re-run (and re-bill) the analysis. */

const safeDate = d => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }
const todayKey = () => new Date().toLocaleDateString('en-CA')

function cacheKey(email) {
  const safe = String(email || 'guest').replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return `ct-daily-insight__${safe}`
}

function readCache(email) {
  try {
    const raw = localStorage.getItem(cacheKey(email))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.day === todayKey() ? parsed : null
  } catch { return null }
}

function writeCache(email, result, tradeCount) {
  try {
    localStorage.setItem(cacheKey(email), JSON.stringify({ day: todayKey(), result, tradeCount }))
  } catch { /* quota / private mode — insight just won't cache */ }
}

export default function DailyInsight({ trades }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const email = user?.email

  const recent = useMemo(() => {
    const cutoff = subDays(new Date(), 30)
    return trades.filter(t => safeDate(t.createdAt || t.date) >= cutoff)
  }, [trades])

  const [fetched, setFetched] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  // AI not configured on this deployment — hide the card rather than show a
  // permanent error box on everyone's dashboard
  const [unavailable, setUnavailable] = useState(false)

  // Today's cached read, resolved during render — stale once new trades are logged
  const cached = useMemo(() => {
    const c = readCache(email)
    return c && c.tradeCount === recent.length ? c.result : null
  }, [email, recent.length])

  const result = fetched ?? cached

  const run = useCallback(async () => {
    if (!recent.length) return
    setLoading(true); setError(null)
    try {
      const r = await faithAiApi.monthlySummary(recent)
      setFetched(r)
      writeCache(email, r, recent.length)
    } catch (e) {
      const msg = e.message || ''
      if (/not configured/i.test(msg)) setUnavailable(true)
      else setError(msg || 'Could not reach Alan right now.')
    } finally {
      setLoading(false)
    }
  }, [recent, email])

  // Only hit the API when today's cache can't answer it
  useEffect(() => {
    if (!recent.length || cached || fetched) return
    run()
  }, [recent.length, cached, fetched, run])

  if (!recent.length || unavailable) return null

  const card = { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 14 }

  return (
    <div style={{ ...card, borderColor: 'rgba(59,130,246,0.25)', padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: result || loading || error ? 14 : 0, flexWrap: 'wrap' }}>
        <AlanMascot size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#F5F5F5', fontSize: '0.9rem', fontWeight: 700 }}>What to work on</div>
          <div style={{ color: '#666', fontSize: '0.76rem' }}>
            Alan scanned your last {recent.length} trade{recent.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          title="Re-run the analysis"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)', color: '#3B82F6', fontSize: '0.78rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
          {loading ? 'Scanning…' : 'Refresh'}
        </button>
      </div>

      {loading && !result && (
        <div style={{ color: '#666', fontSize: '0.84rem', padding: '6px 0' }}>Reviewing your recent trades…</div>
      )}

      {error && !result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#E05252', fontSize: '0.82rem' }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[
            { key: 'weakness',   label: 'Fix this',      color: '#E05252' },
            { key: 'ruleChange', label: 'Rule to add',   color: '#3B82F6' },
            { key: 'strength',   label: 'Keep doing',    color: '#4CAF7D' },
          ].map(({ key, label, color }) => (
            result[key] ? (
              <div key={key} style={{ background: '#191919', border: `1px solid ${color}33`, borderRadius: 10, padding: '13px 15px' }}>
                <div style={{ color, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{label}</div>
                <p style={{ color: '#C0C0C0', fontSize: '0.83rem', lineHeight: 1.6, margin: 0 }}>{result[key]}</p>
              </div>
            ) : null
          ))}
        </div>
      )}

      {result && (
        <button
          onClick={() => navigate('/app/faith-ai?tab=summary')}
          style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          See the full 30-day analysis <ArrowRight size={13} />
        </button>
      )}
    </div>
  )
}
