import { useMemo, useState } from 'react'
import { useTradeStore } from '../../store/tradeStore'
import { avgTradeDuration, formatDuration } from '../../lib/tradeTime'
import { liveTrades, backtestTrades } from '../../lib/tradeFilters'
import BacktestReport from '../../components/app/BacktestReport'
import CustomQuestions from '../../components/app/CustomQuestions'
import { format } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Cell, ReferenceLine, RadialBarChart, RadialBar,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'

const _safeD = (d) => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }

/* ═══════════════════════════════════════════
   PSYCHOLOGY REPORT (moved from Day View)
═══════════════════════════════════════════ */
const EMOTIONS = ['Confident', 'Greedy', 'Fearful', 'Excited', 'FOMO']
const EMOTION_COLOR = {
  Confident:    { bg: 'rgba(76,175,125,0.15)',  border: 'rgba(76,175,125,0.4)',  text: '#4CAF7D', dot: '#4CAF7D' },
  Greedy:       { bg: 'rgba(224,82,82,0.15)',   border: 'rgba(224,82,82,0.4)',   text: '#E05252', dot: '#E05252' },
  Fearful:      { bg: 'rgba(160,100,220,0.15)', border: 'rgba(160,100,220,0.4)', text: '#B47FE0', dot: '#B47FE0' },
  Excited:      { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  text: '#3B82F6', dot: '#3B82F6' },
  FOMO:         { bg: 'rgba(255,140,0,0.15)',   border: 'rgba(255,140,0,0.4)',   text: '#FF8C00', dot: '#FF8C00' },
  Happy:        { bg: 'rgba(76,175,125,0.15)',  border: 'rgba(76,175,125,0.4)',  text: '#4CAF7D', dot: '#4CAF7D' },
  Sad:          { bg: 'rgba(91,155,213,0.15)',  border: 'rgba(91,155,213,0.4)',  text: '#5B9BD5', dot: '#5B9BD5' },
  Mad:          { bg: 'rgba(224,82,82,0.15)',   border: 'rgba(224,82,82,0.4)',   text: '#E05252', dot: '#E05252' },
  Disappointed: { bg: 'rgba(160,100,220,0.15)', border: 'rgba(160,100,220,0.4)', text: '#B47FE0', dot: '#B47FE0' },
  Neutral:      { bg: 'rgba(120,120,120,0.15)', border: 'rgba(120,120,120,0.4)', text: '#888888', dot: '#888888' },
}
const EMOTION_ICON = { Confident: '💪', Greedy: '🤑', Fearful: '😰', Excited: '🚀', FOMO: '⚡', Happy: '😊', Sad: '😢', Mad: '😡', Disappointed: '😞', Neutral: '😐' }

const POST_EMOTIONS = ['Happy', 'Sad', 'Mad', 'Disappointed', 'Neutral']

