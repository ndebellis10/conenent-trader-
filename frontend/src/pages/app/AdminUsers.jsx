/**
 * AdminUsers — only accessible when logged in as admin.
 * Shows every user's trading stats in a dashboard grid.
 * Auto-refreshes every 30s to pick up new signups.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { setActiveEmail } from '../../lib/userStorage'
import { useTradeStore } from '../../store/tradeStore'
import { useGoalStore } from '../../store/goalStore'
import { serverTradeToClient } from '../../lib/syncManager'
import { useAdminStore } from '../../store/adminStore'
import { ShieldAlert, RefreshCw, Eye, Loader2, Users } from 'lucide-react'


function StatPill({ label, value, color = '#3B82F6' }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.1rem', color, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function UserCard({ user, onView }) {
  const [loading, setLoading] = useState(false)

  async function handleView() {
    setLoading(true)
    await onView(user)
    setLoading(false)
  }
  const pnlColor = user.totalPnl >= 0 ? '#4CAF7D' : '#E05252'

  return (
    <div style={{
      background: '#242424', border: '1px solid #333',
      borderRadius: 14, padding: '20px',
      display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
    >
      {/* User header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3B82F6', fontWeight: 800, fontSize: '0.9rem',
          }}>
            {(user.name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#F5F5F5', fontWeight: 700, fontSize: '0.9rem' }}>
              {user.name || <span style={{ color: '#444', fontStyle: 'italic' }}>No name set</span>}
            </div>
            <div style={{ color: '#444', fontSize: '0.72rem' }}>{user.email}</div>
          </div>
        </div>

        <button onClick={handleView} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 8, padding: '6px 12px', color: '#3B82F6',
          fontSize: '0.75rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
        }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
          {loading ? 'Loading…' : 'View'}
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#2A2A2A' }} />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatPill label="Trades"   value={user.tradeCount ?? 0} color="#3B82F6" />
        <div style={{ width: 1, background: '#2A2A2A' }} />
        <StatPill label="Win Rate" value={user.winRate != null ? `${user.winRate}%` : '—'} color="#4CAF7D" />
        <div style={{ width: 1, background: '#2A2A2A' }} />
        <StatPill
          label="P&L"
          value={user.totalPnl != null ? `${user.totalPnl >= 0 ? '+' : ''}$${Math.abs(user.totalPnl).toFixed(0)}` : '—'}
          color={user.totalPnl != null ? pnlColor : '#555'}
        />
        {user.faithScore != null && (
          <>
            <div style={{ width: 1, background: '#2A2A2A' }} />
            <StatPill label="Faith" value={user.faithScore} color="#3B82F6" />
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  if (!isAdmin) {
    navigate('/app/dashboard')
    return null
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-key': useAdminStore.getState().sessionKey },
        credentials: 'include',
      })
      if (res.ok) {
        const { users: u } = await res.json()
        setUsers(u ?? [])
        setLastRefresh(new Date())
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
    const id = setInterval(loadUsers, 30000)
    return () => clearInterval(id)
  }, [])

  async function viewUser(user) {
    setActiveEmail(null)
    const emailKey = user.email || ''

    // 1. Fetch from Supabase (pass both userId and email)
    let serverTrades = [], serverGoals = [], serverCompletions = {}, serverProfile = {}
    try {
      const params = new URLSearchParams()
      if (user.id && user.id !== 'null') params.set('userId', user.id)
      if (emailKey) params.set('email', emailKey)
      const res = await fetch(`/api/admin/user-data?${params}`, {
        headers: { 'x-admin-key': useAdminStore.getState().sessionKey },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        serverTrades      = (data.trades    || []).map(serverTradeToClient)
        serverGoals       = data.goals       || []
        serverCompletions = data.completions || {}
        serverProfile     = data.profile     || {}
      }
    } catch { /* ignore */ }

    // 2. Also check localStorage on this browser for this user's trades
    let localTrades = []
    try {
      const raw = localStorage.getItem(`ft-trades__${emailKey.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}`)
      if (raw) localTrades = JSON.parse(raw)?.trades || []
    } catch { /* ignore */ }

    // 3. Merge (server wins on duplicate IDs)
    const serverIds = new Set(serverTrades.map(t => t.id))
    const allTrades = [...serverTrades, ...localTrades.filter(t => !serverIds.has(t.id))]
      .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))

    useTradeStore.setState({
      trades: allTrades,
      journalEntries: [], playbook: [],
      settings: {
        name:            serverProfile?.display_name || user.name || emailKey.split('@')[0] || 'Trader',
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
    navigate('/app/dashboard')
  }

  function exitView() {
    setViewing(null)
    useAdminStore.getState().clearViewingUser()
    useTradeStore.setState({ trades: [], journalEntries: [], playbook: [],
      settings: { name: 'Admin', email: '', startingBalance: 10000, currency: 'USD', riskPerTrade: 1 } })
    useGoalStore.setState({ goals: [], completions: {} })
    setActiveEmail(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={22} color="#3B82F6" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.4rem', margin: 0 }}>
              All Traders
            </h1>
            <p style={{ color: '#555', fontSize: '0.78rem', margin: 0 }}>
              {loading ? 'Loading…' : `${users.length} account${users.length !== 1 ? 's' : ''}`}
              {lastRefresh && ` · Updated ${lastRefresh.toLocaleTimeString()}`}
            </p>
          </div>
        </div>

        <button onClick={loadUsers} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#2E2E2E', border: '1px solid #3A3A3A',
          borderRadius: 8, padding: '8px 14px', color: '#A0A0A0',
          cursor: loading ? 'wait' : 'pointer', fontSize: '0.82rem',
        }}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* Empty state */}
      {!loading && users.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛡️</div>
          <h2 style={{ color: '#F5F5F5', fontFamily: 'Poppins, sans-serif', marginBottom: 8 }}>No traders yet</h2>
          <p style={{ color: '#555' }}>Users will appear here once they sign up and log trades.</p>
        </div>
      )}

      {/* User grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {users.map((user, i) => (
          <UserCard key={user.id || i} user={user} onView={viewUser} />
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
