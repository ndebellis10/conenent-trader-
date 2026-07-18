import { useMemo } from 'react'
import { format } from 'date-fns'

function computeScore(trades) {
  if (!trades.length) return null

  const wins = trades.filter(t => t.result === 'Win')
  const losses = trades.filter(t => t.result === 'Loss')

  // Win Rate score — 65%+ WR = perfect 100
  const winRate = (wins.length / trades.length) * 100
  const winRateScore = Math.min((winRate / 65) * 100, 100)

  // Profit Factor score — PF 3+ = perfect 100
  const sumWins = wins.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
  const sumLosses = Math.abs(losses.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0))
  const pf = sumLosses > 0 ? sumWins / sumLosses : wins.length ? 3 : 0
  const pfScore = Math.min((pf / 3) * 100, 100)

  // Avg Win/Loss ratio score — ratio 3+ = perfect
  const avgWin = wins.length ? sumWins / wins.length : 0
  const avgLoss = losses.length ? sumLosses / losses.length : 0
  const rr = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 3 : 0
  const rrScore = Math.min((rr / 3) * 100, 100)

  // Consistency — % of profitable trading days, 70%+ = perfect
  const _safeD = (d) => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }
  const dayMap = {}
  trades.forEach(t => {
    const key = format(_safeD(t.createdAt), 'yyyy-MM-dd')
    if (!dayMap[key]) dayMap[key] = 0
    dayMap[key] += parseFloat(t.netPnl) || 0
  })
  const dayVals = Object.values(dayMap)
  const profDays = dayVals.filter(p => p > 0).length
  const consistency = dayVals.length ? (profDays / dayVals.length) * 100 : 0
  const consistencyScore = Math.min((consistency / 70) * 100, 100)

  // Max Drawdown control — running equity peak-to-trough
  let peak = 0, maxDD = 0, equity = 0
  ;[...trades].reverse().forEach(t => {
    equity += parseFloat(t.netPnl) || 0
    if (equity > peak) peak = equity
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    if (dd > maxDD) maxDD = dd
  })
  // 0% drawdown = 100, 50%+ drawdown = 0
  const ddScore = Math.max(100 - maxDD * 2, 0)

  // Recovery Factor — net profit / max drawdown amount
  const totalPnl = trades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
  const maxDDAmount = (maxDD / 100) * Math.max(peak, 1)
  const rf = maxDDAmount > 0 ? Math.max(totalPnl / maxDDAmount, 0) : totalPnl > 0 ? 3 : 0
  const rfScore = Math.min((rf / 3) * 100, 100)

  // Weighted faith score
  const covenantScore =
    winRateScore * 0.22 +
    pfScore * 0.22 +
    rrScore * 0.18 +
    consistencyScore * 0.18 +
    ddScore * 0.10 +
    rfScore * 0.10

  return {
    score: parseFloat(covenantScore.toFixed(2)),
    raw: {
      winRate: winRate.toFixed(1),
      pf: pf === 3 && sumLosses === 0 ? '∞' : pf.toFixed(2),
      rr: rr.toFixed(2),
      consistency: consistency.toFixed(0),
      maxDD: maxDD.toFixed(1),
      rf: rf >= 3 && maxDDAmount === 0 ? '∞' : rf.toFixed(2),
    },
  }
}

function scoreLabel(score) {
  if (score >= 85) return { label: 'Elite', color: '#4CAF7D' }
  if (score >= 70) return { label: 'Strong', color: '#7BCF8A' }
  if (score >= 55) return { label: 'Developing', color: '#3B82F6' }
  if (score >= 40) return { label: 'Improving', color: '#E0A752' }
  return { label: 'Needs Work', color: '#E05252' }
}

const RING_SIZE = 168
const RING_R = 72
const RING_CIRC = 2 * Math.PI * RING_R

export default function FaithScore({ trades }) {
  const data = useMemo(() => computeScore(trades), [trades])

  if (!data) return null

  const { score, raw } = data
  const { label, color } = scoreLabel(score)
  const offset = RING_CIRC * (1 - Math.min(Math.max(score, 0), 100) / 100)

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '0.8rem' }}>Covenant Score</span>
          <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontSize: '0.56rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em' }}>BETA</span>
        </div>
        <span style={{ color: '#555', fontSize: '0.62rem' }}>{trades.length} trade{trades.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 14px 8px' }}>
        {/* The wheel */}
        <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="#1A1A1A" strokeWidth={16} />
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke={color} strokeWidth={16}
            strokeDasharray={RING_CIRC} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 8px ${color}66)` }}
          />
        </svg>

        {/* Score, underneath the wheel */}
        <div style={{ marginTop: '-4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2.4rem', fontWeight: 800, color, lineHeight: 1 }}>
            {score.toFixed(1)}
          </span>
          <span style={{ color, fontSize: '0.72rem', fontWeight: 700, background: `${color}18`, padding: '2px 10px', borderRadius: '999px' }}>{label}</span>
        </div>

        {/* Metric breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '16px' }}>
          {[
            { label: 'Win Rate',      value: `${raw.winRate}%` },
            { label: 'Profit Factor', value: raw.pf },
            { label: 'Avg Win/Loss',  value: raw.rr },
            { label: 'Consistency',   value: `${raw.consistency}%` },
          ].map(({ label: l, value: v }) => (
            <div key={l} style={{ background: '#1E1E1E', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ color: '#777', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '3px' }}>{l}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.9rem', color: '#3B82F6' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

