import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useAdminStore } from '../../store/adminStore'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Zap, PlusCircle, ArrowUpRight, Activity,
} from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { useGoalStore } from '../../store/goalStore'
import { useAuthStore } from '../../store/authStore'
import TradeCalendar from '../../components/app/TradeCalendar'
import FaithScore from '../../components/app/FaithScore'
import NewsPanel from '../../components/app/NewsPanel'
import DailyInsight from '../../components/app/DailyInsight'
import GaugeKPIs from '../../components/app/GaugeKPIs'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, subDays, startOfWeek, addDays, startOfDay, endOfDay } from 'date-fns'
import DateRangePicker from '../../components/app/DateRangePicker'
import { VERSES } from '../../lib/verses'
import { liveTrades } from '../../lib/tradeFilters'

/* ── Pick 3 unique verses for today using a day-number hash ── */
function getDayVerses() {
  const dayNum = Math.floor(Date.now() / 86400000) // changes at midnight UTC
  const hash = (n) => Math.imul(n ^ (n >>> 16), 0x45d9f3b) ^ (n >>> 16)
  let h = hash(dayNum)
  const picked = []
  const used = new Set()
  while (picked.length < 3) {
    const idx = ((h % VERSES.length) + VERSES.length) % VERSES.length
    if (!used.has(idx)) { picked.push(VERSES[idx]); used.add(idx) }
    h = hash(h + picked.length)
  }
  return picked
}

function DailyVerses() {
  const [verses, setVerses] = useState(getDayVerses)

  useEffect(() => {
    // Refresh exactly at the next local midnight
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
    const ms = midnight - now
    const timer = setTimeout(() => setVerses(getDayVerses()), ms)
    return () => clearTimeout(timer)
  }, [verses])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
      {verses.map((v, i) => (
        <div key={i} style={{
          background: 'rgba(59,130,246,0.04)',
          border: '1px solid rgba(59,130,246,0.1)',
          borderRadius: '10px',
          padding: '14px 16px',
          flex: 1,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px',
        }}>
          <p style={{ color: '#D4B85A', fontSize: '0.82rem', fontStyle: 'italic', fontFamily: 'Poppins, sans-serif', margin: 0, lineHeight: 1.6 }}>
            "{v.text}"
          </p>
          <span style={{ color: 'rgba(59,130,246,0.5)', fontSize: '0.73rem', fontWeight: 700 }}>— {v.ref}</span>
        </div>
      ))}
    </div>
  )
}

