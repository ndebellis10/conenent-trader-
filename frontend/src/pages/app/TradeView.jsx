import { useMemo, useState } from 'react'
import { useTradeStore } from '../../store/tradeStore'
import { format } from 'date-fns'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { SemiGauge, CircleGauge } from '../../components/app/GaugeKPIs'

/* ── Top stat cards ── */
function PnlCard({ trades }) {
  const { total, curve } = useMemo(() => {
    let cum = 0
    const pts = [{ v: 0 }, ...[...trades].reverse().map(t => {
      cum += parseFloat(t.netPnl) || 0
      return { v: parseFloat(cum.toFixed(2)) }
    })]
    return { total: cum, curve: pts }
  }, [trades])

  const color = total >= 0 ? '#4CAF7D' : '#E05252'
  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Cumulative P&L</span>
        <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>{trades.length}</span>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.5rem', color, lineHeight: 1.1 }}>
        {total >= 0 ? '+' : ''}${total.toFixed(2)}
      </div>
      <div style={{ marginTop: '6px', height: '50px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curve}>
            <defs>
              <linearGradient id="tvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} fill="url(#tvGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PfCard({ trades }) {
  const { pf, pfColor } = useMemo(() => {
    const wins = trades.filter(t => t.result === 'Win')
    const losses = trades.filter(t => t.result === 'Loss')
    const sw = wins.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const sl = Math.abs(losses.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0))
    const pf = sl > 0 ? sw / sl : wins.length ? 3 : 0
    return { pf, pfColor: pf >= 2 ? '#4CAF7D' : pf >= 1 ? '#3B82F6' : '#E05252' }
  }, [trades])

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ color: '#666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit Factor</span>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.5rem', color: pfColor, lineHeight: 1.1 }}>
        {pf >= 99 ? '∞' : pf.toFixed(2)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginTop: '4px' }}>
        <CircleGauge value={Math.min(pf, 3)} max={3} color={pfColor} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: 800, color: pfColor }}>
            {pf >= 99 ? '∞' : pf.toFixed(1)}
          </span>
          <span style={{ color: '#444', fontSize: '0.58rem' }}>/ 3.0</span>
        </div>
      </div>
    </div>
  )
}

function WinCard({ trades }) {
  const { winRate, wins, losses, bes } = useMemo(() => {
    const w = trades.filter(t => t.result === 'Win').length
    const l = trades.filter(t => t.result === 'Loss').length
    const b = trades.filter(t => t.result === 'Breakeven').length
    return { winRate: trades.length ? (w / trades.length) * 100 : 0, wins: w, losses: l, bes: b }
  }, [trades])

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ color: '#666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trade Win %</span>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.5rem', color: winRate >= 50 ? '#3B82F6' : '#E05252', lineHeight: 1.1 }}>
        {winRate.toFixed(2)}%
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
        <SemiGauge pct={winRate} wins={wins} losses={losses} breakeven={bes} />
      </div>
    </div>
  )
}

function AvgCard({ trades }) {
  const { rr, avgWin, avgLoss, wins, losses, bes } = useMemo(() => {
    const ws = trades.filter(t => t.result === 'Win')
    const ls = trades.filter(t => t.result === 'Loss')
    const sw = ws.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const sl = Math.abs(ls.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0))
    const avgWin = ws.length ? sw / ws.length : 0
    const avgLoss = ls.length ? sl / ls.length : 0
    const rr = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 3 : 0
    return { rr, avgWin, avgLoss, wins: ws.length, losses: ls.length, bes: trades.filter(t => t.result === 'Breakeven').length }
  }, [trades])

  const rrColor = rr >= 1.5 ? '#4CAF7D' : rr >= 1 ? '#3B82F6' : '#E05252'
  const total = avgWin + avgLoss
  const winBarPct = total > 0 ? (avgWin / total) * 100 : 50

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ color: '#666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Win / Loss Trade</span>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.5rem', color: rrColor, lineHeight: 1.1 }}>{rr.toFixed(2)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
        <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', gap: '2px' }}>
          <div style={{ width: `${winBarPct}%`, background: 'linear-gradient(90deg,#3A9E6A,#4CAF7D)', borderRadius: '5px 0 0 5px', minWidth: 4 }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg,#D04848,#E05252)', borderRadius: '0 5px 5px 0' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 700, color: '#4CAF7D', background: 'rgba(76,175,125,0.1)', padding: '2px 8px', borderRadius: '5px' }}>+${avgWin.toFixed(0)}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 700, color: '#E05252', background: 'rgba(224,82,82,0.1)', padding: '2px 8px', borderRadius: '5px' }}>-${avgLoss.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#4CAF7D', fontSize: '0.7rem' }}>{wins}W</span>
          {bes > 0 && <span style={{ color: '#666', fontSize: '0.7rem' }}>{bes} BE</span>}
          <span style={{ color: '#E05252', fontSize: '0.7rem' }}>{losses}L</span>
        </div>
      </div>
    </div>
  )
}

