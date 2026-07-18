import { useMemo } from 'react'
import { format } from 'date-fns'

/* ── Semicircle gauge (speedometer style) ── */
export function SemiGauge({ pct = 0, wins = 0, losses = 0, breakeven = 0 }) {
  const W = 160, H = 100
  const cx = W / 2, cy = H * 0.82
  const r = 58, sw = 13

  const toXY = (frac) => {
    const angle = Math.PI * (1 - frac)
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) }
  }

  const L = toXY(0)
  const R = toXY(1)
  const dot = toXY(Math.max(0.01, Math.min(pct / 100, 0.99)))

  const bgPath = `M ${L.x} ${L.y} A ${r} ${r} 0 0 1 ${R.x} ${R.y}`
  const fracWin = pct / 100
  const winPath = fracWin > 0.01
    ? `M ${L.x} ${L.y} A ${r} ${r} 0 0 1 ${dot.x} ${dot.y}`
    : null
  const lossPath = fracWin < 0.99
    ? `M ${dot.x} ${dot.y} A ${r} ${r} 0 0 1 ${R.x} ${R.y}`
    : null

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      {/* Background arc */}
      <path d={bgPath} fill="none" stroke="#2A2A2A" strokeWidth={sw} strokeLinecap="round" />
      {/* Win arc — gold/green */}
      {winPath && (
        <path d={winPath} fill="none" stroke="#4CAF7D" strokeWidth={sw}
          strokeLinecap={fracWin >= 0.99 ? 'round' : 'butt'} />
      )}
      {/* Loss arc — red */}
      {lossPath && (
        <path d={lossPath} fill="none" stroke="#E05252" strokeWidth={sw}
          strokeLinecap={fracWin <= 0.01 ? 'round' : 'butt'} />
      )}
      {/* Indicator dot */}
      <circle cx={dot.x} cy={dot.y} r={8} fill="#1E1E1E" stroke="#3B82F6" strokeWidth={2.5} />
      <text x={dot.x} y={dot.y + 3.5} textAnchor="middle" fill="#3B82F6" fontSize="7" fontWeight="800"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {breakeven}
      </text>
      {/* Win / Loss counts at arc ends */}
      <text x={L.x - 12} y={L.y + 5} textAnchor="end" fill="#4CAF7D" fontSize="11" fontWeight="800"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {wins}
      </text>
      <text x={R.x + 12} y={R.y + 5} textAnchor="start" fill="#E05252" fontSize="11" fontWeight="800"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {losses}
      </text>
    </svg>
  )
}

