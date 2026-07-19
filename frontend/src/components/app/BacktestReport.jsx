import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { FlaskConical, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { avgTradeDuration, formatDuration } from '../../lib/tradeTime'
import { useTradeStore } from '../../store/tradeStore'
import { tradeDurationMs } from '../../lib/tradeTime'

/* Backtesting report — its own dashboard, fed only by trades tagged
   'Backtest' (imported through the Backtest page). Deliberately separate
   from the live Performance/Psychology/Execution tabs. */

const PURPLE = '#B98CE0'
const card = { background: '#1E1E1E', borderRadius: '12px', border: '1px solid #2A2A2A', padding: '20px 22px' }
const money = v => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`

function Head({ label }) {
  return (
    <div style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700, marginBottom: 14 }}>{label}</div>
  )
}

export default function BacktestReport({ trades, onImport }) {
  const deleteTrade = useTradeStore(st => st.deleteTrade)
  const [confirmAll, setConfirmAll] = useState(false)

  // Newest first for the table at the bottom
  const listed = useMemo(() => [...trades].sort(
    (a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
  ), [trades])

  const deleteAll = () => {
    listed.forEach(t => deleteTrade(t.id))
    setConfirmAll(false)
  }

  const s = useMemo(() => {
    if (!trades.length) return null

    const wins   = trades.filter(t => t.result === 'Win')
    const losses = trades.filter(t => t.result === 'Loss')
    const pnls   = trades.map(t => parseFloat(t.netPnl) || 0)
    const total  = pnls.reduce((a, b) => a + b, 0)
    const gross  = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0)
    const grossL = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0))

    // Equity curve, oldest first
    const ordered = [...trades].sort(
      (a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0)
    )
    let running = 0
    const curve = ordered.map((t, i) => {
      running += parseFloat(t.netPnl) || 0
      return { name: `#${i + 1}`, equity: parseFloat(running.toFixed(2)) }
    })

    // Largest peak-to-trough drop
    let peak = 0
    let maxDD = 0
    curve.forEach(pt => {
      if (pt.equity > peak) peak = pt.equity
      const dd = peak - pt.equity
      if (dd > maxDD) maxDD = dd
    })

    // Streaks, on the same ordering as the equity curve
    let curW = 0, curL = 0, maxW = 0, maxL = 0
    ordered.forEach(t => {
      if (t.result === 'Win')       { curW++; curL = 0; if (curW > maxW) maxW = curW }
      else if (t.result === 'Loss') { curL++; curW = 0; if (curL > maxL) maxL = curL }
      else                          { curW = 0; curL = 0 }
    })

    // Long vs short
    const side = dir => {
      const list = trades.filter(t => String(t.direction || '').toLowerCase() === dir)
      const w = list.filter(t => t.result === 'Win').length
      return {
        n: list.length,
        wr: list.length ? (w / list.length) * 100 : 0,
        pnl: list.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0),
      }
    }

    // Day of week
    const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dow = DOW.map(label => ({ label, n: 0, wins: 0, pnl: 0 }))
    trades.forEach(t => {
      const d = new Date(t.date || t.createdAt)
      if (isNaN(d.getTime())) return
      const b = dow[d.getDay()]
      b.n += 1
      b.pnl += parseFloat(t.netPnl) || 0
      if (t.result === 'Win') b.wins += 1
    })
    const dowActive = dow.filter(d => d.n > 0)

    // Per-day totals → consistency
    const dayMap = {}
    trades.forEach(t => {
      const k = String(t.date || t.createdAt || '').slice(0, 10)
      if (!k) return
      dayMap[k] = (dayMap[k] || 0) + (parseFloat(t.netPnl) || 0)
    })
    const dayVals = Object.values(dayMap)
    const greenDays = dayVals.filter(v => v > 0).length

    const bySymbol = {}
    trades.forEach(t => {
      const k = (t.symbol || '—').toUpperCase()
      if (!bySymbol[k]) bySymbol[k] = { symbol: k, n: 0, pnl: 0, wins: 0 }
      bySymbol[k].n += 1
      bySymbol[k].pnl += parseFloat(t.netPnl) || 0
      if (t.result === 'Win') bySymbol[k].wins += 1
    })

    return {
      count: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / trades.length) * 100,
      total,
      avgWin:  wins.length   ? gross  / wins.length   : 0,
      avgLoss: losses.length ? grossL / losses.length : 0,
      pf: grossL > 0 ? gross / grossL : (gross > 0 ? Infinity : 0),
      expectancy: total / trades.length,
      best:  Math.max(...pnls),
      worst: Math.min(...pnls),
      maxDD,
      curve,
      bySymbol: Object.values(bySymbol).sort((a, b) => b.pnl - a.pnl),
      maxW, maxL,
      long: side('long'), short: side('short'),
      dow: dowActive,
      bestDow:  dowActive.length ? dowActive.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null,
      worstDow: dowActive.length ? dowActive.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null,
      days: dayVals.length,
      greenDays,
      consistency: dayVals.length ? (greenDays / dayVals.length) * 100 : 0,
      avgPerDay: dayVals.length ? total / dayVals.length : 0,
      hold: avgTradeDuration(trades),
    }
  }, [trades])

  if (!s) return (
    <div style={{ textAlign: 'center', padding: '70px 24px' }}>
      <FlaskConical size={34} color="rgba(185,140,224,0.45)" style={{ display: 'block', margin: '0 auto 14px' }} />
      <p style={{ color: '#A0A0A0', marginBottom: 6, fontSize: '0.95rem' }}>No backtest trades yet.</p>
      <p style={{ color: '#5A5A5A', fontSize: '0.83rem', marginBottom: 22, lineHeight: 1.6 }}>
        Import a CSV from the Backtesting page — those trades are tagged and reported<br />
        here, separately from your live results.
      </p>
      <button onClick={onImport} style={{ padding: '11px 22px', borderRadius: 10, border: '1px solid rgba(185,140,224,0.4)', background: 'rgba(185,140,224,0.12)', color: PURPLE, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Upload size={15} /> Import backtest CSV
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Make it unmistakable these are paper results */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(185,140,224,0.07)', border: '1px solid rgba(185,140,224,0.25)', borderRadius: 10, padding: '11px 16px', flexWrap: 'wrap' }}>
        <FlaskConical size={16} color={PURPLE} />
        <span style={{ color: PURPLE, fontSize: '0.83rem', fontWeight: 700 }}>Backtest results</span>
        <span style={{ color: '#777', fontSize: '0.8rem' }}>
          {s.count} paper trade{s.count !== 1 ? 's' : ''} — kept out of your live P&amp;L, Covenant Score and leaderboard rank.
        </span>
        <button onClick={onImport} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: PURPLE, fontSize: '0.79rem', fontWeight: 700, cursor: 'pointer' }}>
          Import more →
        </button>
      </div>

      {/* Headline stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Net P&L',       value: money(s.total),                         color: s.total >= 0 ? '#4CAF7D' : '#E05252' },
          { label: 'Win Rate',      value: `${s.winRate.toFixed(1)}%`,             color: s.winRate >= 50 ? '#4CAF7D' : '#E05252', sub: `${s.wins}W / ${s.losses}L` },
          { label: 'Profit Factor', value: isFinite(s.pf) ? s.pf.toFixed(2) : '∞', color: s.pf >= 2 ? '#4CAF7D' : s.pf >= 1 ? '#3B82F6' : '#E05252' },
          { label: 'Expectancy',    value: money(s.expectancy),                    color: s.expectancy >= 0 ? '#4CAF7D' : '#E05252', sub: 'per trade' },
          { label: 'Max Drawdown',  value: `$${s.maxDD.toFixed(2)}`,               color: '#E05252', sub: 'peak to trough' },
          { label: 'Consistency',   value: `${s.consistency.toFixed(0)}%`,          color: s.consistency >= 50 ? '#4CAF7D' : '#E05252', sub: `${s.greenDays}/${s.days} green days` },
          { label: 'Avg / Day',     value: money(s.avgPerDay),                      color: s.avgPerDay >= 0 ? '#4CAF7D' : '#E05252', sub: `${s.days} day${s.days !== 1 ? 's' : ''} traded` },
          { label: 'Best Streak',   value: `${s.maxW}W`,                            color: '#4CAF7D', sub: `worst ${s.maxL}L` },
          { label: 'Avg Hold',      value: s.hold.ms != null ? formatDuration(s.hold.ms) : '—', color: s.hold.ms != null ? '#3B82F6' : '#444', sub: s.hold.counted ? `${s.hold.counted} timed` : 'no entry/exit times' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ ...card, padding: '15px 17px' }}>
            <div style={{ color: '#8A8A8A', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.2rem', color, marginTop: 6 }}>{value}</div>
            {sub && <div style={{ color: '#5E5E5E', fontSize: '0.7rem', marginTop: 3 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <div style={card}>
        <Head label="Backtest Equity Curve" />
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={s.curve}>
            <defs>
              <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PURPLE} stopOpacity={0.22} />
                <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" type="category" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} width={54} />
            <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2E2E2E', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.78rem' }} />
            <ReferenceLine y={0} stroke="#333" />
            <Area type="monotone" dataKey="equity" stroke={PURPLE} fill="url(#btGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        {/* Long vs short */}
        <div style={card}>
          <Head label="Long vs Short" />
          {[['Long', s.long, '#4CAF7D'], ['Short', s.short, '#E05252']].map(([label, d, c], i) => (
            <div key={label} style={{ padding: '11px 0', borderBottom: i === 0 ? '1px solid #252525' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ color: '#E0E0E0', fontSize: '0.84rem', fontWeight: 700, width: 52 }}>{label}</span>
                <span style={{ color: '#777', fontSize: '0.76rem' }}>{d.n} trade{d.n !== 1 ? 's' : ''}</span>
                <span style={{ color: '#999', fontSize: '0.76rem', fontFamily: 'JetBrains Mono, monospace' }}>{d.n ? `${d.wr.toFixed(0)}%` : '—'}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.84rem', fontWeight: 700, color: d.pnl >= 0 ? '#4CAF7D' : '#E05252' }}>
                  {d.n ? money(d.pnl) : '—'}
                </span>
              </div>
              <div style={{ height: 5, background: '#242424', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${d.n ? d.wr : 0}%`, height: '100%', background: c, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Day of week */}
        <div style={card}>
          <Head label="By Day of Week" />
          {s.bestDow && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ color: '#4CAF7D', fontSize: '0.76rem', fontWeight: 700 }}>Best {s.bestDow.label} {money(s.bestDow.pnl)}</span>
              <span style={{ color: '#E05252', fontSize: '0.76rem', fontWeight: 700 }}>Worst {s.worstDow.label} {money(s.worstDow.pnl)}</span>
            </div>
          )}
          {s.dow.map((d, i, arr) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #252525' : 'none' }}>
              <span style={{ color: '#C0C0C0', fontSize: '0.8rem', fontWeight: 600, width: 78 }}>{d.label}</span>
              <span style={{ color: '#777', fontSize: '0.74rem', width: 56 }}>{d.n} trade{d.n !== 1 ? 's' : ''}</span>
              <span style={{ color: '#999', fontSize: '0.74rem', fontFamily: 'JetBrains Mono, monospace', width: 38 }}>{Math.round((d.wins / d.n) * 100)}%</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 700, color: d.pnl >= 0 ? '#4CAF7D' : '#E05252' }}>{money(d.pnl)}</span>
            </div>
          ))}
        </div>

        <div style={card}>
          <Head label="Trade Extremes" />
          {[
            { label: 'Best trade',   value: money(s.best),     color: '#4CAF7D' },
            { label: 'Worst trade',  value: money(s.worst),    color: '#E05252' },
            { label: 'Average win',  value: money(s.avgWin),   color: '#4CAF7D' },
            { label: 'Average loss', value: money(-s.avgLoss), color: '#E05252' },
          ].map(({ label, value, color }, i, arr) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #252525' : 'none' }}>
              <span style={{ color: '#909090', fontSize: '0.8rem' }}>{label}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={card}>
          <Head label="By Symbol" />
          {s.bySymbol.slice(0, 8).map((r, i, arr) => (
            <div key={r.symbol} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #252525' : 'none' }}>
              <span style={{ color: '#E0E0E0', fontSize: '0.83rem', fontWeight: 700, width: 68 }}>{r.symbol}</span>
              <span style={{ color: '#777', fontSize: '0.76rem', width: 62 }}>{r.n} trade{r.n !== 1 ? 's' : ''}</span>
              <span style={{ color: '#999', fontSize: '0.76rem', fontFamily: 'JetBrains Mono, monospace', width: 46 }}>
                {Math.round((r.wins / r.n) * 100)}%
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.83rem', fontWeight: 700, color: r.pnl >= 0 ? '#4CAF7D' : '#E05252' }}>
                {money(r.pnl)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Every backtest trade, deletable */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700 }}>
            All Backtest Trades <span style={{ color: '#666', fontWeight: 500 }}>({listed.length})</span>
          </span>
          {confirmAll ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <AlertTriangle size={14} color="#E05252" />
              <span style={{ color: '#E05252', fontSize: '0.79rem' }}>Delete all {listed.length}? This cannot be undone.</span>
              <button onClick={deleteAll} style={{ background: 'rgba(224,82,82,0.15)', border: '1px solid rgba(224,82,82,0.4)', color: '#E05252', borderRadius: 7, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>Yes, delete</button>
              <button onClick={() => setConfirmAll(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmAll(true)} style={{ background: 'none', border: 'none', color: '#7A7A7A', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Delete all
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                {['Date', 'Symbol', 'Side', 'Result', 'Hold', 'Net P&L', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: h === 'Net P&L' ? 'right' : 'left', color: '#6A6A6A', fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 10px 9px 0', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listed.map((t, i) => {
                const pnl = parseFloat(t.netPnl) || 0
                const rc = t.result === 'Win' ? '#4CAF7D' : t.result === 'Loss' ? '#E05252' : '#888'
                const held = tradeDurationMs(t)
                return (
                  <tr key={t.id || i} style={{ borderTop: '1px solid #262626' }}>
                    <td style={{ padding: '9px 10px 9px 0', color: '#A8A8A8' }}>{String(t.date || '').slice(0, 10) || '—'}</td>
                    <td style={{ padding: '9px 10px 9px 0', color: '#E4E4E4', fontWeight: 600 }}>{t.symbol || '—'}</td>
                    <td style={{ padding: '9px 10px 9px 0', color: '#8A8A8A' }}>{t.direction || '—'}</td>
                    <td style={{ padding: '9px 10px 9px 0', color: rc, fontWeight: 600 }}>{t.result || '—'}</td>
                    <td style={{ padding: '9px 10px 9px 0', color: '#777', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>{held != null ? formatDuration(held) : '—'}</td>
                    <td style={{ padding: '9px 0', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnl >= 0 ? '#4CAF7D' : '#E05252' }}>{money(pnl)}</td>
                    <td style={{ padding: '9px 0 9px 12px', textAlign: 'right', width: 34 }}>
                      <button onClick={() => deleteTrade(t.id)} title="Delete this trade"
                        style={{ background: 'none', border: 'none', color: '#4A4A4A', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#E05252' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#4A4A4A' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
