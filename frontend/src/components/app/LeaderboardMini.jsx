import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, ArrowRight } from 'lucide-react'
import { getLeaderboard } from '../../lib/leaderboardApi'
import { useAuthStore } from '../../store/authStore'

/* Compact top-5 leaderboard for the dashboard. Reads the same source as the
   full board; the viewer's own row is highlighted, and if they rank outside
   the top 5 their position is appended so they always see where they stand. */

const MEDALS = ['🥇', '🥈', '🥉']

/* Hoisted — defining this inside the component would remount every row each render */
function Row({ r, rank, highlight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px',
      borderRadius: 8,
      background: highlight ? 'rgba(59,130,246,0.09)' : 'transparent',
      border: highlight ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
    }}>
      <span style={{ width: 22, textAlign: 'center', fontSize: rank < 3 ? '0.95rem' : '0.76rem', color: '#6A6A6A', fontWeight: 700 }}>
        {rank < 3 ? MEDALS[rank] : rank + 1}
      </span>
      <span style={{
        flex: 1, minWidth: 0, color: highlight ? '#3B82F6' : '#DcDcDc', fontSize: '0.85rem',
        fontWeight: highlight ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {r.display_name || String(r.email || '').split('@')[0]}
      </span>
      <span style={{ color: '#666', fontSize: '0.74rem', flexShrink: 0 }}>
        {r.win_rate != null ? `${Math.round(r.win_rate)}%` : '—'}
      </span>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.83rem', fontWeight: 700, flexShrink: 0,
        color: (r.total_pnl ?? 0) >= 0 ? '#4CAF7D' : '#E05252',
      }}>
        {(r.total_pnl ?? 0) >= 0 ? '+' : '-'}${Math.abs(r.total_pnl ?? 0).toFixed(2)}
      </span>
    </div>
  )
}

export default function LeaderboardMini({ limit = 5 }) {
  const navigate = useNavigate()
  const myEmail  = useAuthStore(s => s.currentUser?.email)
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getLeaderboard()
      .then(r => { if (alive) setRows(Array.isArray(r) ? r : []) })
      .catch(() => { if (alive) setRows([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const { top, mine, myRank } = useMemo(() => {
    const sorted = [...rows].sort((a, b) => (b.total_pnl ?? 0) - (a.total_pnl ?? 0))
    const me = String(myEmail || '').toLowerCase()
    const idx = sorted.findIndex(r => String(r.email || '').toLowerCase() === me)
    return {
      top: sorted.slice(0, limit),
      mine: idx >= limit ? sorted[idx] : null,   // only append when outside the cut
      myRank: idx,
    }
  }, [rows, myEmail, limit])

  if (loading || !top.length) return null

  const card = { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 14, padding: '18px 20px' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <Trophy size={15} color="#3B82F6" />
        <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700 }}>Leaderboard</span>
        <span style={{ color: '#555', fontSize: '0.74rem' }}>by net P&amp;L</span>
        <button
          onClick={() => navigate('/app/leaderboard')}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Full board <ArrowRight size={12} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {top.map((r, i) => (
          <Row key={r.email || i} r={r} rank={i}
            highlight={String(r.email || '').toLowerCase() === String(myEmail || '').toLowerCase()} />
        ))}

        {mine && (
          <>
            <div style={{ color: '#3A3A3A', textAlign: 'center', fontSize: '0.8rem', lineHeight: 1 }}>···</div>
            <Row r={mine} rank={myRank} highlight />
          </>
        )}
      </div>
    </div>
  )
}