/* ── Full circle gauge (for profit factor) ── */
export function CircleGauge({ value = 0, max = 3, color }) {
  const size = 100
  const cx = size / 2, cy = size / 2
  const r = 36, sw = 11
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const offset = circ * (1 - pct)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2A2A2A" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

/* ── Card wrapper ── */
function GCard({ label, value, valueColor, children }) {
  return (
    <div style={{
      background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A',
      padding: '18px 20px', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ color: '#666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.45rem', color: valueColor, marginBottom: '10px', lineHeight: 1.1 }}>
        {value}
      </div>
      {children}
    </div>
  )
}

/* ── Main export ── */
export default function GaugeKPIs({ trades }) {
  const stats = useMemo(() => {
    if (!trades.length) return null

    const wins   = trades.filter(t => t.result === 'Win')
    const losses = trades.filter(t => t.result === 'Loss')
    const bes    = trades.filter(t => t.result === 'Breakeven')

    const winRate = (wins.length / trades.length) * 100

    const sumWins   = wins.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const sumLosses = Math.abs(losses.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0))
    const pf        = sumLosses > 0 ? sumWins / sumLosses : wins.length ? 3 : 0
    const avgWin    = wins.length   ? sumWins   / wins.length   : 0
    const avgLoss   = losses.length ? sumLosses / losses.length : 0
    const rr        = avgLoss > 0   ? avgWin / avgLoss : avgWin > 0 ? 3 : 0

    // Day stats
    const dayMap = {}
    trades.forEach(t => {
      const key = format(new Date(t.createdAt), 'yyyy-MM-dd')
      if (!dayMap[key]) dayMap[key] = 0
      dayMap[key] += parseFloat(t.netPnl) || 0
    })
    const dayVals   = Object.values(dayMap)
    const winDays   = dayVals.filter(v => v > 0).length
    const lossDays  = dayVals.filter(v => v < 0).length
    const beDays    = dayVals.filter(v => v === 0).length
    const dayWinPct = dayVals.length ? (winDays / dayVals.length) * 100 : 0

    const netPnl = trades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)

    return {
      winRate, wins: wins.length, losses: losses.length, bes: bes.length,
      pf, avgWin, avgLoss, rr,
      dayWinPct, winDays, lossDays, beDays,
      netPnl, tradeCount: trades.length,
    }
  }, [trades])

  if (!stats) return null

  const pfColor = stats.pf >= 2 ? '#4CAF7D' : stats.pf >= 1 ? '#3B82F6' : '#E05252'
  const rrColor = stats.rr >= 1.5 ? '#4CAF7D' : stats.rr >= 1 ? '#3B82F6' : '#E05252'
  const winTotal = stats.avgWin + stats.avgLoss
  const winBarPct = winTotal > 0 ? (stats.avgWin / winTotal) * 100 : 50

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>

      {/* ── Net P&L — sits to the left of Trade Win % ── */}
      <GCard
        label="Net P&L"
        value={`${stats.netPnl >= 0 ? '+' : '-'}$${Math.abs(stats.netPnl).toFixed(2)}`}
        valueColor={stats.netPnl >= 0 ? '#4CAF7D' : '#E05252'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          <div style={{ height: 6, background: '#242424', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${winBarPct}%`, background: '#4CAF7D' }} />
            <div style={{ flex: 1, background: '#E05252' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '0.68rem' }}>
            <span>{stats.tradeCount} trade{stats.tradeCount !== 1 ? 's' : ''}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {stats.tradeCount ? `${stats.netPnl >= 0 ? '+' : '-'}$${Math.abs(stats.netPnl / stats.tradeCount).toFixed(2)}/trade` : ''}
            </span>
          </div>
        </div>
      </GCard>

      {/* ── Trade Win % ── */}
      <GCard
        label="Trade Win %"
        value={`${stats.winRate.toFixed(2)}%`}
        valueColor={stats.winRate >= 50 ? '#3B82F6' : '#E05252'}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
          <SemiGauge
            pct={stats.winRate}
            wins={stats.wins}
            losses={stats.losses}
            breakeven={stats.bes}
          />
        </div>
      </GCard>

      {/* ── Profit Factor ── */}
      <GCard
        label="Profit Factor"
        value={stats.pf >= 99 ? '∞' : stats.pf.toFixed(2)}
        valueColor={pfColor}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '4px', position: 'relative' }}>
          <CircleGauge value={Math.min(stats.pf, 3)} max={3} color={pfColor} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', fontWeight: 800, color: pfColor }}>
              {stats.pf >= 99 ? '∞' : stats.pf.toFixed(1)}
            </span>
            <span style={{ color: '#444', fontSize: '0.6rem', marginTop: '1px' }}>/ 3.0</span>
          </div>
        </div>
      </GCard>

      {/* ── Day Win % ── */}
      <GCard
        label="Day Win %"
        value={`${stats.dayWinPct.toFixed(2)}%`}
        valueColor={stats.dayWinPct >= 50 ? '#3B82F6' : '#E05252'}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
          <SemiGauge
            pct={stats.dayWinPct}
            wins={stats.winDays}
            losses={stats.lossDays}
            breakeven={stats.beDays}
          />
        </div>
      </GCard>

      {/* ── Avg Win / Loss ── */}
      <GCard
        label="Avg Win / Loss Trade"
        value={stats.rr.toFixed(2)}
        valueColor={rrColor}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {/* Dual bar */}
          <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', gap: '2px' }}>
            <div style={{ width: `${winBarPct}%`, background: 'linear-gradient(90deg, #3A9E6A, #4CAF7D)', borderRadius: '5px 0 0 5px', minWidth: '4px' }} />
            <div style={{ flex: 1, background: 'linear-gradient(90deg, #D04848, #E05252)', borderRadius: '0 5px 5px 0' }} />
          </div>
          {/* Dollar labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', fontWeight: 800, color: '#4CAF7D', background: 'rgba(76,175,125,0.15)', padding: '4px 10px', borderRadius: '5px', border: '1px solid rgba(76,175,125,0.2)' }}>
              +${stats.avgWin.toFixed(0)}
            </span>
            <span style={{ color: '#777', fontSize: '0.72rem', fontWeight: 600 }}>avg</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', fontWeight: 800, color: '#E05252', background: 'rgba(224,82,82,0.15)', padding: '4px 10px', borderRadius: '5px', border: '1px solid rgba(224,82,82,0.2)' }}>
              -${stats.avgLoss.toFixed(0)}
            </span>
          </div>
          {/* Trade counts */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#4CAF7D', fontSize: '0.78rem', fontWeight: 700 }}>{stats.wins}W</span>
            {stats.bes > 0 && <span style={{ color: '#999', fontSize: '0.78rem', fontWeight: 600 }}>{stats.bes} BE</span>}
            <span style={{ color: '#E05252', fontSize: '0.78rem', fontWeight: 700 }}>{stats.losses}L</span>
          </div>
        </div>
      </GCard>

    </div>
  )
}
