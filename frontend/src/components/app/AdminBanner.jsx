/**
 * AdminPanel — floating icon on the right side, only visible for the admin account.
 * Click the icon to open a slide-out panel showing all user accounts.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, X, ShieldAlert, ChevronRight, Users, Loader2 } from 'lucide-react'
import { getLocalUsers } from '../../lib/adminConfig'
import { useAdminStore } from '../../store/adminStore'
import { useTradeStore } from '../../store/tradeStore'
import { useGoalStore  } from '../../store/goalStore'
import { setActiveEmail } from '../../lib/userStorage'
import { serverTradeToClient } from '../../lib/syncManager'
import { getLeaderboard, syncLeaderboard } from '../../lib/leaderboardApi'

export default function AdminBanner({ onAdminLogout }) {
  const navigate                        = useNavigate()
  const sessionKey                      = useAdminStore(s => s.sessionKey)
  const [open,         setOpen]         = useState(false)
  const [users,        setUsers]        = useState([])
  const [viewing,      setViewing]      = useState(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingId,    setLoadingId]    = useState(null)

  /* ── Load user list (auto-refreshes every 30s to catch new signups) ── */
  useEffect(() => {
    async function pushLocalUsersToLeaderboard() {
      // Sync every account stored on THIS device to the shared GitHub leaderboard
      // so they're visible cross-device in the admin panel and leaderboard
      const localUsers = getLocalUsers()
      for (const lu of localUsers) {
        if (!lu.email || !lu.email.includes('@')) continue
        const name = lu.settings?.name || lu.email.split('@')[0]
        syncLeaderboard(name, lu.email, lu.trades).catch(() => {})
      }
    }

    async function load() {
      // Push all local accounts to GitHub first
      pushLocalUsersToLeaderboard()

      try {
        const res = await fetch('/api/admin/users', {
          headers: { 'x-admin-key': sessionKey },
          credentials: 'include',
        })
        if (res.ok) {
          const { users: serverUsers } = await res.json()
          if (serverUsers?.length > 0) {
            const local = getLocalUsers()
            const merged = [...serverUsers]
            local.forEach(lu => {
              const already = merged.some(u => u.email === lu.email || u.email === lu.displayEmail)
              if (!already) merged.push({ id: null, email: lu.email || lu.displayEmail, name: lu.name, tradeCount: lu.tradeCount, storageKey: lu.storageKey, source: 'local' })
            })
            setUsers(merged)
            setLoadingUsers(false)
            return
          }
        }
      } catch { /* fall through */ }

      // Fallback: localStorage + leaderboard
      const local = getLocalUsers()
      let merged = [...local.map(lu => ({ ...lu, email: lu.email || lu.displayEmail }))]
      try {
        const lb = await getLeaderboard()
        lb?.forEach(row => {
          if (!merged.some(u => u.email === row.email))
            merged.push({ storageKey: null, email: row.email, displayEmail: row.email, name: row.display_name, tradeCount: row.total_trades, fromLeaderboard: true })
        })
      } catch { /* ignore */ }
      setUsers(merged)
      setLoadingUsers(false)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  /* ── View a user ── */
  async function viewUser(user) {
    const emailKey = user.email || user.displayEmail
    setLoadingId(user.id || emailKey)
    setActiveEmail(null)

    // 1. Fetch from Supabase via admin endpoint (pass both userId AND email so server can resolve)
    let serverTrades = [], serverGoals = [], serverCompletions = {}, serverProfile = {}
    try {
      const params = new URLSearchParams()
      if (user.id && user.id !== 'null') params.set('userId', user.id)
      if (emailKey) params.set('email', emailKey)
      const res = await fetch(`/api/admin/user-data?${params}`, {
        headers: { 'x-admin-key': sessionKey },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        serverTrades      = (data.trades      || []).map(serverTradeToClient)
        serverGoals       = data.goals         || []
        serverCompletions = data.completions   || {}
        serverProfile     = data.profile       || {}
      }
    } catch { /* fall through to localStorage */ }

    // 2. Also pull from localStorage on this browser (catches trades logged before cloud sync)
    let localTrades = []
    try {
      const raw = localStorage.getItem(`ft-trades__${emailKey.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        localTrades = parsed.trades || []
      }
    } catch { /* ignore */ }

    // 3. Merge: server trades take priority (have UUIDs), local fills in any not already present
    const serverIds = new Set(serverTrades.map(t => t.id))
    const localOnly = localTrades.filter(t => !serverIds.has(t.id))
    const allTrades = [...serverTrades, ...localOnly]
      .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))

    useTradeStore.setState({
      trades: allTrades,
      journalEntries: [],
      playbook: [],
      settings: {
        name:            serverProfile?.display_name || user.name || emailKey.split('@')[0],
        email:           emailKey,
        startingBalance: serverProfile?.starting_balance ?? 10000,
        currency:        serverProfile?.currency ?? 'USD',
        riskPerTrade:    serverProfile?.risk_per_trade ?? 1,
      },
    })
    useGoalStore.setState({
      goals:       serverGoals.map(g => ({ id: g.id, text: g.text, createdAt: g.created_at })),
      completions: serverCompletions,
    })

    useAdminStore.getState().setViewingUser(user)
    setViewing({ ...user, displayEmail: emailKey })
    setLoadingId(null)
    setOpen(false)
    navigate('/app')
  }

  /* ── Exit user view ── */
  function exitView() {
    setViewing(null)
    useAdminStore.getState().clearViewingUser()
    useTradeStore.setState({ trades: [], journalEntries: [], playbook: [],
      settings: { name: 'Admin', email: '', startingBalance: 10000, currency: 'USD', riskPerTrade: 1 } })
    useGoalStore.setState({ goals: [], completions: {} })
    setActiveEmail(null)
  }

  return (
    <>
      {/* ── "Now Viewing" top bar — only when looking at a user ── */}
      {viewing && (
        <div style={{
          background: 'rgba(59,130,246,0.12)',
          borderBottom: '1px solid rgba(59,130,246,0.35)',
          padding: '0 20px',
          height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, zIndex: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={14} color="#3B82F6" />
            <span style={{ color: '#3B82F6', fontSize: '0.78rem', fontWeight: 700 }}>
              Viewing: {viewing.name || viewing.displayEmail}
            </span>
            <span style={{ color: '#E05252', background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700 }}>
              READ-ONLY
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setOpen(o => !o)} style={{
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 6, padding: '4px 12px', color: '#3B82F6',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Users size={11} /> Switch Account
            </button>
            <button onClick={exitView} style={{
              background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)',
              borderRadius: 6, padding: '4px 12px', color: '#E05252',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <EyeOff size={11} /> Exit View
            </button>
          </div>
        </div>
      )}

      {/* ── Floating shield icon (when NOT viewing anyone) ── */}
      {!viewing && (
        <button
          onClick={() => setOpen(o => !o)}
          title="Admin Panel"
          style={{
            position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 9999, width: 44, height: 44,
            borderRadius: '12px 0 0 12px',
            background: open ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.4)', borderRight: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(59,130,246,0.15)',
          }}
        >
          <ShieldAlert size={20} color="#3B82F6" />
        </button>
      )}

      {/* ── Slide-out panel ── */}
      <div style={{
        position: 'fixed',
        right: open ? 0 : -340,
        top: 0,
        bottom: 0,
        width: 320,
        background: '#1A1A1A',
        borderLeft: '1px solid rgba(59,130,246,0.3)',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        transition: 'right 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.5)' : 'none',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid #2A2A2A',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={16} color="#3B82F6" />
            <span style={{ color: '#3B82F6', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Admin Panel
            </span>
          </div>
          <button onClick={() => setOpen(false)} style={{
            background: 'none', border: 'none', color: '#555', cursor: 'pointer',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Currently viewing banner */}
        {viewing && (
          <div style={{
            margin: '12px 12px 0',
            padding: '10px 14px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ color: '#3B82F6', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Currently Viewing
              </div>
              <div style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.85rem' }}>
                {viewing.name || viewing.displayEmail}
              </div>
              <div style={{ color: '#E05252', fontSize: '0.68rem', fontWeight: 700, marginTop: 2 }}>READ-ONLY</div>
            </div>
            <button onClick={exitView} style={{
              background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)',
              borderRadius: 6, padding: '5px 10px', color: '#E05252',
              fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <EyeOff size={11} /> Exit
            </button>
          </div>
        )}

        {/* User count */}
        <div style={{ padding: '12px 18px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={13} color="#555" />
            <span style={{ color: '#555', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {loadingUsers ? 'Loading…' : `${users.length} Account${users.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 16px' }}>
          {!loadingUsers && users.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ color: '#444', fontSize: '0.82rem' }}>No accounts found.</div>
              <div style={{ color: '#333', fontSize: '0.72rem', marginTop: 6 }}>Users must log a trade to appear here.</div>
            </div>
          )}

          {users.map((user, i) => {
            const email    = user.email || user.displayEmail
            const name     = user.name || email?.split('@')[0] || '—'
            const isActive = viewing?.displayEmail === email

            return (
              <button key={i} onClick={() => viewUser(user)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${isActive ? 'rgba(59,130,246,0.5)' : 'transparent'}`,
                  background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                  cursor: 'pointer', marginBottom: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Display name — prominent */}
                  <div style={{
                    color: isActive ? '#3B82F6' : '#F5F5F5',
                    fontWeight: 700, fontSize: '0.88rem',
                    marginBottom: 3, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </div>

                  {/* Email */}
                  <div style={{
                    color: '#555', fontSize: '0.72rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 4,
                  }}>
                    {email}
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      background: '#242424', borderRadius: 4,
                      padding: '2px 6px', fontSize: '0.68rem',
                      color: '#3B82F6', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                    }}>
                      {user.tradeCount} trades
                    </span>
                    {user.winRate != null && (
                      <span style={{
                        background: '#242424', borderRadius: 4,
                        padding: '2px 6px', fontSize: '0.68rem',
                        color: '#4CAF7D', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                      }}>
                        {user.winRate}% WR
                      </span>
                    )}
                    {user.totalPnl != null && (
                      <span style={{
                        background: '#242424', borderRadius: 4,
                        padding: '2px 6px', fontSize: '0.68rem',
                        color: user.totalPnl >= 0 ? '#4CAF7D' : '#E05252',
                        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                      }}>
                        {user.totalPnl >= 0 ? '+' : ''}${Math.abs(user.totalPnl).toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                {loadingId === (user.id || email)
                  ? <Loader2 size={14} color="#3B82F6" style={{ flexShrink: 0, marginLeft: 8, animation: 'spin 1s linear infinite' }} />
                  : <ChevronRight size={14} color={isActive ? '#3B82F6' : '#333'} style={{ flexShrink: 0, marginLeft: 8 }} />
                }
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid #2A2A2A',
          flexShrink: 0,
        }}>
          <button onClick={onAdminLogout} style={{
            width: '100%', padding: '9px', borderRadius: 8,
            background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)',
            color: '#E05252', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}>
            Exit Admin Mode
          </button>
        </div>
      </div>

      {/* Backdrop when panel is open */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9997,
          background: 'rgba(0,0,0,0.3)',
        }} />
      )}
    </>
  )
}
