/**
 * Leaderboard — sections render in the app sidebar while you're on this page:
 * Win Rate · Most Profit · Most Trades · Backtest Profit · Most Backtested ·
 * Backtest Win Rate. See LEADERBOARD_NAV in layouts/AppLayout.jsx.
 */
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTradeStore }  from '../../store/tradeStore'
import { useAuthStore }   from '../../store/authStore'
import { liveTrades, backtestTrades, summarize } from '../../lib/tradeFilters'
import { useAuth }        from '../../contexts/AuthContext'
import { useAdminStore }  from '../../store/adminStore'
import { getLeaderboard } from '../../lib/leaderboardApi'
import { Trophy, RefreshCw, Loader2, TrendingUp, Target, RotateCcw, FlaskConical
} from 'lucide-react'

function cleanName(raw) {
  if (!raw) return 'Trader'
  if (raw.includes('@')) return raw.split('@')[0]
  return raw
}



function Bar({ value, color }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#2A2A2A', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ color, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', fontWeight: 700, minWidth: 38, textAlign: 'right' }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

const TH = ({ children, hi }) => (
  <th style={{ padding: '12px 16px', color: hi ? '#3B82F6' : '#555', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #2E2E2E' }}>
    {children}
  </th>
)
const TD = ({ children, right, wide }) => (
  <td style={{ padding: '14px 16px', textAlign: right ? 'right' : 'left', verticalAlign: 'middle', minWidth: wide ? 140 : undefined }}>
    {children}
  </td>
)

function Mono({ children, color }) {
  return <span style={{ color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{children}</span>
}


/* ── Seniority-aware sort helper ─────────────────────────────── */
// Primary: whatever comparator fn says.
// Tiebreaker: earlier joined_at wins (seniority). Users with no joined_at
// (e.g. new local-only entries) are treated as joining right now → go last.
function withSeniority(cmp) {
  return rows => [...rows].sort((a, b) => {
    const d = cmp(a, b)
    if (d !== 0) return d
    const aTs = a.joined_at ? new Date(a.joined_at).getTime() : Infinity
    const bTs = b.joined_at ? new Date(b.joined_at).getTime() : Infinity
    return aTs - bTs
  })
}

/* ── Tab definitions ─────────────────────────────────────────
   Live tabs rank real trades only; backtest tabs rank paper results
   imported through the Backtest page (tagged 'Backtest'). */

// Older leaderboard rows predate the backtest fields — treat them as zero
const bt  = (row, k) => row[`backtest_${k}`] ?? 0
const btMoney = v => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`

const BT_CELLS = row => [
  <TD key="bt"><Mono color="#B98CE0">{bt(row, 'trades')}</Mono></TD>,
  <TD key="btp" right>
    <Mono color={bt(row, 'pnl') >= 0 ? '#4CAF7D' : '#E05252'}>{btMoney(bt(row, 'pnl'))}</Mono>
  </TD>,
  <TD key="btw" wide><Bar value={bt(row, 'win_rate')} color="#B98CE0" /></TD>,
]
const BT_HEADS = ['BT Trades', 'BT Net P&L', 'BT Win Rate']

const TABS = [
  {
    id: 'winrate', label: 'Win Rate', icon: Target, color: '#5B9BD5',
    desc: 'Ranked by highest win percentage on live trades — seniority breaks ties',
    sort: withSeniority((a, b) => b.win_rate - a.win_rate),
    heads: ['Trades', 'Win Rate', 'Wins', 'Net P&L', 'R:R'],
    cells: row => [
      <TD key="t"><Mono color="#F5F5F5">{row.total_trades}</Mono></TD>,
      <TD key="wr" wide><Bar value={row.win_rate} color="#5B9BD5" /></TD>,
      <TD key="w">
        <Mono color="#4CAF7D">{row.wins}W</Mono>
        <span style={{ color: '#555', fontSize: '0.72rem', marginLeft: 4 }}>/ {row.total_trades}</span>
      </TD>,
      <TD key="pnl" right>
        <Mono color={row.total_pnl >= 0 ? '#4CAF7D' : '#E05252'}>
          {row.total_pnl >= 0 ? '+' : ''}${row.total_pnl.toFixed(2)}
        </Mono>
      </TD>,
      <TD key="rr"><Mono color="#3B82F6">{row.avg_rr != null ? `1:${row.avg_rr.toFixed(2)}` : '—'}</Mono></TD>,
    ],
  },
  {
    id: 'profit', label: 'Most Profit', icon: TrendingUp, color: '#4CAF7D',
    desc: 'Ranked by total net P&L on live trades',
    sort: withSeniority((a, b) => b.total_pnl - a.total_pnl),
    heads: ['Trades', 'Net P&L', 'Win Rate', 'R:R'],
    cells: row => [
      <TD key="t"><Mono color="#F5F5F5">{row.total_trades}</Mono></TD>,
      <TD key="pnl" right>
        <Mono color={row.total_pnl >= 0 ? '#4CAF7D' : '#E05252'}>
          {row.total_pnl >= 0 ? '+' : ''}${row.total_pnl.toFixed(2)}
        </Mono>
      </TD>,
      <TD key="wr" wide><Bar value={row.win_rate} color="#4CAF7D" /></TD>,
      <TD key="rr"><Mono color="#3B82F6">{row.avg_rr != null ? `1:${row.avg_rr.toFixed(2)}` : '—'}</Mono></TD>,
    ],
  },
  {
    id: 'mosttrades', label: 'Most Trades', icon: RotateCcw, color: '#3B82F6',
    desc: 'Ranked by total live trades logged — seniority breaks ties',
    sort: withSeniority((a, b) => b.total_trades - a.total_trades),
    heads: ['Trades', 'Win Rate', 'Net P&L', 'R:R'],
    cells: row => [
      <TD key="t"><Mono color="#3B82F6">{row.total_trades}</Mono></TD>,
      <TD key="wr" wide><Bar value={row.win_rate} color="#5B9BD5" /></TD>,
      <TD key="pnl" right>
        <Mono color={row.total_pnl >= 0 ? '#4CAF7D' : '#E05252'}>
          {row.total_pnl >= 0 ? '+' : ''}${row.total_pnl.toFixed(2)}
        </Mono>
      </TD>,
      <TD key="rr"><Mono color="#3B82F6">{row.avg_rr != null ? `1:${row.avg_rr.toFixed(2)}` : '—'}</Mono></TD>,
    ],
  },
  {
    id: 'btprofit', label: 'Backtest Profit', icon: FlaskConical, color: '#B98CE0',
    desc: 'Ranked by total P&L across imported backtest trades',
    sort: withSeniority((a, b) => bt(b, 'pnl') - bt(a, 'pnl')),
    heads: BT_HEADS, cells: BT_CELLS,
  },
  {
    id: 'bttrades', label: 'Most Backtested', icon: RotateCcw, color: '#B98CE0',
    desc: 'Ranked by number of backtest trades logged — reps put in',
    sort: withSeniority((a, b) => bt(b, 'trades') - bt(a, 'trades')),
    heads: BT_HEADS, cells: BT_CELLS,
  },
  {
    id: 'btwinrate', label: 'Backtest Win Rate', icon: Target, color: '#B98CE0',
    desc: 'Ranked by win percentage across backtest trades',
    sort: withSeniority((a, b) => bt(b, 'win_rate') - bt(a, 'win_rate')),
    heads: ['BT Trades', 'BT Win Rate', 'BT Net P&L'],
    cells: row => [
      <TD key="bt"><Mono color="#B98CE0">{bt(row, 'trades')}</Mono></TD>,
      <TD key="btw" wide><Bar value={bt(row, 'win_rate')} color="#B98CE0" /></TD>,
      <TD key="btp" right>
        <Mono color={bt(row, 'pnl') >= 0 ? '#4CAF7D' : '#E05252'}>{btMoney(bt(row, 'pnl'))}</Mono>
      </TD>,
    ],
  },
]

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const myEmail        = useAuthStore(s => s.currentUser?.email)
  const { isAdmin }    = useAuth()
  const sessionKey     = useAdminStore(s => s.sessionKey)
  const settings       = useTradeStore(s => s.settings)
  const updateSettings = useTradeStore(s => s.updateSettings)
  const trades         = useTradeStore(s => s.trades)

  const [rows,         setRows]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(false)
  // Section lives in the URL — the app sidebar renders these while you're on
  // this page (see LEADERBOARD_NAV in layouts/AppLayout.jsx)
  const [searchParams] = useSearchParams()
  const activeTab = TABS.some(t => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'winrate'
  const [resetting,    setResetting]    = useState(null)
  const [confirmEmail, setConfirmEmail] = useState(null)
  const [nameInput,    setNameInput]    = useState('')
  const [nameSaving,   setNameSaving]   = useState(false)

  // Determine if user needs to set a name (first time only) — never prompt admin
  const emailPrefix = myEmail?.split('@')[0]?.toLowerCase()
  const currentName = settings?.name
  const needsName   = !isAdmin && (
    !currentName
    || currentName === 'Trader'
    || currentName.includes('@')
    || currentName.toLowerCase() === emailPrefix
  )

  // Always compute current user's stats from local trades — no external DB needed
  const localEntry = useMemo(() => {
    if (!trades.length || !myEmail || isAdmin) return null
    // Don't inject local stats if this account has been banned by admin
    if (localStorage.getItem(`ft-lb-banned-${myEmail.toLowerCase()}`)) return null
    // Rank by the real first + last name from signup. The display name is a
    // casual handle and often drops the surname.
    const realName = settings?.fullName?.trim()
    const displayName = realName
      || ((currentName && currentName !== 'Trader') ? currentName : emailPrefix || myEmail.split('@')[0])
    // Backtest-tagged trades are paper results — ranked separately, never in live stats
    const live       = liveTrades(trades)
    const btStats    = summarize(backtestTrades(trades))
    if (!live.length && !btStats.count) return null
    const wins       = live.filter(t => t.result === 'Win').length
    const winRate    = live.length ? (wins / live.length) * 100 : 0
    const totalPnl   = live.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const rrTrades   = live.filter(t => t.riskReward)
    const avgRR      = rrTrades.length ? rrTrades.reduce((s, t) => s + parseFloat(t.riskReward), 0) / rrTrades.length : null
    const avgEntry   = live.length ? live.reduce((s, t) => s + (t.entryQuality ?? 5), 0) / live.length : 0
    const avgExit    = live.length ? live.reduce((s, t) => s + (t.exitQuality  ?? 5), 0) / live.length : 0
    const avgFaith   = live.length ? live.reduce((s, t) => s + (t.faithRating  ?? 0), 0) / live.length : 0
    const discipline = live.length ? live.reduce((s, t) => {
      if (t.followedPlan === 'Yes')       return s + 1
      if (t.followedPlan === 'Partially') return s + 0.5
      return s
    }, 0) / live.length : 0
    const faithScore = Math.round(
      winRate              * 0.35 +
      discipline * 100     * 0.20 +
      (avgEntry / 10)*100  * 0.15 +
      (avgExit  / 10)*100  * 0.15 +
      (avgFaith / 5 )*100  * 0.15
    )
    // Use the date of the earliest trade as this user's "seniority" timestamp
    const earliestTrade = [...live, ...backtestTrades(trades)].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))[0]
    const joinedAt = earliestTrade?.createdAt ? new Date(earliestTrade.createdAt).toISOString() : null

    return {
      email:        myEmail,
      display_name: displayName,
      total_trades: live.length,
      wins,
      win_rate:     Math.round(winRate * 10) / 10,
      total_pnl:    Math.round(totalPnl * 100) / 100,
      avg_rr:       avgRR != null ? Math.round(avgRR * 100) / 100 : null,
      avg_entry:    Math.round(avgEntry * 10) / 10,
      avg_exit:     Math.round(avgExit  * 10) / 10,
      avg_faith:    Math.round(avgFaith * 10) / 10,
      discipline:   Math.round(discipline * 1000) / 1000,
      faith_score:  faithScore,
      backtest_trades:   btStats.count,
      backtest_pnl:      btStats.pnl,
      backtest_win_rate: btStats.winRate,
      joined_at:    joinedAt,
    }
  }, [trades, myEmail, currentName, emailPrefix])

  // Merge Supabase rows with local entry — local entry fills the gap when DB isn't synced
  const mergedRows = useMemo(() => {
    if (!localEntry) return rows
    // If Supabase already has the user's row, replace it with fresh local stats
    // so the board always reflects their actual current trades
    // Emails are compared case-insensitively — a stored row saved with
    // different casing was leaving a stale duplicate that never updated
    const mine = String(myEmail || '').toLowerCase()
    const without = rows.filter(r => String(r.email || '').toLowerCase() !== mine)
    return [...without, localEntry]
  }, [rows, localEntry, myEmail])

  async function load() {
    setLoading(true)
    try {
      const data = await getLeaderboard()
      if (Array.isArray(data)) setRows(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Re-fetch every 60 s so admin deletes propagate to all open sessions
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  async function handleSetName(e) {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setNameSaving(true)
    // Save name — updateSettings already calls syncLeaderboard with current trades
    updateSettings({ name: trimmed })
    // Wait for sync then reload leaderboard so they appear
    await new Promise(r => setTimeout(r, 800))
    setNameSaving(false)
    load()
  }

  async function handleDelete(email) {
    setResetting(email)
    setConfirmEmail(null)
    try {
      await fetch(`/api/leaderboard-data?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': sessionKey },
      })
      // Remove the row entirely from local state
      setRows(prev => prev.filter(r => r.email !== email))
    } catch (err) {
      console.error('Failed to delete', err)
    } finally {
      setResetting(null)
    }
  }

  const tab    = TABS.find(t => t.id === activeTab) ?? TABS[0]
  // Only the top 10 are shown, whichever tab you're on
  const sorted = useMemo(() => tab.sort(mergedRows).slice(0, 10), [mergedRows, activeTab])

  return (
    <div>
      {/* Admin delete confirmation dialog */}
      {confirmEmail && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#242424', border: '1px solid #3A3A3A', borderTop: '3px solid #E05252', borderRadius: 14, padding: '32px 28px', maxWidth: 380, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: '#F5F5F5', fontFamily: 'Poppins, sans-serif', margin: '0 0 8px', fontWeight: 700 }}>Remove from Leaderboard?</h3>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 8px' }}>
              <strong style={{ color: '#F5F5F5' }}>{confirmEmail}</strong> will be completely removed from the leaderboard.
            </p>
            <p style={{ color: '#555', fontSize: '0.75rem', margin: '0 0 24px' }}>
              Their account and trade data are not affected — they'll reappear when they next log a trade.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setConfirmEmail(null)} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #3A3A3A', background: '#2E2E2E', color: '#A0A0A0', cursor: 'pointer', fontSize: '0.9rem' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmEmail)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#E05252', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                {resetting === confirmEmail ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-time name prompt modal — pops up over the leaderboard on first visit */}
      {needsName && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#242424', border: '1px solid #3A3A3A',
            borderTop: '3px solid #3B82F6', borderRadius: 16,
            padding: '44px 36px', maxWidth: 440, width: '100%', textAlign: 'center',
            boxShadow: '0 0 60px rgba(59,130,246,0.12)',
          }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 14 }}>🏆</div>
            <h2 style={{
              fontFamily: 'Poppins, sans-serif', fontWeight: 700,
              color: '#F5F5F5', margin: '0 0 10px', fontSize: '1.5rem',
            }}>
              Enter Your Display Name
            </h2>
            <p style={{ color: '#888', fontSize: '0.88rem', margin: '0 0 28px', lineHeight: 1.6 }}>
              This is the name everyone on the leaderboard will see next to your ranking. You only need to do this once.
            </p>
            <form onSubmit={handleSetName} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Your display name"
                maxLength={32}
                autoFocus
                style={{
                  width: '100%', background: '#2E2E2E', border: '1px solid #444',
                  borderRadius: 10, padding: '14px 16px', color: '#F5F5F5',
                  fontSize: '1.05rem', fontFamily: 'Inter, sans-serif', outline: 'none',
                  boxSizing: 'border-box', textAlign: 'center', letterSpacing: '0.01em',
                }}
              />
              <button
                type="submit"
                disabled={nameSaving || !nameInput.trim()}
                className="btn-gold"
                style={{
                  padding: '14px', borderRadius: 10, fontSize: '1rem', fontWeight: 700,
                  border: 'none', cursor: nameSaving || !nameInput.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: nameInput.trim() ? 1 : 0.45,
                }}
              >
                {nameSaving
                  ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  : 'Join the Leaderboard →'}
              </button>
            </form>
            <p style={{ color: '#444', fontSize: '0.75rem', marginTop: 18 }}>
              You can update this anytime in Settings.
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard always renders — modal sits on top until name is set */}
      <>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={22} color="#3B82F6" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.4rem', margin: 0 }}>Leaderboard</h1>
            <p style={{ color: '#555', fontSize: '0.78rem', margin: 0 }}>Live rankings — every trader visible to everyone</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: 8, padding: '8px 14px', color: '#A0A0A0', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      <p style={{ color: '#555', fontSize: '0.78rem', marginBottom: 16 }}>{tab.desc}</p>

      {/* Table */}
      <div style={{ background: '#242424', borderRadius: 14, border: '1px solid #333', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#1E1E1E' }}>
                <TH>#</TH>
                <TH>Trader</TH>
                {tab.heads.map((h, i) => <TH key={h} hi={i === 0}>{h}</TH>)}
                {isAdmin && <TH></TH>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 56, textAlign: 'center' }}>
                  <Loader2 size={24} color="#3B82F6" className="animate-spin" style={{ margin: '0 auto' }} />
                  <div style={{ color: '#555', fontSize: '0.82rem', marginTop: 10 }}>Loading…</div>
                </td></tr>
              )}
              {/* error is non-blocking — rows still show via localEntry */}
              {!loading && sorted.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 56, textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✝</div>
                  <div style={{ color: '#F5F5F5', fontWeight: 600, marginBottom: 6 }}>No traders yet</div>
                  <div style={{ color: '#555', fontSize: '0.8rem' }}>Log a trade to appear here.</div>
                </td></tr>
              )}
              {!loading && sorted.map((row, i) => {
                const isMe  = row.email === myEmail
                const medal = MEDALS[i] ?? null
                return (
                  <tr key={row.email} style={{
                    background: isMe ? 'rgba(59,130,246,0.05)' : i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    borderBottom: '1px solid #2A2A2A',
                    outline: isMe ? '1px solid rgba(59,130,246,0.2)' : 'none',
                  }}>
                    <TD>
                      <span style={{ fontSize: medal ? '1.1rem' : '0.82rem', color: medal ? undefined : '#555', fontWeight: 700 }}>
                        {medal ?? `#${i + 1}`}
                      </span>
                    </TD>
                    <TD>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: isMe ? 'rgba(59,130,246,0.15)' : '#2E2E2E', border: `1px solid ${isMe ? 'rgba(59,130,246,0.4)' : '#3A3A3A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMe ? '#3B82F6' : '#666', fontWeight: 800, fontSize: '0.82rem' }}>
                          {cleanName(row.display_name).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.88rem' }}>{cleanName(row.display_name)}</div>
                          {isMe && <div style={{ color: '#3B82F6', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em' }}>YOU</div>}
                        </div>
                      </div>
                    </TD>
                    {tab.cells(row, isMe, myEmail)}
                    {isAdmin && (
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => setConfirmEmail(row.email)}
                          disabled={resetting === row.email}
                          title="Reset stats to zero"
                          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#3B82F6', display: 'inline-flex', alignItems: 'center' }}
                        >
                          {resetting === row.email
                            ? <Loader2 size={13} className="animate-spin" />
                            : <RotateCcw size={13} />}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #2E2E2E' }}>
          <span style={{ color: '#444', fontSize: '0.75rem' }}>
            {mergedRows.length > 10 ? `Top 10 of ${mergedRows.length} traders` : `${mergedRows.length} trader${mergedRows.length !== 1 ? 's' : ''} ranked`}
          </span>
        </div>
      </div>

      </>
    </div>
  )
}