/* ── Psychology State Impact ─────────────────────────────────────── */
function PsychStateImpact({ trades }) {
  const ALL_FACTORS = [
    { field: 'sleepQuality', label: 'Sleep Quality',   icon: '😴', allValues: ['Excellent','Good','Fair','Poor'],              goodValues: ['Good','Excellent'], badValues: ['Poor','Fair'] },
    { field: 'energyLevel',  label: 'Energy Level',    icon: '⚡', allValues: ['High','Medium','Low'],                         goodValues: ['High'],             badValues: ['Low'] },
    { field: 'focusLevel',   label: 'Focus Level',     icon: '🧠', allValues: ['Locked In','Focused','Distracted','Scattered'],goodValues: ['Focused','Locked In'], badValues: ['Scattered','Distracted'] },
    { field: 'stressLevel',  label: 'Stress Level',    icon: '😤', allValues: ['Low','Medium','High'],                         goodValues: ['Low'],              badValues: ['High','Medium'] },
    { field: 'revengeTrade',  label: 'Revenge Trading',       icon: '⚠️', allValues: ['No','Yes'], goodValues: ['No'],  badValues: ['Yes'] },
    { field: 'movedStopFear', label: 'Moved Stop Due to Fear', icon: '😨', allValues: ['No','Yes'], goodValues: ['No'],  badValues: ['Yes'] },
  ]

  const factors = useMemo(() => ALL_FACTORS.map(({ field, label, icon, allValues, goodValues, badValues }) => {
    const groups = {}
    trades.forEach(t => {
      const val = t[field]
      if (!val) return
      if (!groups[val]) groups[val] = { wins: 0, count: 0, pnl: 0 }
      groups[val].count++
      groups[val].pnl += parseFloat(t.netPnl) || 0
      if (t.result === 'Win') groups[val].wins++
    })
    // Always include all known values so rows appear even with no data yet
    const entries = allValues.map(val => {
      const d = groups[val] || { wins: 0, count: 0, pnl: 0 }
      return {
        val, count: d.count, pnl: d.pnl,
        winRate: d.count ? Math.round(d.wins / d.count * 100) : 0,
        isGood: goodValues.includes(val),
        isBad:  badValues.includes(val),
        hasData: d.count > 0,
      }
    })
    const total     = entries.reduce((s, e) => s + e.pnl, 0)
    const hasTrades = entries.some(e => e.hasData)
    return { field, label, icon, entries, total, hasTrades }
  }), [trades])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#3B82F6', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mental State Impact on P&L</span>
        <div style={{ flex: 1, height: 1, background: '#2A2A2A' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {factors.map(f => (
          <div key={f.field} style={{ background: '#1E1E1E', borderRadius: 10, border: '1px solid #2A2A2A', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #252525', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.95rem' }}>{f.icon}</span>
              <span style={{ color: '#E0E0E0', fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>{f.label}</span>
              {f.hasTrades && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.82rem', color: f.total >= 0 ? '#4CAF7D' : '#E05252' }}>
                  {f.total >= 0 ? '+' : ''}${f.total.toFixed(2)}
                </span>
              )}
            </div>
            <div>
              {f.entries.map((e, i, arr) => (
                <div key={e.val} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: i < arr.length - 1 ? '1px solid #252525' : 'none', opacity: e.hasData ? 1 : 0.4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: e.isGood ? '#4CAF7D' : e.isBad ? '#E05252' : '#3B82F6' }} />
                  <span style={{ color: '#A0A0A0', fontSize: '0.78rem', flex: 1 }}>{e.val}</span>
                  <span style={{ color: '#9A9A9A', fontSize: '0.7rem', minWidth: 28 }}>{e.hasData ? `${e.count}T` : '—'}</span>
                  <span style={{ color: '#9A9A9A', fontSize: '0.7rem', minWidth: 38, textAlign: 'right' }}>{e.hasData ? `${e.winRate}%W` : '—'}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.78rem', minWidth: 60, textAlign: 'right', color: e.hasData ? (e.pnl >= 0 ? '#4CAF7D' : '#E05252') : '#444' }}>
                    {e.hasData ? `${e.pnl >= 0 ? '+' : ''}$${e.pnl.toFixed(2)}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Reusable emotion section (pre or post trade) ─────────────────── */
function EmotionSection({ trades, field, title, emotions = EMOTIONS }) {
  const stats = useMemo(() => {
    const map = {}
    emotions.forEach(e => { map[e] = { trades: 0, wins: 0, losses: 0, breakeven: 0, netPnl: 0 } })
    trades.forEach(t => {
      const emotion = t[field]
      if (!emotion || !map[emotion]) return
      const pnl = parseFloat(t.netPnl) || 0
      map[emotion].trades++
      map[emotion].netPnl += pnl
      if (t.result === 'Win') map[emotion].wins++
      else if (t.result === 'Loss') map[emotion].losses++
      else map[emotion].breakeven++
    })
    return map
  }, [trades, field, emotions])

  const tagged        = trades.filter(t => t[field] && emotions.includes(t[field])).length
  const untagged      = trades.length - tagged
  const totalPnl      = emotions.reduce((s, e) => s + stats[e].netPnl, 0)
  const activeEmotions= emotions.filter(e => stats[e].trades > 0)
  const barData       = emotions.map(e => ({ name: e, pnl: parseFloat(stats[e].netPnl.toFixed(2)), trades: stats[e].trades })).filter(d => d.trades > 0)
  const mostTraded    = emotions.reduce((a, b) => stats[a].trades >= stats[b].trades ? a : b)
  const bestEmotion   = activeEmotions.length ? activeEmotions.reduce((a, b) => stats[a].netPnl >= stats[b].netPnl ? a : b) : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#3B82F6', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: '#2A2A2A' }} />
      </div>

      {/* Summary row */}
      {tagged > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Trades Tagged',  value: tagged,      sub: `${untagged} untagged`,  color: '#3B82F6' },
              { label: 'Tagged P&L',     value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, sub: 'from tagged trades', color: totalPnl >= 0 ? '#4CAF7D' : '#E05252' },
              { label: 'Most Common',    value: stats[mostTraded].trades > 0 ? mostTraded : '—', sub: `${Math.max(...emotions.map(e => stats[e].trades))} trades`, color: '#3B82F6' },
              { label: 'Best Emotion',   value: bestEmotion, sub: activeEmotions.length ? `$${Math.max(...emotions.map(e => stats[e].netPnl)).toFixed(0)}` : '', color: '#4CAF7D' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: '#1E1E1E', borderRadius: '10px', border: '1px solid #2A2A2A', borderLeft: `3px solid ${color}`, padding: '14px 16px' }}>
                <div style={{ color: '#9A9A9A', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.1rem', color }}>{value}</div>
                <div style={{ color: '#8A8A8A', fontSize: '0.68rem', marginTop: '3px' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          {barData.length > 0 && (
            <div style={{ background: '#1E1E1E', borderRadius: '10px', border: '1px solid #2A2A2A', padding: '16px' }}>
              <div style={{ color: '#A0A0A0', fontSize: '0.78rem', fontWeight: 600, marginBottom: '12px' }}>P&L by Emotion</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={barData} barCategoryGap="35%">
                  <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8A8A8A', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.78rem' }} formatter={v => [`${v >= 0 ? '+' : ''}$${v}`, 'Net P&L']} />
                  <Bar dataKey="pnl" radius={[5, 5, 0, 0]}>
                    {barData.map(entry => <Cell key={entry.name} fill={EMOTION_COLOR[entry.name]?.dot || '#3B82F6'} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Emotion cards — always show all 5, dim when no data */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {emotions.map(emotion => {
              const s = stats[emotion]
              const ec = EMOTION_COLOR[emotion]
              const hasData = s.trades > 0
              const winRate = s.trades ? ((s.wins / s.trades) * 100).toFixed(0) : 0
              const avgPnl  = s.trades ? s.netPnl / s.trades : 0
              return (
                <div key={emotion} style={{ background: '#1E1E1E', borderRadius: '10px', border: `1px solid ${hasData ? ec.border : '#252525'}`, overflow: 'hidden', opacity: hasData ? 1 : 0.45 }}>
                  <div style={{ padding: '12px 16px', background: hasData ? ec.bg : 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{EMOTION_ICON[emotion]}</span>
                      <span style={{ color: hasData ? ec.text : '#444', fontWeight: 700, fontSize: '0.88rem' }}>{emotion}</span>
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '0.9rem', color: hasData ? (s.netPnl >= 0 ? '#4CAF7D' : '#E05252') : '#333' }}>
                      {hasData ? `${s.netPnl >= 0 ? '+' : ''}$${s.netPnl.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      ['Trades',   hasData ? s.trades                                           : '—', '#A0A0A0'],
                      ['Win Rate', hasData ? `${winRate}%`                                      : '—', parseFloat(winRate) >= 50 ? '#3B82F6' : '#A0A0A0'],
                      ['Avg P&L',  hasData ? `${avgPnl >= 0 ? '+' : ''}$${avgPnl.toFixed(2)}` : '—', avgPnl >= 0 ? '#4CAF7D' : '#E05252'],
                      ['W / L',    hasData ? `${s.wins} / ${s.losses}`                         : '—', '#A0A0A0'],
                    ].map(([label, val, color], i, arr) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < arr.length - 1 ? '8px' : 0, borderBottom: i < arr.length - 1 ? '1px solid #252525' : 'none' }}>
                        <span style={{ color: '#9A9A9A', fontSize: '0.73rem' }}>{label}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.8rem', color }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div style={{ background: '#1A1A1A', borderRadius: '10px', border: '1px solid #2A2A2A', padding: '16px 20px' }}>
          <span style={{ color: '#8A8A8A', fontSize: '0.8rem' }}>No {title.toLowerCase()} data yet — tag emotions when logging trades.</span>
        </div>
      )}
    </div>
  )
}

function PsychologyReport({ trades }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Mental State Impact ── */}
      <PsychStateImpact trades={trades} />

      {/* ── Pre-Trade Emotion ── */}
      <EmotionSection trades={trades} field="preTrade"  title="Pre-Trade Emotion" />

      {/* ── Post-Trade Emotion ── */}
      <EmotionSection trades={trades} field="postTrade" title="Post-Trade Emotion" emotions={POST_EMOTIONS} />

    </div>
  )
}

/* ═══════════════════════════════════════════
   PERFORMANCE TAB
═══════════════════════════════════════════ */
function NetPnlChart({ trades }) {
  const data = useMemo(() => {
    let cum = 0
    return [...trades].reverse().map(t => {
      cum += parseFloat(t.netPnl) || 0
      return { date: format(_safeD(t.createdAt), 'MM/dd'), value: parseFloat(cum.toFixed(2)) }
    })
  }, [trades])

  const last = data[data.length - 1]?.value ?? 0
  const color = last >= 0 ? '#4CAF7D' : '#E05252'

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '20px', flex: 1 }}>
      <div style={{ color: '#A0A0A0', fontSize: '0.78rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Net P&L — Cumulative
        <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>{trades.length} trades</span>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.4rem', color, marginBottom: '12px' }}>
        {last >= 0 ? '+' : ''}${last.toFixed(2)}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="perfCumGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: '#8A8A8A', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#8A8A8A', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 0 ? '' : '-'}${Math.abs(v)}`} width={60} />
          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.8rem' }} formatter={v => [`${v >= 0 ? '+' : ''}$${v}`, 'Net P&L']} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="value" stroke={color} fill="url(#perfCumGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function DailyPnlChart({ trades }) {
  const data = useMemo(() => {
    const dayMap = {}
    trades.forEach(t => {
      const key = format(_safeD(t.createdAt), 'yyyy-MM-dd')
      if (!dayMap[key]) dayMap[key] = 0
      dayMap[key] += parseFloat(t.netPnl) || 0
    })
    return Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b))
      .map(([d, pnl]) => ({ date: format(new Date(d), 'MM/dd'), pnl: parseFloat(pnl.toFixed(2)) }))
  }, [trades])

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '20px', flex: 1 }}>
      <div style={{ color: '#A0A0A0', fontSize: '0.78rem', marginBottom: '4px' }}>Daily Net P&L</div>
      <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: '12px' }}>{data.length} trading day{data.length !== 1 ? 's' : ''}</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="25%">
          <XAxis dataKey="date" tick={{ fill: '#8A8A8A', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#8A8A8A', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={60} />
          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.8rem' }} formatter={v => [`${v >= 0 ? '+' : ''}$${v}`, 'Daily P&L']} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#4CAF7D' : '#E05252'} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SummaryTab({ trades }) {
  const s = useMemo(() => {
    const wins   = trades.filter(t => t.result === 'Win')
    const losses = trades.filter(t => t.result === 'Loss')
    const total  = trades.reduce((acc, t) => acc + (parseFloat(t.netPnl) || 0), 0)
    const sumW   = wins.reduce((acc, t) => acc + (parseFloat(t.netPnl) || 0), 0)
    const sumL   = Math.abs(losses.reduce((acc, t) => acc + (parseFloat(t.netPnl) || 0), 0))
    const avgWin = wins.length   ? sumW / wins.length   : 0
    const avgLoss= losses.length ? sumL / losses.length : 0
    const pf     = sumL > 0 ? sumW / sumL : wins.length ? Infinity : 0
    const winRateDec = trades.length ? wins.length / trades.length : 0
    const lossRateDec= trades.length ? losses.length / trades.length : 0
    const expectancy = (winRateDec * avgWin) - (lossRateDec * avgLoss)
    const avgWinLoss = avgLoss > 0 ? avgWin / avgLoss : 0

    const dayMap = {}
    trades.forEach(t => {
      const k = format(_safeD(t.createdAt), 'yyyy-MM-dd')
      if (!dayMap[k]) dayMap[k] = { pnl: 0, count: 0 }
      dayMap[k].pnl   += parseFloat(t.netPnl) || 0
      dayMap[k].count += 1
    })
    const days      = Object.values(dayMap)
    const winDays   = days.filter(d => d.pnl > 0)
    const lossDays  = days.filter(d => d.pnl < 0)
    const dayWinR   = days.length ? (winDays.length / days.length * 100).toFixed(2) : '0.00'
    const avgDayPnl = days.length ? total / days.length : 0
    const avgDailyVol = days.length ? trades.length / days.length : 0
    const maxDDDay  = days.length ? Math.min(...days.map(d => d.pnl)) : 0
    const avgDDDay  = lossDays.length ? lossDays.reduce((a, d) => a + d.pnl, 0) / lossDays.length : 0
    const avgWinDayPnl  = winDays.length  ? winDays.reduce((a, d)  => a + d.pnl, 0) / winDays.length  : 0
    const avgLossDayPnl = lossDays.length ? Math.abs(lossDays.reduce((a, d) => a + d.pnl, 0)) / lossDays.length : 0
    const avgDailyWL = avgLossDayPnl > 0 ? (avgWinDayPnl / avgLossDayPnl).toFixed(2) : '—'

    const rrTrades = trades.filter(t => t.stopLoss && t.entryPrice && t.exitPrice)
    let avgR = 0
    if (rrTrades.length) {
      const rVals = rrTrades.map(t => {
        const e = parseFloat(t.entryPrice), x = parseFloat(t.exitPrice), sl = parseFloat(t.stopLoss)
        const risk   = Math.abs(e - sl)
        const reward = t.direction === 'Long' ? x - e : e - x
        return risk > 0 ? reward / risk : 0
      })
      avgR = rVals.reduce((a, r) => a + r, 0) / rVals.length
    }

    return {
      total, winRate: (winRateDec * 100).toFixed(2),
      dayWinR, winDays: winDays.length, lossDays: lossDays.length,
      pf, avgWinLoss, expectancy,
      avgNetTrade: trades.length ? total / trades.length : 0,
      avgDayPnl, avgDailyVol,
      loggedDays: days.length, maxDDDay, avgDDDay, avgDailyWL,
      avgR, wins: wins.length, losses: losses.length,
      holdTime: avgTradeDuration(trades),
    }
  }, [trades])

  const items = [
    { label: 'Net P&L',              value: `${s.total >= 0 ? '+' : ''}$${s.total.toFixed(2)}`,        color: s.total >= 0 ? '#4CAF7D' : '#E05252' },
    { label: 'Win %',                value: `${s.winRate}%`,                                            color: parseFloat(s.winRate) >= 50 ? '#3B82F6' : '#E05252' },
    { label: 'Avg Daily Win %',      value: `${s.dayWinR}% (${s.winDays}/0/${s.lossDays})`,            color: parseFloat(s.dayWinR) >= 50 ? '#3B82F6' : '#E05252' },
    { label: 'Profit Factor',        value: isFinite(s.pf) ? s.pf.toFixed(2) : '∞',                   color: s.pf >= 2 ? '#4CAF7D' : s.pf >= 1 ? '#3B82F6' : '#E05252' },
    { label: 'Trade Expectancy',     value: `${s.expectancy >= 0 ? '+' : ''}$${s.expectancy.toFixed(2)}`, color: s.expectancy >= 0 ? '#4CAF7D' : '#E05252' },
    { label: 'Avg Daily Win/Loss',   value: s.avgDailyWL,                                              color: parseFloat(s.avgDailyWL) >= 1 ? '#4CAF7D' : '#E05252' },
    { label: 'Avg Trade Win/Loss',   value: s.avgWinLoss.toFixed(2),                                   color: s.avgWinLoss >= 1 ? '#4CAF7D' : '#E05252' },
    { label: 'Avg Hold Time',        value: s.holdTime.ms != null ? formatDuration(s.holdTime.ms) : '—', color: s.holdTime.ms != null ? '#F5F5F5' : '#555' },
    { label: 'Avg Net Trade P&L',    value: `${s.avgNetTrade >= 0 ? '+' : ''}$${s.avgNetTrade.toFixed(2)}`, color: s.avgNetTrade >= 0 ? '#4CAF7D' : '#E05252' },
    { label: 'Avg Daily Net P&L',    value: `${s.avgDayPnl >= 0 ? '+' : ''}$${s.avgDayPnl.toFixed(2)}`,   color: s.avgDayPnl >= 0 ? '#4CAF7D' : '#E05252' },
    { label: 'Avg Planned R',        value: '—',                                                        color: '#9A9A9A' },
    { label: 'Avg Realized R',       value: s.avgR !== 0 ? `${s.avgR.toFixed(2)}R` : '—',             color: s.avgR >= 1 ? '#4CAF7D' : s.avgR > 0 ? '#3B82F6' : '#555' },
    { label: 'Avg Daily Volume',     value: s.avgDailyVol.toFixed(1),                                  color: '#F5F5F5' },
    { label: 'Logged Days',          value: s.loggedDays,                                              color: '#F5F5F5' },
    { label: 'Max Daily Drawdown',   value: `$${s.maxDDDay.toFixed(2)}`,                               color: '#E05252' },
    { label: 'Avg Daily Drawdown',   value: `$${s.avgDDDay.toFixed(2)}`,                               color: '#E05252' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {items.map(({ label, value, color }, i) => (
        <div key={label} style={{
          padding: '20px 24px',
          borderRight:  (i + 1) % 4 !== 0 ? '1px solid #3A3A3A' : 'none',
          borderBottom: i < 12            ? '1px solid #3A3A3A' : 'none',
        }}>
          <div style={{ color: '#9A9A9A', fontSize: '0.72rem', marginBottom: '6px', letterSpacing: '0.02em' }}>{label}</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.1rem', color }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function DaysTab({ trades }) {
  const days = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      const k = format(_safeD(t.createdAt), 'yyyy-MM-dd')
      if (!map[k]) map[k] = { date: k, trades: [], pnl: 0, wins: 0, losses: 0, gross: 0, commissions: 0 }
      map[k].trades.push(t)
      map[k].pnl         += parseFloat(t.netPnl)    || 0
      map[k].gross       += parseFloat(t.grossPnl)  || 0
      map[k].commissions += parseFloat(t.commission)|| 0
      if (t.result === 'Win')  map[k].wins++
      if (t.result === 'Loss') map[k].losses++
    })
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
  }, [trades])

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ background: '#1E1E1E', borderBottom: '1px solid #3A3A3A' }}>
            {['Date','Trades','Winners','Losers','Win Rate','Gross P&L','Commissions','Net P&L'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#9A9A9A', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => {
            const wr = d.trades.length ? ((d.wins / d.trades.length) * 100).toFixed(0) : 0
            const even = i % 2 === 0
            return (
              <tr key={d.date}
                style={{ borderBottom: '1px solid rgba(58,58,58,0.4)', background: even ? 'transparent' : 'rgba(255,255,255,0.012)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = even ? 'transparent' : 'rgba(255,255,255,0.012)'}
              >
                <td style={{ padding: '11px 16px', color: '#A0A0A0', whiteSpace: 'nowrap' }}>{format(new Date(d.date), 'EEE, MMM d, yyyy')}</td>
                <td style={{ padding: '11px 16px', color: '#F5F5F5', fontFamily: 'JetBrains Mono, monospace' }}>{d.trades.length}</td>
                <td style={{ padding: '11px 16px', color: '#4CAF7D', fontFamily: 'JetBrains Mono, monospace' }}>{d.wins}</td>
                <td style={{ padding: '11px 16px', color: '#E05252', fontFamily: 'JetBrains Mono, monospace' }}>{d.losses}</td>
                <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', color: parseFloat(wr) >= 50 ? '#3B82F6' : '#A0A0A0' }}>{wr}%</td>
                <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', color: d.gross >= 0 ? '#4CAF7D' : '#E05252' }}>{d.gross >= 0 ? '+' : ''}${d.gross.toFixed(2)}</td>
                <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', color: '#E05252' }}>-${d.commissions.toFixed(2)}</td>
                <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: d.pnl >= 0 ? '#4CAF7D' : '#E05252' }}>{d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TradesTab({ trades }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ background: '#1E1E1E', borderBottom: '1px solid #3A3A3A' }}>
            {['Date','Symbol','Side','Status','Entry','Exit','Contracts','Net P&L'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#9A9A9A', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const pnl = parseFloat(t.netPnl) || 0
            const even = i % 2 === 0
            return (
              <tr key={t.id}
                style={{ borderBottom: '1px solid rgba(58,58,58,0.4)', background: even ? 'transparent' : 'rgba(255,255,255,0.012)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = even ? 'transparent' : 'rgba(255,255,255,0.012)'}
              >
                <td style={{ padding: '10px 16px', color: '#888', whiteSpace: 'nowrap' }}>{format(_safeD(t.createdAt), 'MM/dd/yyyy')}</td>
                <td style={{ padding: '10px 16px', color: '#F5F5F5', fontWeight: 600 }}>{t.symbol}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: t.direction === 'Long' ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.15)', color: t.direction === 'Long' ? '#4CAF7D' : '#E05252', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>{t.direction}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: t.result === 'Win' ? 'rgba(76,175,125,0.15)' : t.result === 'Loss' ? 'rgba(224,82,82,0.15)' : 'rgba(160,160,160,0.15)', color: t.result === 'Win' ? '#4CAF7D' : t.result === 'Loss' ? '#E05252' : '#A0A0A0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>{t.result}</span>
                </td>
                <td style={{ padding: '10px 16px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>${parseFloat(t.entryPrice || 0).toFixed(2)}</td>
                <td style={{ padding: '10px 16px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>${parseFloat(t.exitPrice  || 0).toFixed(2)}</td>
                <td style={{ padding: '10px 16px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>{t.positionSize || '—'}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnl >= 0 ? '#4CAF7D' : '#E05252' }}>{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PerformanceView({ trades }) {
  const [subTab, setSubTab] = useState('summary')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <NetPnlChart  trades={trades} />
        <DailyPnlChart trades={trades} />
      </div>

      {/* Summary / Days / Trades sub-tabs */}
      <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderBottom: '1px solid #3A3A3A', padding: '0 4px' }}>
          {[['summary','Summary'], ['days','Days'], ['trades','Trades']].map(([key, label]) => (
            <button key={key} onClick={() => setSubTab(key)}
              style={{
                padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: subTab === key ? 700 : 400,
                color: subTab === key ? '#3B82F6' : '#555',
                borderBottom: subTab === key ? '2px solid #3B82F6' : '2px solid transparent',
                marginBottom: '-1px', transition: 'color 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>
        {subTab === 'summary' && <SummaryTab  trades={trades} />}
        {subTab === 'days'    && <DaysTab     trades={trades} />}
        {subTab === 'trades'  && <TradesTab   trades={trades} />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   EXECUTION QUALITY TAB
═══════════════════════════════════════════ */
/* One rule, as a single scannable row. Rows beat cards here: the whole point
   is comparing rules against each other, and a column of aligned bars can be
   read top-to-bottom in one pass. */
function RuleRow({ label, rate, goodCount, badCount, badPnl, goodLabel, badLabel }) {
  const total = goodCount + badCount
  const cost  = badPnl < 0 ? badPnl : 0
  const tone  = rate >= 70 ? '#4CAF7D' : rate >= 50 ? '#E8A33D' : '#E05252'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid #232323' }}>
      <div style={{ width: 148, flexShrink: 0, minWidth: 0 }}>
        <div style={{ color: '#E4E4E4', fontSize: '0.85rem', fontWeight: 600 }}>{label}</div>
        <div style={{ color: '#8A8A8A', fontSize: '0.71rem', marginTop: 2 }}>
          {goodCount} {goodLabel} · {badCount} {badLabel}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 60, height: 8, background: '#242424', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${rate}%`, height: '100%', background: tone, borderRadius: 4, transition: 'width .3s' }} />
      </div>

      <div style={{ width: 46, textAlign: 'right', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.86rem', color: tone }}>
        {rate.toFixed(0)}%
      </div>

      {/* What breaking this rule actually cost — the number that changes behaviour */}
      <div style={{ width: 96, textAlign: 'right', flexShrink: 0 }}>
        {cost < 0 ? (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.83rem', color: '#E05252' }}>
            -${Math.abs(cost).toFixed(0)}
          </span>
        ) : (
          <span style={{ color: '#5E5E5E', fontSize: '0.75rem' }}>{total ? 'no loss' : '—'}</span>
        )}
      </div>
    </div>
  )
}

function ScoreRing({ score }) {
  const color = score >= 80 ? '#4CAF7D' : score >= 60 ? '#3B82F6' : '#E05252'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r="56" fill="none" stroke="#2A2A2A" strokeWidth="12" />
          <circle cx="70" cy="70" r="56" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${(score / 100) * 351.9} 351.9`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 6px ${color}55)` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: '1.8rem', color, lineHeight: 1 }}>{score}</span>
          <span style={{ color: '#8A8A8A', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>/ 100</span>
        </div>
      </div>
      <span style={{ color, fontWeight: 700, fontSize: '0.88rem' }}>{label}</span>
    </div>
  )
}

function QualityPillar({ label, icon, color, avg, tradesWithData, dist, highPnl, lowPnl }) {
  // dist: { low: count (1-4), mid: count (5-7), high: count (8-10) }
  const total = dist.low + dist.mid + dist.high || 1
  const impact = highPnl - lowPnl
  const pct = (avg / 10) * 100

  return (
    <div style={{ background: '#242424', borderRadius: '12px', border: `1px solid ${color}22`, overflow: 'hidden', flex: 1 }}>
      <div style={{ padding: '16px 20px', background: `${color}10`, borderBottom: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.3rem' }}>{icon}</span>
          <span style={{ color, fontWeight: 700, fontSize: '0.92rem', fontFamily: 'Poppins, sans-serif' }}>{label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.4rem', color, lineHeight: 1 }}>
            {avg > 0 ? avg.toFixed(1) : '—'}<span style={{ fontSize: '0.7rem', color: '#8A8A8A', fontWeight: 400 }}>/10</span>
          </div>
          <div style={{ color: '#8A8A8A', fontSize: '0.65rem', marginTop: '2px' }}>avg score</div>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ padding: '14px 20px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ height: 6, background: '#1A1A1A', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#9A9A9A' }}>
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>

      {/* Distribution */}
      <div style={{ padding: '4px 20px 10px', display: 'flex', gap: '6px' }}>
        {[['Low (1-4)', dist.low, '#E05252'], ['Mid (5-7)', dist.mid, '#3B82F6'], ['High (8-10)', dist.high, '#4CAF7D']].map(([lbl, count, c]) => (
          <div key={lbl} style={{ flex: 1, background: '#1A1A1A', borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1rem', color: c }}>{count}</div>
            <div style={{ color: '#8A8A8A', fontSize: '0.62rem', marginTop: '2px' }}>{lbl}</div>
            <div style={{ color: '#333', fontSize: '0.6rem' }}>{total > 0 ? ((count / total) * 100).toFixed(0) : 0}%</div>
          </div>
        ))}
      </div>

      {/* P&L correlation */}
      {tradesWithData > 0 && (
        <div style={{ padding: '4px 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2A2A2A', paddingTop: '10px' }}>
            <span style={{ color: '#9A9A9A', fontSize: '0.73rem' }}>P&L on high quality (8-10)</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.9rem', color: highPnl >= 0 ? '#4CAF7D' : '#E05252' }}>{highPnl >= 0 ? '+' : ''}${highPnl.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2A2A2A', paddingBottom: '10px' }}>
            <span style={{ color: '#9A9A9A', fontSize: '0.73rem' }}>P&L on low quality (1-4)</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.9rem', color: lowPnl >= 0 ? '#4CAF7D' : '#E05252' }}>{lowPnl >= 0 ? '+' : ''}${lowPnl.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: '0.75rem', fontWeight: 600 }}>Impact</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '0.95rem', color: impact >= 0 ? '#4CAF7D' : '#E05252' }}>
              {impact >= 0 ? '+' : ''}${impact.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* Section divider inside the execution report. Defined at module scope —
   declaring it inside the component remounts it on every render. */
function SecHead({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
      <span style={{ color: '#3B82F6', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#2A2A2A' }} />
    </div>
  )
}

function ExecutionQualityReport({ trades }) {
  const stats = useMemo(() => {
    const seg = (field, goodVal) => {
      const good = trades.filter(t => (t[field] || '').toLowerCase() === goodVal.toLowerCase())
      const bad  = trades.filter(t => t[field] && (t[field] || '').toLowerCase() !== goodVal.toLowerCase())
      const pnl  = (arr) => arr.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
      const wr   = (arr) => arr.length ? arr.filter(t => t.result === 'Win').length / arr.length * 100 : 0
      return {
        goodCount: good.length, badCount: bad.length,
        goodPnl: pnl(good), badPnl: pnl(bad),
        goodWr: wr(good), badWr: wr(bad),
        rate: (good.length + bad.length) > 0 ? (good.length / (good.length + bad.length)) * 100 : 0,
        goodTrades: good, badTrades: bad,
      }
    }
    const plan     = seg('followedPlan',      'yes')
    const stop     = seg('movedStop',         'no')   // "No" = disciplined
    const size     = seg('overRisked',         'no')  // "No" = didn't over-risk = good
    const waited   = seg('waitedConfirmation','yes')
    const level    = seg('enteredAtLevel',    'yes')
    const rushed   = seg('rushedEntry',       'no')   // "No" = not rushed = good
    const exitTime = { ...seg('exitDecision', 'on plan'), label: 'On Plan' }
    const liquidity = seg('targetedLiquidity', 'yes')
    const pStop     = seg('protectedStop',     'yes')

    const untagged = trades.filter(t => !t.followedPlan && !t.movedStop && !t.overRisked).length

    // Composite score (weighted): plan 40%, stop 35%, size 25%
    const taggedTrades = trades.filter(t => t.followedPlan || t.movedStop || t.overRisked)
    const score = taggedTrades.length
      ? Math.round(plan.rate * 0.4 + stop.rate * 0.35 + size.rate * 0.25)
      : 0

    // Chart data for side-by-side comparison
    const chartData = [
      { name: 'Plan',  followed: plan.goodPnl, notFollowed: Math.abs(plan.badPnl || 0) * (plan.badPnl < 0 ? -1 : 1) },
      { name: 'Stop',  followed: stop.goodPnl, notFollowed: Math.abs(stop.badPnl || 0) * (stop.badPnl < 0 ? -1 : 1) },
      { name: 'Size',  followed: size.goodPnl, notFollowed: Math.abs(size.badPnl || 0) * (size.badPnl < 0 ? -1 : 1) },
    ]

    // Breakdown: trades with ANY execution issue
    const flawed = trades.filter(t =>
      (t.followedPlan && t.followedPlan.toLowerCase() === 'no') ||
      (t.movedStop && t.movedStop.toLowerCase() === 'yes') ||
      (t.overRisked && t.overRisked.toLowerCase() === 'yes')
    )

    // ── Entry / Exit quality slider stats ──────────────────────────────
    const qualStat = (field) => {
      const tagged = trades.filter(t => t[field] != null && t[field] !== '')
      if (!tagged.length) return { avg: 0, tradesWithData: 0, dist: { low: 0, mid: 0, high: 0 }, highPnl: 0, lowPnl: 0 }
      const avg = tagged.reduce((s, t) => s + (Number(t[field]) || 0), 0) / tagged.length
      const dist = { low: 0, mid: 0, high: 0 }
      let highPnl = 0, lowPnl = 0
      tagged.forEach(t => {
        const q = Number(t[field]) || 0
        const p = parseFloat(t.netPnl) || 0
        if (q <= 4) { dist.low++;  lowPnl  += p }
        else if (q <= 7) { dist.mid++ }
        else { dist.high++; highPnl += p }
      })
      return { avg, tradesWithData: tagged.length, dist, highPnl, lowPnl }
    }
    const entryQ = qualStat('entryQuality')
    const exitQ  = qualStat('exitQuality')

    /* Every rule in one list, weakest first — so the rule costing the most
       money is the first thing read, not buried in the third card grid. */
    const allRules = [
      { label: 'Plan Adherence',      data: plan,      goodLabel: 'followed',  badLabel: 'broke' },
      { label: 'Stop Discipline',     data: stop,      goodLabel: 'held',      badLabel: 'moved' },
      { label: 'Risk Discipline',     data: size,      goodLabel: 'sized ok',  badLabel: 'over-risked' },
      { label: 'Waited Confirmation', data: waited,    goodLabel: 'waited',    badLabel: 'jumped in' },
      { label: 'Entered at Level',    data: level,     goodLabel: 'at level',  badLabel: 'missed' },
      { label: 'Entry Patience',      data: rushed,    goodLabel: 'patient',   badLabel: 'rushed' },
      { label: 'Protected Stop',      data: pStop,     goodLabel: 'protected', badLabel: 'unprotected' },
      { label: 'Exit Timing',         data: exitTime,  goodLabel: 'on plan',   badLabel: 'off plan' },
      { label: 'Targeted Liquidity',  data: liquidity, goodLabel: 'targeted',  badLabel: 'skipped' },
    ]
      .filter(r => r.data.goodCount + r.data.badCount > 0)
      .map(r => ({ label: r.label, goodLabel: r.goodLabel, badLabel: r.badLabel, ...r.data }))
      .sort((a, b) => a.rate - b.rate)

    return { plan, stop, size, waited, level, rushed, exitTime, liquidity, pStop, score, chartData, untagged, taggedTrades, flawed, entryQ, exitQ, allRules }
  }, [trades])

  const { plan, stop, size, score, chartData, untagged, taggedTrades, flawed, entryQ, exitQ, allRules } = stats

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Overview ── */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ background: '#242424', borderRadius: '14px', border: '1px solid #3A3A3A', padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minWidth: '170px' }}>
          <div style={{ color: '#9A9A9A', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Execution Score</div>
          <ScoreRing score={score} />
          <div style={{ color: '#8A8A8A', fontSize: '0.68rem', textAlign: 'center' }}>{taggedTrades.length} tagged trade{taggedTrades.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', minWidth: '260px' }}>
          {[
            { label: 'Plan Adherence',   value: `${plan.rate.toFixed(0)}%`,   sub: `${plan.goodCount} followed · ${plan.badCount} broke`,   color: plan.rate  >= 70 ? '#4CAF7D' : plan.rate  >= 50 ? '#3B82F6' : '#E05252' },
            { label: 'Stop Discipline',  value: `${stop.rate.toFixed(0)}%`,   sub: `${stop.goodCount} held · ${stop.badCount} moved`,        color: stop.rate  >= 70 ? '#4CAF7D' : stop.rate  >= 50 ? '#3B82F6' : '#E05252' },
            { label: 'Risk Discipline',  value: `${size.rate.toFixed(0)}%`,   sub: `${size.goodCount} no over-risk · ${size.badCount} over-risked`, color: size.rate >= 70 ? '#4CAF7D' : size.rate >= 50 ? '#3B82F6' : '#E05252' },
            { label: 'Avg Entry Quality',value: entryQ.tradesWithData ? `${entryQ.avg.toFixed(1)}/10` : '—', sub: `${entryQ.tradesWithData} rated`, color: entryQ.avg >= 7 ? '#4CAF7D' : entryQ.avg >= 5 ? '#3B82F6' : entryQ.tradesWithData ? '#E05252' : '#444' },
            { label: 'Avg Exit Quality', value: exitQ.tradesWithData  ? `${exitQ.avg.toFixed(1)}/10`  : '—', sub: `${exitQ.tradesWithData} rated`,  color: exitQ.avg  >= 7 ? '#4CAF7D' : exitQ.avg  >= 5 ? '#3B82F6' : exitQ.tradesWithData  ? '#E05252' : '#444' },
            { label: 'Execution Issues', value: flawed.length,                sub: flawed.length ? `${((flawed.length/trades.length)*100).toFixed(0)}% of trades` : 'none detected', color: flawed.length === 0 ? '#4CAF7D' : flawed.length < 5 ? '#3B82F6' : '#E05252' },
            (() => { const h = avgTradeDuration(trades); return { label: 'Avg Time in Trade', value: h.ms != null ? formatDuration(h.ms) : '—', sub: h.counted ? `${h.counted} trade${h.counted !== 1 ? 's' : ''} timed` : 'add entry/exit times', color: h.ms != null ? '#3B82F6' : '#444' } })(),
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ background: '#1A1A1A', borderRadius: '10px', border: `1px solid ${color}40`, padding: '14px 16px' }}>
              <div style={{ color: '#A0A0A0', fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.25rem', color, lineHeight: 1 }}>{value}</div>
              <div style={{ color: '#777', fontSize: '0.63rem', marginTop: '5px' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* The trader's own questions, right under their score */}
      <CustomQuestions category="execution" accent="#4CAF7D" trades={trades} />

      <DayOfWeekBreakdown trades={trades} />

      {/* ── Rule adherence — every rule in one place, worst first ──
          Previously this was four separate card grids (Core / Entry / Exit),
          which made you hunt for the rule that was actually hurting you. */}
      {allRules.length > 0 && (
        <div style={{ background: '#1E1E1E', borderRadius: 12, border: '1px solid #2A2A2A', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 12px' }}>
            <h3 style={{ color: '#F5F5F5', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Rule Adherence</h3>
            <p style={{ color: '#8A8A8A', fontSize: '0.75rem', margin: '4px 0 0' }}>
              Weakest first. The last column is what breaking that rule has cost you.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px 8px' }}>
            <div style={{ width: 148, flexShrink: 0, color: '#5E5E5E', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Rule</div>
            <div style={{ flex: 1, minWidth: 60 }} />
            <div style={{ width: 46, textAlign: 'right', flexShrink: 0, color: '#5E5E5E', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Kept</div>
            <div style={{ width: 96, textAlign: 'right', flexShrink: 0, color: '#5E5E5E', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Cost</div>
          </div>
          {allRules.map(r => <RuleRow key={r.label} {...r} />)}
        </div>
      )}

      {/* ── Quality Scores ── */}
      {(entryQ.tradesWithData > 0 || exitQ.tradesWithData > 0) && (
        <>
          <SecHead label="Quality Scores" />
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <QualityPillar label="Entry Quality" icon="🎯" color="#4FC3F7" avg={entryQ.avg} tradesWithData={entryQ.tradesWithData} dist={entryQ.dist} highPnl={entryQ.highPnl} lowPnl={entryQ.lowPnl} />
            <QualityPillar label="Exit Quality"  icon="🚪" color="#FFB74D" avg={exitQ.avg}  tradesWithData={exitQ.tradesWithData}  dist={exitQ.dist}  highPnl={exitQ.highPnl}  lowPnl={exitQ.lowPnl} />
          </div>
        </>
      )}

      {/* ── P&L Impact chart ── */}
      {chartData.some(d => d.followed !== 0 || d.notFollowed !== 0) && (
        <div style={{ background: '#1E1E1E', borderRadius: '12px', border: '1px solid #2A2A2A', padding: '20px' }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: '#E0E0E0', fontSize: '0.92rem', fontWeight: 600 }}>P&L Impact — Disciplined vs Undisciplined</span>
          </div>
          <div style={{ color: '#8A8A8A', fontSize: '0.72rem', marginBottom: '16px' }}>Total P&L when each core rule was followed vs broken</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="30%" barGap={6}>
              <XAxis dataKey="name" tick={{ fill: '#9A9A9A', fontSize: 13, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={65} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: '#2A2A2A', border: '1px solid #3A3A3A', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.8rem' }}
                formatter={(v, name) => [`${v >= 0 ? '+' : ''}$${v.toFixed(2)}`, name === 'followed' ? '✅ Disciplined' : '❌ Broke rule']} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" />
              <Bar dataKey="followed"    name="followed"    fill="#4CAF7D" fillOpacity={0.8} radius={[5,5,0,0]} />
              <Bar dataKey="notFollowed" name="notFollowed" fill="#E05252" fillOpacity={0.8} radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 9, height: 9, borderRadius: 2, background: '#4CAF7D' }} /><span style={{ color: '#8A8A8A', fontSize: '0.7rem' }}>Disciplined</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 9, height: 9, borderRadius: 2, background: '#E05252' }} /><span style={{ color: '#8A8A8A', fontSize: '0.7rem' }}>Broke rule</span></div>
          </div>
        </div>
      )}

      {/* Execution issues table */}
      {flawed.length > 0 && (
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid rgba(224,82,82,0.15)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <h3 style={{ color: '#F5F5F5', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Trades With Execution Issues</h3>
            <span style={{ background: 'rgba(224,82,82,0.12)', color: '#E05252', borderRadius: '10px', padding: '2px 9px', fontSize: '0.7rem', fontWeight: 700, marginLeft: 'auto' }}>{flawed.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#1A1A1A' }}>
                  {['Date','Symbol','Side','Net P&L','Result','Followed Plan','Moved Stop','Over-Risked','Notes'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#8A8A8A', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #2A2A2A' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flawed.map((t, i) => {
                  const pnl  = parseFloat(t.netPnl) || 0
                  const even = i % 2 === 0
                  const brokePlan  = t.followedPlan?.toLowerCase() === 'no'
                  const movedStop  = t.movedStop?.toLowerCase() === 'yes'
                  const wrongSize  = t.overRisked?.toLowerCase() === 'yes'

                  const flag = (bad, label) => (
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700,
                      background: bad ? 'rgba(224,82,82,0.12)' : 'rgba(76,175,125,0.12)',
                      color: bad ? '#E05252' : '#4CAF7D',
                      border: `1px solid ${bad ? 'rgba(224,82,82,0.25)' : 'rgba(76,175,125,0.25)'}`,
                    }}>{label}</span>
                  )

                  return (
                    <tr key={t.id}
                      style={{ borderBottom: '1px solid rgba(58,58,58,0.4)', background: even ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = even ? 'transparent' : 'rgba(255,255,255,0.01)'}
                    >
                      <td style={{ padding: '10px 16px', color: '#777', whiteSpace: 'nowrap' }}>{format(_safeD(t.createdAt), 'MM/dd/yyyy')}</td>
                      <td style={{ padding: '10px 16px', color: '#F5F5F5', fontWeight: 600 }}>{t.symbol}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: t.direction === 'Long' ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.15)', color: t.direction === 'Long' ? '#4CAF7D' : '#E05252', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>{t.direction}</span>
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnl >= 0 ? '#4CAF7D' : '#E05252' }}>{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: t.result === 'Win' ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.15)', color: t.result === 'Win' ? '#4CAF7D' : '#E05252', padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem' }}>{t.result}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>{flag(brokePlan, brokePlan ? 'No' : 'Yes')}</td>
                      <td style={{ padding: '10px 16px' }}>{flag(movedStop, movedStop ? 'Yes' : 'No')}</td>
                      <td style={{ padding: '10px 16px' }}>{flag(wrongSize, wrongSize ? 'Yes' : 'No')}</td>
                      <td style={{ padding: '10px 16px', color: '#8A8A8A', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }} title={t.tradeNotes}>{t.tradeNotes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {untagged > 0 && (
        <div style={{ background: '#1E1E1E', borderRadius: '10px', border: '1px solid #2A2A2A', padding: '14px 20px' }}>
          <span style={{ color: '#9A9A9A', fontSize: '0.82rem' }}>
            <span style={{ color: '#3B82F6', fontWeight: 600 }}>{untagged} trade{untagged !== 1 ? 's' : ''}</span> have no execution fields. Fill in "Followed Plan", "Moved Stop", and "Did You Over-Risk?" when logging trades to include them here.
          </span>
        </div>
      )}

    </div>
  )
}

/* ── Performance by day of week — best / worst / every other day ── */
const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function DayOfWeekBreakdown({ trades }) {
  const rows = useMemo(() => {
    const buckets = DOW_LABELS.map((label, i) => ({ label, dow: i, trades: 0, wins: 0, losses: 0, pnl: 0, days: new Set() }))
    for (const t of trades) {
      const d = new Date(t.date || t.createdAt)
      if (isNaN(d.getTime())) continue
      const b = buckets[d.getDay()]
      b.trades += 1
      b.pnl += parseFloat(t.netPnl) || 0
      if (t.result === 'Win') b.wins += 1
      else if (t.result === 'Loss') b.losses += 1
      b.days.add(String(t.date || '').slice(0, 10))
    }
    return buckets
      .map(b => ({
        ...b,
        winRate:  b.wins + b.losses ? Math.round((b.wins / (b.wins + b.losses)) * 100) : 0,
        avgPnl:   b.trades ? b.pnl / b.trades : 0,
        sessions: b.days.size,
      }))
      // Mon-first ordering, Sunday last
      .sort((a, b) => ((a.dow + 6) % 7) - ((b.dow + 6) % 7))
  }, [trades])

  const active = rows.filter(r => r.trades > 0)
  if (!active.length) return null

  const best  = active.reduce((a, b) => (b.pnl > a.pnl ? b : a))
  const worst = active.reduce((a, b) => (b.pnl < a.pnl ? b : a))
  const maxAbs = Math.max(...active.map(r => Math.abs(r.pnl))) || 1

  const money = v => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`

  return (
    <div style={{ background: '#1E1E1E', borderRadius: '10px', border: '1px solid #2A2A2A', padding: '20px 22px' }}>
      <h3 style={{ color: '#F5F5F5', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 4px' }}>Performance by Day of Week</h3>
      <p style={{ color: '#9A9A9A', fontSize: '0.78rem', margin: '0 0 18px' }}>Which days you actually make money on.</p>

      {/* Best / worst callouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { tag: 'Most profitable day',  row: best,  color: '#4CAF7D' },
          { tag: 'Least profitable day', row: worst, color: '#E05252' },
        ].map(({ tag, row, color }) => (
          <div key={tag} style={{ background: '#191919', border: `1px solid ${color}33`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ color: '#9A9A9A', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tag}</div>
            <div style={{ color: '#F5F5F5', fontSize: '1.05rem', fontWeight: 700, marginTop: 4 }}>{row.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', color, fontSize: '0.9rem', fontWeight: 700, marginTop: 2 }}>{money(row.pnl)}</div>
            <div style={{ color: '#666', fontSize: '0.74rem', marginTop: 3 }}>{row.trades} trade{row.trades !== 1 ? 's' : ''} · {row.winRate}% win</div>
          </div>
        ))}
      </div>

      {/* Every day */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r, i) => {
          const pos = r.pnl >= 0
          const color = r.trades === 0 ? '#555' : pos ? '#4CAF7D' : '#E05252'
          return (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: i ? '1px solid #252525' : 'none', opacity: r.trades ? 1 : 0.45 }}>
              <div style={{ width: 88, flexShrink: 0, color: '#C0C0C0', fontSize: '0.82rem', fontWeight: 600 }}>{r.label}</div>
              <div style={{ width: 74, flexShrink: 0, color: '#777', fontSize: '0.76rem' }}>
                {r.trades ? `${r.trades} trade${r.trades !== 1 ? 's' : ''}` : 'no trades'}
              </div>
              <div style={{ width: 58, flexShrink: 0, color: r.trades ? '#999' : '#555', fontSize: '0.76rem', fontFamily: 'JetBrains Mono, monospace' }}>
                {r.trades ? `${r.winRate}%` : '—'}
              </div>
              {/* P&L bar */}
              <div style={{ flex: 1, minWidth: 60, height: 6, background: '#242424', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(Math.abs(r.pnl) / maxAbs) * 100}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              <div style={{ width: 92, flexShrink: 0, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', fontWeight: 700, color }}>
                {r.trades ? money(r.pnl) : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function Reports() {
  const { trades: allTrades } = useTradeStore()
  const navigate   = useNavigate()
  const [tab, setTab] = useState('performance')

  // Live tabs report real trades only; the Backtesting tab reports the rest
  const trades   = useMemo(() => liveTrades(allTrades), [allTrades])
  const btTrades = useMemo(() => backtestTrades(allTrades), [allTrades])

  if (!allTrades.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✝</div>
      <p style={{ color: '#A0A0A0', marginBottom: '20px' }}>No trades yet. Log your first trade to see your reports.</p>
      <button onClick={() => navigate('/app/log')} className="btn-gold" style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <PlusCircle size={15} /> Log Trade
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Reports</h1>
          {/* Tab toggle */}
          <div style={{ display: 'flex', background: '#1A1A1A', borderRadius: '10px', padding: '4px', gap: '2px' }}>
            {[
              ['performance', 'Performance'],
              ['psychology',  'Psychology'],
              ['execution',   'Execution'],
              ['backtest',    'Backtesting'],
            ].map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)}
                style={{
                  padding: '6px 18px', borderRadius: '7px', border: 'none', fontSize: '0.82rem',
                  cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                  background: tab === v ? '#3B82F6' : 'transparent',
                  color:      tab === v ? '#1A1A1A' : '#666',
                  boxShadow:  tab === v ? '0 0 12px rgba(59,130,246,0.3)' : 'none',
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

      {tab === 'performance' && <PerformanceView        trades={trades} />}
      {tab === 'psychology'  && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PsychologyReport trades={trades} />
          <CustomQuestions category="psychology" accent="#3B82F6" trades={trades} />
        </div>
      )}
      {tab === 'execution'   && (
        <ExecutionQualityReport trades={trades} />
      )}
      {tab === 'backtest'    && <BacktestReport trades={btTrades} onImport={() => navigate('/app/backtest')} />}
    </div>
  )
}
