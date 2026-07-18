import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid } from 'recharts'
import { useTradeStore } from '../../store/tradeStore'
import { useNavigate } from 'react-router-dom'

const ttStyle = { contentStyle: { background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.8rem' } }

export default function Analytics() {
  const { trades } = useTradeStore()
  const navigate = useNavigate()

  const byDay = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const _safeD = (d) => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }
    const map = {}
    days.forEach(d => { map[d] = { day: d, pnl: 0, count: 0 } })
    trades.forEach(t => {
      const d = days[_safeD(t.createdAt).getDay()]
      map[d].pnl += parseFloat(t.netPnl) || 0
      map[d].count++
    })
    return days.map(d => ({ ...map[d], pnl: parseFloat(map[d].pnl.toFixed(2)) }))
  }, [trades])

  const bySymbol = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      if (!map[t.symbol]) map[t.symbol] = { symbol: t.symbol, pnl: 0 }
      map[t.symbol].pnl += parseFloat(t.netPnl) || 0
    })
    return Object.values(map).sort((a,b) => b.pnl - a.pnl).slice(0, 10).map(x => ({ ...x, pnl: parseFloat(x.pnl.toFixed(2)) }))
  }, [trades])

  const byEmotion = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      const e = t.preTrade || 'Unknown'
      if (!map[e]) map[e] = { emotion: e, total: 0, count: 0 }
      map[e].total += parseFloat(t.netPnl) || 0
      map[e].count++
    })
    return Object.values(map).map(x => ({ emotion: x.emotion, avgPnl: parseFloat((x.total / x.count).toFixed(2)) }))
  }, [trades])

  const streaks = useMemo(() => {
    let curWin = 0, maxWin = 0, curLoss = 0, maxLoss = 0
    trades.forEach(t => {
      if (t.result === 'Win') { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin) }
      else if (t.result === 'Loss') { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss) }
    })
    return { curWin, maxWin, curLoss, maxLoss }
  }, [trades])

  if (!trades.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ color: '#A0A0A0' }}>Log trades to see your analytics.</p>
      <button onClick={() => navigate('/app/log')} className="btn-gold" style={{ marginTop: '16px', padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Log First Trade</button>
    </div>
  )

  const ChartCard = ({ title, children }) => (
    <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '20px' }}>
      <h3 style={{ color: '#F5F5F5', fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px' }}>{title}</h3>
      {children}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Analytics</h1>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <ChartCard title="P&L by Day of Week">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byDay}>
              <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...ttStyle} />
              <Bar dataKey="pnl" fill="#3B82F6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="P&L by Symbol">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bySymbol} layout="vertical">
              <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="symbol" type="category" tick={{ fill: '#A0A0A0', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip {...ttStyle} />
              <Bar dataKey="pnl" fill="#3B82F6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Streak tracker */}
      <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '20px' }}>
        <h3 style={{ color: '#F5F5F5', fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px' }}>Streak Tracker</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Current Win Streak', value: streaks.curWin, color: '#4CAF7D' },
            { label: 'Longest Win Streak', value: streaks.maxWin, color: '#4CAF7D' },
            { label: 'Current Loss Streak', value: streaks.curLoss, color: '#E05252' },
            { label: 'Longest Loss Streak', value: streaks.maxLoss, color: '#E05252' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1A1A1A', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: '#666', fontSize: '0.78rem', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Emotion vs P&L */}
      {byEmotion.length > 0 && (
        <ChartCard title="Avg P&L by Pre-Trade Emotion">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byEmotion}>
              <XAxis dataKey="emotion" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...ttStyle} />
              <Bar dataKey="avgPnl" fill="#3B82F6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}