/* ── Psychology tag colors ── */
const PSYCH_COLORS = {
  // Pre-trade emotions
  Confident: '#4CAF7D', Greedy: '#E05252', Fearful: '#B47FE0', Excited: '#3B82F6', FOMO: '#FF8C00',
  // Post-trade emotions
  Happy: '#4CAF7D', Sad: '#5B9BD5', Mad: '#E05252', Disappointed: '#B47FE0',
  // Sleep / Energy / Focus
  Excellent: '#4CAF7D', Good: '#4CAF7D', Fair: '#3B82F6', Poor: '#E05252',
  High: '#4CAF7D', Medium: '#3B82F6', Low: '#E05252',
  'Locked In': '#4CAF7D', Focused: '#4CAF7D', Distracted: '#3B82F6', Scattered: '#E05252',
  // Yes/No
  Yes: '#E05252', No: '#4CAF7D',
  // HTF bias / Market structure
  Bullish: '#4CAF7D', Bearish: '#E05252', Neutral: '#888',
  // Stress override (High stress = bad = red)
}
// For stress level, High = bad
const STRESS_COLORS = { High: '#E05252', Medium: '#3B82F6', Low: '#4CAF7D' }

function PsychTag({ label, value, stressField }) {
  if (!value) return null
  const color = stressField ? STRESS_COLORS[value] : (PSYCH_COLORS[value] || '#888')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
      background: `${color}18`, border: `1px solid ${color}40`, color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: '#666', fontWeight: 400 }}>{label}:</span> {value}
    </span>
  )
}

function TradeDetailRow({ t }) {
  const hasPsych = t.preTrade || t.postTrade || t.stressLevel || t.sleepQuality || t.focusLevel || t.energyLevel || t.revengeTrade || t.movedStopFear
  const hasContext = t.tradingSession || t.htfBias || t.marketStructure || t.setupType || (t.confluences?.length > 0)
  const hasExec = t.waitedConfirmation || t.enteredAtLevel || t.exitDecision || t.rushedEntry || t.protectedStop || t.targetedLiquidity
  const hasNotes = t.mindsetNotes || t.wentWell || t.toImprove

  return (
    <tr>
      <td colSpan={8} style={{ padding: '0 14px 14px', background: 'rgba(59,130,246,0.03)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid #2A2A2A' }}>

          {hasPsych && (
            <div>
              <span style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 8 }}>Psychology</span>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                <PsychTag label="Pre" value={t.preTrade} />
                <PsychTag label="Post" value={t.postTrade} />
                <PsychTag label="Stress" value={t.stressLevel} stressField />
                <PsychTag label="Sleep" value={t.sleepQuality} />
                <PsychTag label="Focus" value={t.focusLevel} />
                <PsychTag label="Energy" value={t.energyLevel} />
                {t.revengeTrade && <PsychTag label="Revenge" value={t.revengeTrade} />}
                {t.movedStopFear && <PsychTag label="Moved Stop Fear" value={t.movedStopFear} />}
              </div>
            </div>
          )}

          {hasContext && (
            <div>
              <span style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 8 }}>Market Context</span>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                <PsychTag label="Session" value={t.tradingSession} />
                <PsychTag label="HTF Bias" value={t.htfBias} />
                <PsychTag label="Structure" value={t.marketStructure} />
                <PsychTag label="Setup" value={t.setupType} />
                {t.confluences?.map(c => (
                  <span key={c} style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(91,155,213,0.12)', border: '1px solid rgba(91,155,213,0.3)', color: '#5B9BD5' }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {hasExec && (
            <div>
              <span style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 8 }}>Execution</span>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                <PsychTag label="Waited Confirmation" value={t.waitedConfirmation} />
                <PsychTag label="Entered at Level" value={t.enteredAtLevel} />
                <PsychTag label="Exit Decision" value={t.exitDecision} />
                <PsychTag label="Rushed Entry" value={t.rushedEntry} />
                <PsychTag label="Protected Stop" value={t.protectedStop} />
                <PsychTag label="Targeted Liquidity" value={t.targetedLiquidity} />
              </div>
            </div>
          )}

          {hasNotes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {t.mindsetNotes && <span style={{ color: '#777', fontSize: '0.75rem' }}>🧠 <em>{t.mindsetNotes}</em></span>}
              {t.wentWell    && <span style={{ color: '#4CAF7D', fontSize: '0.75rem' }}>✓ {t.wentWell}</span>}
              {t.toImprove   && <span style={{ color: '#3B82F6', fontSize: '0.75rem' }}>↑ {t.toImprove}</span>}
            </div>
          )}

        </div>
      </td>
    </tr>
  )
}

