import { useMemo, useState } from 'react'
import { useTradeStore } from '../../store/tradeStore'
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, ChevronDown, ChevronUp } from 'lucide-react'


function DayCard({ dateKey, dayTrades }) {
  const [expanded, setExpanded] = useState(true)

  const stats = useMemo(() => {
    const wins = dayTrades.filter(t => t.result === 'Win')
    const losses = dayTrades.filter(t => t.result === 'Loss')
    const netPnl = dayTrades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const grossPnl = dayTrades.reduce((s, t) => s + (parseFloat(t.grossPnl) || 0), 0)
    const commissions = dayTrades.reduce((s, t) => s + (parseFloat(t.commission) || 0), 0)
    const volume = dayTrades.reduce((s, t) => s + (parseFloat(t.positionSize) || 0), 0)
    const winRate = dayTrades.length ? ((wins.length / dayTrades.length) * 100).toFixed(0) : 0
    const sumWins = wins.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const sumLosses = Math.abs(losses.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0))
    const profitFactor = sumLosses > 0 ? (sumWins / sumLosses).toFixed(2) : wins.length ? '∞' : '0.00'
    return { netPnl, grossPnl, commissions, volume, winRate, profitFactor, wins: wins.length, losses: losses.length }
  }, [dayTrades])

  const equityData = useMemo(() => {
    let cum = 0
    return [{ v: 0 }, ...dayTrades.map(t => {
      cum += parseFloat(t.netPnl) || 0
      return { v: parseFloat(cum.toFixed(2)) }
    })]
  }, [dayTrades])

  const isProfit = stats.netPnl >= 0
  const pnlColor = isProfit ? '#4CAF7D' : '#E05252'

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', overflow: 'hidden', marginBottom: '16px' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', borderBottom: expanded ? '1px solid #3A3A3A' : 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.95rem', fontFamily: 'Poppins, sans-serif' }}>
            {format(parseISO(dateKey), 'EEE, MMM d, yyyy')}
          </span>
          <span style={{ color: '#3A3A3A' }}>•</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnlColor, fontSize: '0.95rem' }}>
            Net P&L {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}
          </span>
        </div>
        <div style={{ color: '#666' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0' }}>
          <div style={{ padding: '16px', borderRight: '1px solid #3A3A3A', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id={`grad-${dateKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={pnlColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={pnlColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '6px', color: '#F5F5F5', fontSize: '0.75rem' }}
                  formatter={(v) => [`$${v}`, 'P&L']}
                />
                <Area type="monotone" dataKey="v" stroke={pnlColor} fill={`url(#grad-${dateKey})`} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '0' }}>
            {[
              ['Total Trades', dayTrades.length],
              ['Gross P&L', `${stats.grossPnl >= 0 ? '+' : ''}$${stats.grossPnl.toFixed(2)}`],
              ['Winners / Losers', `${stats.wins} / ${stats.losses}`],
              ['Commissions', `$${stats.commissions.toFixed(2)}`],
              ['Win Rate', `${stats.winRate}%`],
              ['Volume', stats.volume],
              ['Profit Factor', stats.profitFactor],
              ['Net P&L', `${stats.netPnl >= 0 ? '+' : ''}$${stats.netPnl.toFixed(2)}`],
            ].map(([label, val], i) => (
              <div key={label} style={{
                padding: '14px 20px',
                borderRight: (i + 1) % 4 !== 0 ? '1px solid #3A3A3A' : 'none',
                borderBottom: i < 4 ? '1px solid #3A3A3A' : 'none',
              }}>
                <div style={{ color: '#666', fontSize: '0.7rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1rem',
                  color: label.includes('P&L') ? (parseFloat(String(val).replace('$','').replace('+','')) >= 0 ? '#4CAF7D' : '#E05252') :
                         label === 'Win Rate' ? (parseFloat(val) >= 50 ? '#3B82F6' : '#A0A0A0') :
                         label === 'Profit Factor' ? (parseFloat(val) >= 1 ? '#4CAF7D' : '#E05252') : '#F5F5F5'
                }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <div style={{ borderTop: '1px solid #3A3A3A' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#2E2E2E' }}>
                {['Symbol','Side','Entry','Exit','Contracts','Net P&L','Result','Strategy'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 16px', color: '#555', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dayTrades.map((t, i) => {
                const pnl = parseFloat(t.netPnl) || 0
                return (
                  <tr key={t.id}
                    style={{ borderTop: '1px solid rgba(58,58,58,0.5)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                  >
                    <td style={{ padding: '10px 16px', color: '#F5F5F5', fontWeight: 600 }}>{t.symbol}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: t.direction === 'Long' ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.15)', color: t.direction === 'Long' ? '#4CAF7D' : '#E05252', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>{t.direction}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>${parseFloat(t.entryPrice||0).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>${parseFloat(t.exitPrice||0).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>{t.positionSize || '—'}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnl >= 0 ? '#4CAF7D' : '#E05252' }}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: t.result === 'Win' ? 'rgba(76,175,125,0.15)' : t.result === 'Loss' ? 'rgba(224,82,82,0.15)' : 'rgba(160,160,160,0.15)', color: t.result === 'Win' ? '#4CAF7D' : t.result === 'Loss' ? '#E05252' : '#A0A0A0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>{t.result}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#666', fontSize: '0.78rem' }}>{t.strategyName || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Weekly view card ── */
function WeekCard({ weekLabel, weekTrades, dayMap }) {
  const [expanded, setExpanded] = useState(true)

  const stats = useMemo(() => {
    const wins = weekTrades.filter(t => t.result === 'Win')
    const losses = weekTrades.filter(t => t.result === 'Loss')
    const netPnl = weekTrades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const grossPnl = weekTrades.reduce((s, t) => s + (parseFloat(t.grossPnl) || 0), 0)
    const commissions = weekTrades.reduce((s, t) => s + (parseFloat(t.commission) || 0), 0)
    const winRate = weekTrades.length ? ((wins.length / weekTrades.length) * 100).toFixed(0) : 0
    const sumWins = wins.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const sumLosses = Math.abs(losses.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0))
    const profitFactor = sumLosses > 0 ? (sumWins / sumLosses).toFixed(2) : wins.length ? '∞' : '0.00'
    const safeD = (d) => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }
    const daysTraded = new Set(weekTrades.map(t => format(safeD(t.createdAt), 'yyyy-MM-dd'))).size
    return { netPnl, grossPnl, commissions, winRate, profitFactor, wins: wins.length, losses: losses.length, daysTraded }
  }, [weekTrades])

  const equityData = useMemo(() => {
    let cum = 0
    return [{ v: 0 }, ...weekTrades.map(t => {
      cum += parseFloat(t.netPnl) || 0
      return { v: parseFloat(cum.toFixed(2)) }
    })]
  }, [weekTrades])

  const pnlColor = stats.netPnl >= 0 ? '#4CAF7D' : '#E05252'

  // Get all days in this week that have trades
  const tradingDays = Object.keys(dayMap).sort()

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', overflow: 'hidden', marginBottom: '20px' }}>
      {/* Week header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', borderBottom: expanded ? '1px solid #3A3A3A' : 'none', background: '#2A2A2A' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            {weekLabel}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnlColor, fontSize: '1rem' }}>
            {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}
          </span>
          <span style={{ color: '#555', fontSize: '0.8rem' }}>{weekTrades.length} trade{weekTrades.length !== 1 ? 's' : ''} · {stats.daysTraded} day{stats.daysTraded !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ color: '#666' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <>
          {/* Week summary stats + chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', borderBottom: '1px solid #3A3A3A' }}>
            <div style={{ padding: '16px', borderRight: '1px solid #3A3A3A', display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={90}>
                <AreaChart data={equityData}>
                  <defs>
                    <linearGradient id={`wgrad-${weekLabel.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={pnlColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={pnlColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '6px', color: '#F5F5F5', fontSize: '0.75rem' }}
                    formatter={(v) => [`$${v}`, 'P&L']}
                  />
                  <Area type="monotone" dataKey="v" stroke={pnlColor} fill={`url(#wgrad-${weekLabel.replace(/\s/g,'')})`} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                ['Total Trades', weekTrades.length],
                ['Gross P&L', `${stats.grossPnl >= 0 ? '+' : ''}$${stats.grossPnl.toFixed(2)}`],
                ['Winners / Losers', `${stats.wins} / ${stats.losses}`],
                ['Commissions', `$${stats.commissions.toFixed(2)}`],
                ['Win Rate', `${stats.winRate}%`],
                ['Days Traded', stats.daysTraded],
                ['Profit Factor', stats.profitFactor],
                ['Net P&L', `${stats.netPnl >= 0 ? '+' : ''}$${stats.netPnl.toFixed(2)}`],
              ].map(([label, val], i) => (
                <div key={label} style={{
                  padding: '14px 20px',
                  borderRight: (i + 1) % 4 !== 0 ? '1px solid #3A3A3A' : 'none',
                  borderBottom: i < 4 ? '1px solid #3A3A3A' : 'none',
                }}>
                  <div style={{ color: '#666', fontSize: '0.7rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1rem',
                    color: label.includes('P&L') ? (parseFloat(String(val).replace('$','').replace('+','')) >= 0 ? '#4CAF7D' : '#E05252') :
                           label === 'Win Rate' ? (parseFloat(val) >= 50 ? '#3B82F6' : '#A0A0A0') :
                           label === 'Profit Factor' ? (parseFloat(val) >= 1 ? '#4CAF7D' : '#E05252') : '#F5F5F5'
                  }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-day breakdown inside the week */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#555', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily Breakdown</div>
            {tradingDays.map(dateKey => {
              const dayTrades = dayMap[dateKey]
              const dayPnl = dayTrades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
              const dayWins = dayTrades.filter(t => t.result === 'Win').length
              const dayColor = dayPnl >= 0 ? '#4CAF7D' : '#E05252'
              return (
                <div key={dateKey} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', background: '#1E1E1E', borderRadius: '8px', border: '1px solid #333' }}>
                  <div style={{ minWidth: '140px', color: '#A0A0A0', fontSize: '0.82rem', fontWeight: 500 }}>
                    {format(parseISO(dateKey), 'EEE, MMM d')}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.95rem', color: dayColor, minWidth: '90px' }}>
                    {dayPnl >= 0 ? '+' : ''}${dayPnl.toFixed(2)}
                  </div>
                  <div style={{ color: '#555', fontSize: '0.78rem', minWidth: '80px' }}>
                    {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ color: '#555', fontSize: '0.78rem' }}>
                    {dayWins}W / {dayTrades.length - dayWins}L
                  </div>
                  {/* Day mini bar */}
                  <div style={{ flex: 1, display: 'flex', gap: '3px', justifyContent: 'flex-end' }}>
                    {dayTrades.map((t, i) => {
                      const pnl = parseFloat(t.netPnl) || 0
                      return (
                        <div key={i} style={{ width: '8px', height: '28px', borderRadius: '3px', background: pnl >= 0 ? 'rgba(76,175,125,0.6)' : 'rgba(224,82,82,0.6)', border: `1px solid ${pnl >= 0 ? 'rgba(76,175,125,0.4)' : 'rgba(224,82,82,0.4)'}` }} title={`${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`} />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function DayView() {
  const { trades } = useTradeStore()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('day') // 'day' | 'week'

  const _safeD = (d) => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }

  // Group by day
  const groupedByDay = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      const key = format(_safeD(t.createdAt), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [trades])

  // Group by week
  const groupedByWeek = useMemo(() => {
    const weekMap = {}
    trades.forEach(t => {
      const date = _safeD(t.createdAt)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Mon
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      if (!weekMap[weekKey]) weekMap[weekKey] = { trades: [], dayMap: {}, weekStart }
      weekMap[weekKey].trades.push(t)
      const dayKey = format(date, 'yyyy-MM-dd')
      if (!weekMap[weekKey].dayMap[dayKey]) weekMap[weekKey].dayMap[dayKey] = []
      weekMap[weekKey].dayMap[dayKey].push(t)
    })
    return Object.entries(weekMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekKey, data]) => {
        const ws = data.weekStart
        const we = endOfWeek(ws, { weekStartsOn: 1 })
        const label = `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
        return { weekKey, label, trades: data.trades, dayMap: data.dayMap }
      })
  }, [trades])

  if (!trades.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✝</div>
      <p style={{ color: '#A0A0A0', marginBottom: '20px' }}>No trades yet. Log your first trade to see your daily view.</p>
      <button onClick={() => navigate('/app/log')} className="btn-gold" style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <PlusCircle size={15} /> Log Trade
      </button>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>
            {viewMode === 'day' ? 'Daily View' : 'Weekly View'}
          </h1>
          {/* Day / Week toggle */}
          <div style={{ display: 'flex', background: '#1A1A1A', borderRadius: '10px', padding: '4px', gap: '2px' }}>
            {[['day', 'Day'], ['week', 'Week']].map(([v, label]) => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{
                  padding: '6px 18px', borderRadius: '7px', border: 'none', fontSize: '0.82rem',
                  cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                  background: viewMode === v ? '#3B82F6' : 'transparent',
                  color: viewMode === v ? '#1A1A1A' : '#666',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => navigate('/app/log')} className="btn-gold" style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <PlusCircle size={15} /> Log Trade
        </button>
      </div>

      {/* Day view */}
      {viewMode === 'day' && groupedByDay.map(([dateKey, dayTrades]) => (
        <DayCard key={dateKey} dateKey={dateKey} dayTrades={dayTrades} />
      ))}

      {/* Week view */}
      {viewMode === 'week' && groupedByWeek.map(({ weekKey, label, trades: wTrades, dayMap }) => (
        <WeekCard key={weekKey} weekLabel={label} weekTrades={wTrades} dayMap={dayMap} />
      ))}


    </div>
  )
}