function VerseWidget() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * VERSES.length))
  const [visible, setVisible] = useState(true)

  const cycle = (dir) => {
    setVisible(false)
    setTimeout(() => {
      setIdx(i => (i + dir + VERSES.length) % VERSES.length)
      setVisible(true)
    }, 300)
  }

  useEffect(() => {
    const t = setInterval(() => cycle(1), 18000)
    return () => clearInterval(t)
  }, [])

  const v = VERSES[idx]

  return (
    <div style={{
      background: 'rgba(59,130,246,0.04)',
      border: '1px solid rgba(59,130,246,0.15)',
      borderRadius: '12px',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: '16px',
    }}>
      <span style={{ color: '#3B82F6', fontSize: '1.2rem', flexShrink: 0, opacity: 0.8 }}>✝</span>
      <div style={{ flex: 1, opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease', minWidth: 0 }}>
        <span style={{ color: '#3B82F6', fontSize: '0.84rem', fontStyle: 'italic', fontFamily: 'Poppins, sans-serif' }}>
          "{v.text}"
        </span>
        <span style={{ color: 'rgba(59,130,246,0.55)', fontSize: '0.78rem', fontWeight: 700, marginLeft: '8px' }}>
          — {v.ref}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button onClick={() => cycle(-1)} style={{ background: 'none', border: 'none', color: 'rgba(59,130,246,0.4)', cursor: 'pointer', fontSize: '0.7rem', padding: '4px 6px', lineHeight: 1 }} title="Previous">▲</button>
        <button onClick={() => cycle(1)} style={{ background: 'none', border: 'none', color: 'rgba(59,130,246,0.4)', cursor: 'pointer', fontSize: '0.7rem', padding: '4px 6px', lineHeight: 1 }} title="Next">▼</button>
      </div>
    </div>
  )
}

/* ─── Goal Streak Heatmap ─────────────────────────────────── */
function GoalHeatmap() {
  const { goals, completions } = useGoalStore()
  const WEEKS = 16
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()

  // Build grid: columns = weeks (oldest → newest), rows = Sun–Sat
  const cols = useMemo(() => {
    const result = []
    // Start from the Sunday of (WEEKS-1) weeks ago
    const gridStart = startOfWeek(subDays(today, (WEEKS - 1) * 7))
    for (let w = 0; w < WEEKS; w++) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(gridStart, w * 7 + d)
        const key = format(date, 'yyyy-MM-dd')
        const done = completions[key]?.length || 0
        const total = goals.length
        const pct = total > 0 ? done / total : 0
        days.push({ date, key, pct, done, total, future: date > today })
      }
      result.push(days)
    }
    return result
  }, [goals, completions])

  // Streak: consecutive days going back from yesterday where all goals completed
  const streak = useMemo(() => {
    if (!goals.length) return 0
    let count = 0
    let cursor = subDays(today, 1)
    for (let i = 0; i < 365; i++) {
      const key = format(cursor, 'yyyy-MM-dd')
      const done = completions[key]?.length || 0
      if (done < goals.length) break
      count++
      cursor = subDays(cursor, 1)
    }
    // Also count today if complete
    const todayKey = format(today, 'yyyy-MM-dd')
    if ((completions[todayKey]?.length || 0) >= goals.length && goals.length > 0) count++
    return count
  }, [goals, completions])

  function cellColor(pct, future) {
    if (future) return 'transparent'
    if (pct === 0) return '#1E1E1E'
    if (pct < 0.34) return '#1B3A5C'
    if (pct < 0.67) return '#1E5FA8'
    if (pct < 1)    return '#3B82E8'
    return '#4CAF7D'
  }

  // Month labels: show month name when week crosses a new month
  const monthLabels = useMemo(() => {
    const labels = []
    cols.forEach((week, wi) => {
      const firstDay = week[0].date
      if (wi === 0 || format(firstDay, 'M') !== format(cols[wi - 1][0].date, 'M')) {
        labels.push({ wi, label: format(firstDay, 'MMM') })
      } else {
        labels.push(null)
      }
    })
    return labels
  }, [cols])

  const cellSize = 14, gap = 3

  return (
    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #2A2A2A' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ color: '#C0C0C0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progress Tracker</span>
        {streak > 0 && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', fontWeight: 700, color: '#3B82F6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '5px' }}>
            🔥 {streak} day streak
          </span>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        {/* Month labels row */}
        <div style={{ display: 'flex', marginLeft: '28px', marginBottom: '4px' }}>
          {monthLabels.map((m, wi) => (
            <div key={wi} style={{ width: cellSize + gap, flexShrink: 0 }}>
              {m && <span style={{ color: '#555', fontSize: '0.6rem', fontWeight: 600 }}>{m.label}</span>}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'flex', gap: 0 }}>
          {/* Day-of-week labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: gap, marginRight: '4px', flexShrink: 0 }}>
            {DOW.map((d, i) => (
              <div key={d} style={{ height: cellSize, display: 'flex', alignItems: 'center' }}>
                {(i % 2 === 1) && <span style={{ color: '#444', fontSize: '0.58rem', width: '24px', textAlign: 'right' }}>{d}</span>}
                {(i % 2 !== 1) && <span style={{ width: '24px' }} />}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {cols.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap, marginRight: gap, flexShrink: 0 }}>
              {week.map(({ key, pct, done, total, future }) => (
                <div
                  key={key}
                  title={future ? '' : `${key}: ${done}/${total} goals`}
                  style={{
                    width: cellSize, height: cellSize,
                    borderRadius: '3px',
                    background: cellColor(pct, future),
                    border: future ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    cursor: future ? 'default' : 'default',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', marginLeft: '28px' }}>
          <span style={{ color: '#444', fontSize: '0.6rem' }}>Less</span>
          {['#1E1E1E', '#1B3A5C', '#1E5FA8', '#3B82E8', '#4CAF7D'].map(c => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: '2px', background: c, border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
          <span style={{ color: '#444', fontSize: '0.6rem' }}>More</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Daily Goals ring ────────────────────────────────────── */
function DailyGoalsCard() {
  const { goals, completions, toggleCompletion } = useGoalStore()
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayDone = completions[today] || []
  const completed = goals.filter(g => todayDone.includes(g.id)).length
  const total = goals.length
  const pct = total ? Math.round((completed / total) * 100) : 0
  const color = pct === 100 ? '#4CAF7D' : pct >= 50 ? '#3B82F6' : '#E05252'

  const size = 56, stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div>
      {/* Ring + summary row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: total > 0 ? '14px' : 0 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2A2A2A" strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
              strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '0.68rem', color }}>{pct}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.2rem', color, lineHeight: 1 }}>
            {completed}<span style={{ color: '#3A3A3A', fontSize: '0.85rem', fontWeight: 400 }}> / {total}</span>
          </div>
          <div style={{ color: '#555', fontSize: '0.7rem', marginTop: '4px' }}>
            {total === 0 ? 'No goals set' : pct === 100 ? '✝ All done today!' : 'goals today'}
          </div>
        </div>
      </div>

      {/* Checkable goal list */}
      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {goals.map(g => {
            const done = todayDone.includes(g.id)
            return (
              <button
                key={g.id}
                onClick={() => toggleCompletion(g.id, today)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: done ? 'rgba(76,175,125,0.07)' : 'transparent',
                  border: `1px solid ${done ? 'rgba(76,175,125,0.25)' : '#2A2A2A'}`,
                  borderRadius: '8px', padding: '8px 10px',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${done ? '#4CAF7D' : '#444'}`,
                  background: done ? '#4CAF7D' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {done && <span style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{
                  color: done ? '#555' : '#C0C0C0',
                  fontSize: '0.82rem',
                  textDecoration: done ? 'line-through' : 'none',
                  transition: 'all 0.15s',
                  flex: 1,
                }}>
                  {g.text}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {total === 0 && (
        <button
          onClick={() => navigate('/app/goals')}
          style={{ marginTop: '8px', background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
        >
          Set up daily goals →
        </button>
      )}
    </div>
  )
}

/* ─── Greeting Banner ─────────────────────────────────────── */
function GreetingBanner({ trades, onLogTrade, isAdmin }) {
  const name = useTradeStore(s => s.settings?.name)
  const authUser = useAuthStore(s => s.currentUser)
  const displayName = (name && name !== 'Trader') ? name : (authUser?.name || authUser?.email?.split('@')[0] || 'Trader')
  const firstName = displayName.split(' ')[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = format(new Date(), 'EEEE, MMMM d')

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const _safeD = (d) => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }
  const todayTrades = trades.filter(t => format(_safeD(t.createdAt), 'yyyy-MM-dd') === todayStr)
  const todayPnl = todayTrades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
  const hasTodayTrades = todayTrades.length > 0
  const netPnl = trades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)

  return (
    <div style={{
      background: 'linear-gradient(135deg, #242424 0%, #262626 100%)',
      border: '1px solid rgba(59,130,246,0.18)',
      borderRadius: '16px',
      padding: '22px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '20px', flexWrap: 'wrap',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -50, left: -30, width: 280, height: 180, background: 'radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.6))' }}>✝</span>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)', color: '#FFFFFF', margin: 0, lineHeight: 1.1 }}>
            {greeting},{' '}
            <span style={{ background: 'linear-gradient(90deg, #3B82F6, #F0D080)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {firstName}.
            </span>
          </h2>
        </div>
        <p style={{ color: '#666', fontSize: '0.83rem', margin: 0, paddingLeft: '40px' }}>{today}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
        {/* Overall Net P&L — always shown, top-right */}
        <div style={{
          background: netPnl >= 0 ? 'rgba(76,175,125,0.08)' : 'rgba(224,82,82,0.08)',
          border: `1px solid ${netPnl >= 0 ? 'rgba(76,175,125,0.3)' : 'rgba(224,82,82,0.3)'}`,
          borderRadius: '10px', padding: '8px 16px', textAlign: 'center', minWidth: '100px',
        }}>
          <div style={{ color: '#666', fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px', fontWeight: 600 }}>Net P&L</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.05rem', color: netPnl >= 0 ? '#4CAF7D' : '#E05252' }}>
            {netPnl >= 0 ? '+' : '-'}${Math.abs(netPnl).toFixed(2)}
          </div>
        </div>
        {hasTodayTrades && (
          <div style={{
            background: todayPnl >= 0 ? 'rgba(76,175,125,0.08)' : 'rgba(224,82,82,0.08)',
            border: `1px solid ${todayPnl >= 0 ? 'rgba(76,175,125,0.25)' : 'rgba(224,82,82,0.25)'}`,
            borderRadius: '10px', padding: '8px 16px', textAlign: 'center', minWidth: '90px',
          }}>
            <div style={{ color: '#666', fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px', fontWeight: 600 }}>Today P&L</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.05rem', color: todayPnl >= 0 ? '#4CAF7D' : '#E05252' }}>
              {todayPnl >= 0 ? '+' : ''}${Math.abs(todayPnl).toFixed(2)}
            </div>
          </div>
        )}
        {hasTodayTrades && (
          <div style={{
            background: '#242424', border: '1px solid #2E2E2E',
            borderRadius: '10px', padding: '8px 14px', textAlign: 'center',
          }}>
            <div style={{ color: '#666', fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px', fontWeight: 600 }}>Trades</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.05rem', color: '#3B82F6' }}>
              {todayTrades.length}
            </div>
          </div>
        )}
        {!isAdmin && onLogTrade && (
          <button onClick={onLogTrade} className="btn-gold" style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px',
            fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            <PlusCircle size={15} /> Log Trade
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Empty state ─────────────────────────────────────────── */
function EmptyState({ onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✝</div>
      <h2 style={{ fontFamily: 'Poppins, sans-serif', color: '#F5F5F5', marginBottom: '12px' }}>
        Your journey begins with a single step — and a little faith.
      </h2>
      <p style={{ color: '#A0A0A0', marginBottom: '28px' }}>Log your first trade to start seeing your analytics.</p>
      <button onClick={onAction} className="btn-gold" style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <PlusCircle size={16} /> Log Your First Trade
      </button>
    </div>
  )
}

/* ─── Admin Home Screen ───────────────────────────────────── */
function AdminHome() {
  const [userCount, setUserCount] = useState('—')

  useEffect(() => {
    async function load() {
      try {
        const res = await window.fetch('/api/admin/users', {
          headers: { 'x-admin-key': useAdminStore.getState().sessionKey }, credentials: 'include',
        })
        if (res.ok) {
          const { users } = await res.json()
          setUserCount(users?.length ?? 0)
        }
      } catch { /* ignore */ }
    }
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', gap: 24, textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.2rem',
      }}>
        🛡️
      </div>
      <div>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#F5F5F5', margin: '0 0 10px' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>
          You are logged in as the admin account. You cannot log trades here.
        </p>
        <p style={{ color: '#555', fontSize: '0.9rem', margin: '4px 0 0' }}>
          Use the <span style={{ color: '#3B82F6', fontWeight: 600 }}>🛡 panel on the right</span> to view any user's account.
        </p>
      </div>
      <div style={{
        background: '#242424', border: '1px solid #333',
        borderRadius: 14, padding: '20px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '2.5rem', color: '#3B82F6', lineHeight: 1 }}>
          {userCount}
        </div>
        <div style={{ color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Registered Traders
        </div>
        <div style={{ color: '#3A3A3A', fontSize: '0.7rem', marginTop: 2 }}>
          Updates every 30 seconds
        </div>
      </div>
      <p style={{ color: '#3A3A3A', fontSize: '0.78rem', fontStyle: 'italic' }}>
        ✝ "A faithful man will abound with blessings." — Proverbs 28:20
      </p>
    </div>
  )
}

/* ─── Section heading ─────────────────────────────────────── */
function SectionHead({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700 }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }} />
    </div>
  )
}

/* ─── Main Dashboard ──────────────────────────────────────── */
export default function Dashboard() {
  const { trades: rawTrades } = useTradeStore()
  // Backtest-tagged imports are paper results — keep them out of live performance
  const allTrades = useMemo(() => liveTrades(rawTrades), [rawTrades])
  const { isAdmin } = useAuth()
  const viewingUser = useAdminStore(s => s.viewingUser)
  const navigate = useNavigate()
  const safeDate = (d) => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }

  const [dateRange, setDateRange] = useState(null)

  const trades = dateRange
    ? allTrades.filter(t => {
        const d = safeDate(t.createdAt)
        return d >= dateRange.start && d <= dateRange.end
      })
    : allTrades

  const stats = useMemo(() => {
    if (!trades.length) return null

    const wins = trades.filter(t => t.result === 'Win')
    const losses = trades.filter(t => t.result === 'Loss')
    const breakevens = trades.filter(t => t.result === 'Breakeven')
    const longs = trades.filter(t => t.direction === 'Long')
    const shorts = trades.filter(t => t.direction === 'Short')

    const totalPnl = trades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const totalGross = trades.reduce((s, t) => s + (parseFloat(t.grossPnl) || 0), 0)
    const totalCommission = trades.reduce((s, t) => s + (parseFloat(t.commission) || 0), 0)

    const winRate = ((wins.length / trades.length) * 100).toFixed(1)
    const longWinRate = longs.length ? ((longs.filter(t => t.result === 'Win').length / longs.length) * 100).toFixed(1) : '0.0'
    const shortWinRate = shorts.length ? ((shorts.filter(t => t.result === 'Win').length / shorts.length) * 100).toFixed(1) : '0.0'

    const sumWins = wins.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const sumLosses = Math.abs(losses.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0))
    const avgWin = wins.length ? sumWins / wins.length : 0
    const avgLoss = losses.length ? sumLosses / losses.length : 0
    const profitFactor = sumLosses > 0 ? (sumWins / sumLosses).toFixed(2) : wins.length ? '∞' : '0.00'

    const pnlValues = trades.map(t => parseFloat(t.netPnl) || 0)
    const largestWin = Math.max(...pnlValues, 0)
    const largestLoss = Math.min(...pnlValues, 0)
    const avgPnl = totalPnl / trades.length

    const safeDate = (d) => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }
    const tradingDays = new Set(trades.map(t => format(safeDate(t.createdAt), 'yyyy-MM-dd')))
    const profitableDays = [...tradingDays].filter(day => {
      const dayPnl = trades.filter(t => format(safeDate(t.createdAt), 'yyyy-MM-dd') === day).reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
      return dayPnl > 0
    })
    const pctProfitableDays = tradingDays.size ? ((profitableDays.length / tradingDays.size) * 100).toFixed(0) : 0

    const byDay = {}
    trades.forEach(t => {
      const d = format(safeDate(t.createdAt), 'yyyy-MM-dd')
      if (!byDay[d]) byDay[d] = 0
      byDay[d] += parseFloat(t.netPnl) || 0
    })
    const dayVals = Object.values(byDay)
    const bestDay = dayVals.length ? Math.max(...dayVals) : 0
    const worstDay = dayVals.length ? Math.min(...dayVals) : 0

    let curWin = 0, maxWin = 0, curLoss = 0, maxLoss = 0
    ;[...trades].reverse().forEach(t => {
      if (t.result === 'Win') { curWin++; curLoss = 0; if (curWin > maxWin) maxWin = curWin }
      else if (t.result === 'Loss') { curLoss++; curWin = 0; if (curLoss > maxLoss) maxLoss = curLoss }
    })

    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))
    const thisMonthPnl = trades.filter(t => safeDate(t.createdAt) >= thisMonthStart).reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const lastMonthPnl = trades.filter(t => isWithinInterval(safeDate(t.createdAt), { start: lastMonthStart, end: lastMonthEnd })).reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const monthChange = lastMonthPnl !== 0 ? (((thisMonthPnl - lastMonthPnl) / Math.abs(lastMonthPnl)) * 100).toFixed(1) : null

    const rrTrades = trades.filter(t => t.stopLoss && parseFloat(t.stopLoss) > 0 && t.entryPrice && t.exitPrice)
    const avgRR = rrTrades.length
      ? (rrTrades.reduce((s, t) => {
          const entry = parseFloat(t.entryPrice), exit = parseFloat(t.exitPrice), stop = parseFloat(t.stopLoss)
          const risk = Math.abs(entry - stop)
          const reward = Math.abs(exit - entry)
          return s + (risk > 0 ? reward / risk : 0)
        }, 0) / rrTrades.length).toFixed(2)
      : '—'

    return {
      totalPnl, totalGross, totalCommission, winRate, longWinRate, shortWinRate,
      avgWin, avgLoss, profitFactor, largestWin, largestLoss, avgPnl,
      totalTrades: trades.length, wins: wins.length, losses: losses.length, breakevens: breakevens.length,
      tradingDays: tradingDays.size, pctProfitableDays, bestDay, worstDay,
      curWin, maxWin, curLoss, maxLoss, avgRR, monthChange, thisMonthPnl,
    }
  }, [trades])

  const equityData = useMemo(() => {
    let cum = 0
    return [...trades].reverse().map(t => {
      cum += parseFloat(t.netPnl) || 0
      return { name: format(safeDate(t.createdAt), 'MM/dd'), equity: parseFloat(cum.toFixed(2)) }
    })
  }, [trades])

  const recentTrades = trades.slice(0, 10)

  // Admin with no one selected → show admin home
  if (isAdmin && !viewingUser) return <AdminHome />

  // Admin viewing someone with no trades
  if (isAdmin && viewingUser && !trades.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem' }}>📊</div>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', color: '#F5F5F5', fontWeight: 700, margin: 0 }}>
          {viewingUser?.name || viewingUser?.email || 'This user'} has no trades yet
        </h2>
        <p style={{ color: '#555', margin: 0 }}>They haven't logged any trades yet.</p>
        <button onClick={() => navigate('/app/admin-users')} style={{ marginTop: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}>
          ← Back to All Traders
        </button>
      </div>
    )
  }

  // Regular user with no trades
  if (!allTrades.length) return <EmptyState onAction={() => navigate('/app/log')} />

  const card = { background: '#222', borderRadius: '14px', border: '1px solid #2A2A2A', padding: '20px 22px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Greeting ── */}
      <GreetingBanner trades={allTrades} isAdmin={isAdmin} onLogTrade={() => navigate('/app/log')} />

      {/* ── Verse ── */}
      <VerseWidget />

      {/* ── Alan's read on your recent trades ── */}
      <DailyInsight trades={allTrades} />

      {/* ── Date range filter ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#555', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date Range</span>
          {dateRange && (
            <button onClick={() => setDateRange(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.72rem', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}>
              ✕ clear
            </button>
          )}
          {dateRange && (
            <span style={{ color: '#444', fontSize: '0.75rem' }}>
              {trades.length} trade{trades.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* ── Visual KPI gauges (moved to the top) ── */}
      {stats ? <GaugeKPIs trades={trades} /> : (
        <div style={{ ...card, textAlign: 'center', padding: '48px', color: '#555', fontSize: '0.88rem' }}>
          No trades found in the selected date range. <button onClick={() => setDateRange(null)} style={{ marginLeft: 8, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>Clear filter</button>
        </div>
      )}

      {/* ── Charts + Breakdown row ── */}
      {stats && <>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px', alignItems: 'stretch' }}>

        {/* Left column: Equity Curve + Performance Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Equity Curve */}
          <div style={{ ...card }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700 }}>Equity Curve</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: stats.totalPnl >= 0 ? '#4CAF7D' : '#E05252', fontWeight: 700 }}>
                {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2E2E2E', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.78rem' }} />
                <Area type="monotone" dataKey="equity" stroke="#3B82F6" fill="url(#eqGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3B82F6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Breakdown */}
          <div style={{ ...card, padding: '20px 22px' }}>
            <SectionHead label="Performance Breakdown" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
              {[
                { label: 'Avg Win',           value: `+$${stats.avgWin.toFixed(2)}`,                                                          color: '#4CAF7D' },
                { label: 'Avg Loss',          value: `-$${stats.avgLoss.toFixed(2)}`,                                                         color: '#E05252' },
                { label: 'Best Day',          value: `+$${stats.bestDay.toFixed(2)}`,                                                         color: '#4CAF7D' },
                { label: 'Worst Day',         value: `${stats.worstDay >= 0 ? '+' : '-'}$${Math.abs(stats.worstDay).toFixed(2)}`,             color: stats.worstDay >= 0 ? '#4CAF7D' : '#E05252' },
                { label: 'Gross P&L',         value: `${stats.totalGross >= 0 ? '+' : ''}$${Math.abs(stats.totalGross).toFixed(2)}`,          color: '#3B82F6' },
                { label: 'Commissions',       value: `-$${stats.totalCommission.toFixed(2)}`,                                                 color: '#E05252' },
                { label: 'Long Win Rate',     value: `${stats.longWinRate}%`,                                                                 color: '#4CAF7D' },
                { label: 'Short Win Rate',    value: `${stats.shortWinRate}%`,                                                                color: '#E05252' },
                { label: '% Profitable Days', value: `${stats.pctProfitableDays}%`,                                                          color: stats.pctProfitableDays >= 50 ? '#4CAF7D' : '#E05252' },
                { label: 'Avg Trade P&L',     value: `${stats.avgPnl >= 0 ? '+' : ''}$${stats.avgPnl.toFixed(2)}`,                          color: stats.avgPnl >= 0 ? '#4CAF7D' : '#E05252' },
                { label: 'Win Streak',        value: `${stats.curWin} cur · ${stats.maxWin} best`,                                           color: '#4CAF7D' },
                { label: 'Loss Streak',       value: `${stats.curLoss} cur · ${stats.maxLoss} worst`,                                        color: '#E05252' },
              ].map(({ label, value, color }, i, arr) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < arr.length - 2 ? '1px solid #252525' : 'none' }}>
                  <span style={{ color: '#909090', fontSize: '0.78rem' }}>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.84rem', fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's USD News — between the breakdown and the Covenant Score */}
          <NewsPanel />

          {/* Covenant Score — fills remaining left-column space */}
          <FaithScore trades={trades} />

        </div>

        {/* Right column: distribution + goals stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Win/Loss Donut */}
          <div style={{ ...card, flex: 1 }}>
            <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Distribution</span>
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: stats.wins },
                      { name: 'Losses', value: stats.losses },
                      { name: 'Breakeven', value: stats.breakevens },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%"
                    innerRadius={38} outerRadius={52}
                    dataKey="value" paddingAngle={3}
                  >
                    <Cell fill="#4CAF7D" />
                    <Cell fill="#E05252" />
                    <Cell fill="#3A3A3A" />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2E2E2E', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', fontWeight: 800, color: '#3B82F6' }}>{stats.winRate}%</div>
                <div style={{ color: '#444', fontSize: '0.58rem' }}>win</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #2A2A2A', paddingTop: '10px' }}>
              {[['#4CAF7D','W',stats.wins],['#E05252','L',stats.losses],['#666','BE',stats.breakevens]].map(([c,l,v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ color: c, fontSize: '0.6rem', marginBottom: 2 }}>● {l}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: c, fontWeight: 700, fontSize: '0.85rem' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Goals */}
          <div style={{ ...card, flex: 1 }}>
            <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700, display: 'block', marginBottom: '14px' }}>Daily Goals</span>
            <DailyGoalsCard />
            <GoalHeatmap />
          </div>

        </div>
      </div>

      {/* ── Trade Calendar ── */}
      <TradeCalendar trades={trades} />

      {/* ── Recent Trades ── */}
      <div style={{ ...card, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <SectionHead label="Recent Trades" />
          <button onClick={() => navigate('/app/history')} style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>View all →</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                {['Date','Symbol','Side','Net P&L','Result','Strategy'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#888', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #2A2A2A', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((t, i) => {
                const pnl = parseFloat(t.netPnl) || 0
                return (
                  <tr key={t.id}
                    style={{ borderBottom: i < recentTrades.length - 1 ? '1px solid #202020' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 12px', color: '#888', fontSize: '0.77rem' }}>{format(safeDate(t.createdAt), 'MMM d, yy')}</td>
                    <td style={{ padding: '11px 12px', color: '#F5F5F5', fontWeight: 700 }}>{t.symbol}</td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{ background: t.direction === 'Long' ? 'rgba(76,175,125,0.1)' : 'rgba(224,82,82,0.1)', color: t.direction === 'Long' ? '#4CAF7D' : '#E05252', padding: '3px 9px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700 }}>{t.direction}</span>
                    </td>
                    <td style={{ padding: '11px 12px', fontFamily: 'JetBrains Mono, monospace', color: pnl >= 0 ? '#4CAF7D' : '#E05252', fontWeight: 700 }}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{
                        background: t.result === 'Win' ? 'rgba(76,175,125,0.1)' : t.result === 'Loss' ? 'rgba(224,82,82,0.1)' : 'rgba(160,160,160,0.08)',
                        color: t.result === 'Win' ? '#4CAF7D' : t.result === 'Loss' ? '#E05252' : '#888',
                        padding: '3px 9px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700,
                      }}>{t.result}</span>
                    </td>
                    <td style={{ padding: '11px 12px', color: '#888', fontSize: '0.77rem' }}>{t.strategyName || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>}
    </div>
  )
}