/* ── Sort helpers ── */
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
  return sortDir === 'asc' ? <ArrowUp size={12} color="#3B82F6" /> : <ArrowDown size={12} color="#3B82F6" />
}

/* ── Main page ── */
export default function TradeView() {
  const { trades } = useTradeStore()
  const navigate = useNavigate()
  const [sortCol, setSortCol] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [filterResult, setFilterResult] = useState('All')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = useMemo(() => {
    let t = [...trades]
    if (filterResult !== 'All') t = t.filter(x => x.result === filterResult)
    return t.sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'createdAt': va = new Date(a.createdAt); vb = new Date(b.createdAt); break
        case 'symbol':    va = a.symbol || ''; vb = b.symbol || ''; break
        case 'result':    va = a.result || ''; vb = b.result || ''; break
        case 'entryPrice': va = parseFloat(a.entryPrice) || 0; vb = parseFloat(b.entryPrice) || 0; break
        case 'exitPrice':  va = parseFloat(a.exitPrice)  || 0; vb = parseFloat(b.exitPrice)  || 0; break
        case 'netPnl':    va = parseFloat(a.netPnl) || 0; vb = parseFloat(b.netPnl) || 0; break
        case 'roi':
          va = a.entryPrice ? ((parseFloat(a.exitPrice) - parseFloat(a.entryPrice)) / parseFloat(a.entryPrice)) * 100 * (a.direction === 'Short' ? -1 : 1) : 0
          vb = b.entryPrice ? ((parseFloat(b.exitPrice) - parseFloat(b.entryPrice)) / parseFloat(b.entryPrice)) * 100 * (b.direction === 'Short' ? -1 : 1) : 0
          break
        default: va = 0; vb = 0
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [trades, sortCol, sortDir, filterResult])

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const thStyle = (col) => ({
    textAlign: 'left', padding: '10px 14px', color: sortCol === col ? '#3B82F6' : '#555',
    fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
    userSelect: 'none', letterSpacing: '0.03em',
  })

  if (!trades.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✝</div>
      <p style={{ color: '#A0A0A0', marginBottom: '20px' }}>No trades yet. Log your first trade to see your Trade View.</p>
      <button onClick={() => navigate('/app/log')} className="btn-gold" style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <PlusCircle size={15} /> Log Trade
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Trade View</h1>
        <button onClick={() => navigate('/app/log')} className="btn-gold" style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <PlusCircle size={15} /> Log Trade
        </button>
      </div>

      {/* Top KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <PnlCard trades={trades} />
        <PfCard trades={trades} />
        <WinCard trades={trades} />
        <AvgCard trades={trades} />
      </div>

      {/* Table section */}
      <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', overflow: 'hidden' }}>

        {/* Table toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ color: '#A0A0A0', fontSize: '0.82rem' }}>
            <span style={{ color: '#F5F5F5', fontWeight: 600 }}>{filtered.length}</span> trade{filtered.length !== 1 ? 's' : ''}
            {filterResult !== 'All' && <span style={{ color: '#666' }}> · filtered by {filterResult}</span>}
          </span>
          {/* Result filter */}
          <div style={{ display: 'flex', background: '#1A1A1A', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {['All', 'Win', 'Loss', 'Breakeven'].map(f => (
              <button key={f} onClick={() => setFilterResult(f)}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: '0.75rem',
                  cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                  background: filterResult === f
                    ? f === 'Win' ? '#4CAF7D' : f === 'Loss' ? '#E05252' : f === 'Breakeven' ? '#666' : '#3B82F6'
                    : 'transparent',
                  color: filterResult === f ? (f === 'All' ? '#1A1A1A' : '#fff') : '#555',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#1E1E1E', borderBottom: '1px solid #3A3A3A' }}>
                {[
                  { key: 'createdAt', label: 'Open Date' },
                  { key: 'symbol',    label: 'Symbol' },
                  { key: 'result',    label: 'Status' },
                  { key: 'createdAt', label: 'Close Date', noSort: true },
                  { key: 'entryPrice', label: 'Entry Price' },
                  { key: 'exitPrice',  label: 'Exit Price' },
                  { key: 'netPnl',    label: 'Net P&L' },
                  { key: 'roi',       label: 'Net ROI' },
                ].map(({ key, label, noSort }) => (
                  <th key={label}
                    onClick={() => !noSort && toggleSort(key)}
                    style={thStyle(noSort ? '' : key)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {label}
                      {!noSort && <SortIcon col={key} sortCol={sortCol} sortDir={sortDir} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const pnl = parseFloat(t.netPnl) || 0
                const entry = parseFloat(t.entryPrice) || 0
                const exit = parseFloat(t.exitPrice) || 0
                const roi = entry > 0
                  ? ((exit - entry) / entry) * 100 * (t.direction === 'Short' ? -1 : 1)
                  : 0
                const isEven = i % 2 === 0

                const isExpanded = expandedId === t.id
                return (
                  <>
                  <tr key={t.id}
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(58,58,58,0.4)', background: isExpanded ? 'rgba(59,130,246,0.06)' : isEven ? 'transparent' : 'rgba(255,255,255,0.012)', cursor: 'pointer' }}
                    onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(59,130,246,0.04)' }}
                    onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isEven ? 'transparent' : 'rgba(255,255,255,0.012)' }}
                  >
                    {/* Open Date */}
                    <td style={{ padding: '11px 14px', color: '#888', whiteSpace: 'nowrap' }}>
                      {format((() => { const dt = new Date(t.createdAt || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt })(), 'MM/dd/yyyy')}
                    </td>
                    {/* Symbol */}
                    <td style={{ padding: '11px 14px', color: '#F5F5F5', fontWeight: 700 }}>
                      {t.symbol}
                    </td>
                    {/* Status badge */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
                        background: t.result === 'Win' ? 'rgba(76,175,125,0.18)' : t.result === 'Loss' ? 'rgba(224,82,82,0.18)' : 'rgba(160,160,160,0.18)',
                        color:      t.result === 'Win' ? '#4CAF7D'             : t.result === 'Loss' ? '#E05252'             : '#A0A0A0',
                        border:     `1px solid ${t.result === 'Win' ? 'rgba(76,175,125,0.35)' : t.result === 'Loss' ? 'rgba(224,82,82,0.35)' : 'rgba(160,160,160,0.25)'}`,
                      }}>
                        {t.result?.toUpperCase()}
                      </span>
                    </td>
                    {/* Close Date (same day for day trades) */}
                    <td style={{ padding: '11px 14px', color: '#888', whiteSpace: 'nowrap' }}>
                      {format((() => { const dt = new Date(t.createdAt || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt })(), 'MM/dd/yyyy')}
                    </td>
                    {/* Entry */}
                    <td style={{ padding: '11px 14px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${entry.toFixed(2)}
                    </td>
                    {/* Exit */}
                    <td style={{ padding: '11px 14px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${exit.toFixed(2)}
                    </td>
                    {/* Net P&L */}
                    <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnl >= 0 ? '#4CAF7D' : '#E05252' }}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </td>
                    {/* Net ROI */}
                    <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: roi >= 0 ? '#4CAF7D' : '#E05252' }}>
                      {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                    </td>
                  </tr>
                  {isExpanded && <TradeDetailRow t={t} />}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
