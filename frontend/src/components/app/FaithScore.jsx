import { useMemo } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
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
  const faithScore =
    winRateScore * 0.22 +
    pfScore * 0.22 +
    rrScore * 0.18 +
    consistencyScore * 0.18 +
    ddScore * 0.10 +
    rfScore * 0.10

  return {
    score: parseFloat(faithScore.toFixed(2)),
    radar: [
      { metric: 'Win %',           value: Math.round(winRateScore) },
      { metric: 'Profit Factor',   value: Math.round(pfScore) },
      { metric: 'Avg Win/Loss',    value: Math.round(rrScore) },
      { metric: 'Recovery Factor', value: Math.round(rfScore) },
      { metric: 'Max Drawdown',    value: Math.round(ddScore) },
      { metric: 'Consistency',     value: Math.round(consistencyScore) },
    ],
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

export default function FaithScore({ trades }) {
  const data = useMemo(() => computeScore(trades), [trades])

  if (!data) return null

  const { score, radar, raw } = data
  const { label, color } = scoreLabel(score)

  // Gradient bar marker position
  const markerPct = Math.min(Math.max(score, 0), 100)

  return (
    <div style={{ background: '#242424', borderRadius: '14px', border: '1px solid #3A3A3A', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '0.85rem' }}>Faith Score</span>
          <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: '5px', letterSpacing: '0.04em' }}>BETA</span>
        </div>
        <span style={{ color: '#555', fontSize: '0.68rem' }}>{trades.length} trade{trades.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
        {/* Radar chart */}
        <div style={{ padding: '4px 0 8px', borderRight: '1px solid #3A3A3A' }}>
          <ResponsiveContainer width="100%" height={150}>
            <RadarChart data={radar} margin={{ top: 10, right: 26, bottom: 10, left: 26 }}>
              <PolarGrid
                gridType="polygon"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={1}
              />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#888', fontSize: 11, fontWeight: 500 }}
                tickLine={false}
              />
              <Radar
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="#3B82F6"
                fillOpacity={0.18}
                dot={{ fill: '#3B82F6', r: 3, strokeWidth: 0 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score panel */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Score number */}
          <div>
            <div style={{ color: '#666', fontSize: '0.62rem', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Faith Score</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.9rem', fontWeight: 800, color, lineHeight: 1 }}>
                {score.toFixed(1)}
              </span>
              <span style={{ color, fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px', background: `${color}18`, padding: '1px 8px', borderRadius: '6px' }}>{label}</span>
            </div>
            <div style={{ color: '#444', fontSize: '0.62rem', marginBottom: '10px' }}>out of 100</div>

            {/* Gradient bar */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <div style={{
                height: '10px', borderRadius: '999px',
                background: 'linear-gradient(to right, #E05252 0%, #E07850 20%, #3B82F6 45%, #7BCF8A 70%, #4CAF7D 100%)',
              }} />
              {/* Marker */}
              <div style={{
                position: 'absolute',
                top: '-4px',
                left: `calc(${markerPct}% - 9px)`,
                width: '18px', height: '18px',
                borderRadius: '50%',
                background: color,
                border: '3px solid #242424',
                boxShadow: `0 0 8px ${color}88`,
                transition: 'left 0.6s ease',
              }} />
              {/* Scale labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                {['0', '20', '40', '60', '80', '100'].map(n => (
                  <span key={n} style={{ color: '#444', fontSize: '0.65rem' }}>{n}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Metric breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
            {[
              { label: 'Win Rate',      value: `${raw.winRate}%` },
              { label: 'Profit Factor', value: raw.pf },
              { label: 'Avg Win/Loss',  value: raw.rr },
              { label: 'Consistency',   value: `${raw.consistency}%` },
              { label: 'Max Drawdown',  value: `${raw.maxDD}%` },
              { label: 'Recovery',      value: raw.rf },
            ].map(({ label: l, value: v }) => (
              <div key={l} style={{ background: '#1E1E1E', borderRadius: '6px', padding: '5px 7px' }}>
                <div style={{ color: '#555', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '1px' }}>{l}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.72rem', color: '#3B82F6' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ImprovementTips({ raw, score }) {
  const tips = []

  if (parseFloat(raw.winRate) < 65)
    tips.push({ icon: '🎯', metric: 'Win Rate', current: `${raw.winRate}%`, target: '65%+', tip: 'Be more selective — only take A+ setups where all confluences align.' })
  if (parseFloat(raw.pf) < 3 && raw.pf !== '∞')
    tips.push({ icon: '⚡', metric: 'Profit Factor', current: raw.pf, target: '3.0+', tip: 'Cut losses faster and let winners run past your first target.' })
  if (parseFloat(raw.rr) < 1.5)
    tips.push({ icon: '📐', metric: 'Avg Win/Loss', current: raw.rr, target: '1.5+', tip: 'Aim for at least 1.5R on every trade. Move stop to BE at 1R.' })
  if (parseFloat(raw.consistency) < 70)
    tips.push({ icon: '📅', metric: 'Consistency', current: `${raw.consistency}%`, target: '70%+ green days', tip: 'Stop trading after 2 losses in a day — protect your daily P&L.' })
  if (parseFloat(raw.maxDD) > 10)
    tips.push({ icon: '🛡️', metric: 'Max Drawdown', current: `${raw.maxDD}%`, target: '<10%', tip: 'Reduce position size during losing streaks to limit drawdown.' })
  if (parseFloat(raw.rf) < 3 && raw.rf !== '∞')
    tips.push({ icon: '🔄', metric: 'Recovery Factor', current: raw.rf, target: '3.0+', tip: 'Focus on growing net profit while keeping drawdown low.' })

  if (!tips.length) return (
    <div style={{ borderTop: '1px solid #3A3A3A', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: '1.1rem' }}>✝</span>
      <span style={{ color: '#4CAF7D', fontSize: '0.82rem', fontWeight: 600 }}>Elite performance — keep walking in discipline and consistency.</span>
    </div>
  )

  return (
    <div style={{ borderTop: '1px solid #3A3A3A', padding: '16px 20px' }}>
      <div style={{ color: '#888', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', fontWeight: 700 }}>
        How to improve your score
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tips.map(({ icon, metric, current, target, tip }) => (
          <div key={metric} style={{ display: 'flex', gap: '12px', background: '#1E1E1E', borderRadius: '8px', padding: '10px 14px', border: '1px solid #2A2A2A' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ color: '#F5F5F5', fontSize: '0.78rem', fontWeight: 700 }}>{metric}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#E05252', background: 'rgba(224,82,82,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{current}</span>
                <span style={{ color: '#444', fontSize: '0.68rem' }}>→</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#4CAF7D', background: 'rgba(76,175,125,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{target}</span>
              </div>
              <div style={{ color: '#777', fontSize: '0.72rem', lineHeight: 1.4 }}>{tip}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
