import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, startOfWeek, endOfWeek,
  eachWeekOfInterval, isToday, getYear, getMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function buildDayMap(trades) {
  const map = {}
  trades.forEach(t => {
    const key = format(new Date(t.createdAt), 'yyyy-MM-dd')
    if (!map[key]) map[key] = { pnl: 0, trades: 0, wins: 0 }
    map[key].pnl += parseFloat(t.netPnl) || 0
    map[key].trades++
    if (t.result === 'Win') map[key].wins++
  })
  return map
}

function getDayBg(pnl) {
  if (pnl > 0) return 'rgba(76,175,125,0.22)'
  if (pnl < 0) return 'rgba(224,82,82,0.22)'
  return 'transparent'
}
function getDayBorder(pnl) {
  if (pnl > 0) return '1.5px solid rgba(76,175,125,0.5)'
  if (pnl < 0) return '1.5px solid rgba(224,82,82,0.5)'
  return '1.5px solid transparent'
}

/* ── Small month card used in year view ── */
function MiniMonth({ year, monthIdx, dayMap, onClick }) {
  const date = new Date(year, monthIdx, 1)
  const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) })
  const startDow = startOfMonth(date).getDay()
  const monthPnl = days.reduce((s, d) => {
    const key = format(d, 'yyyy-MM-dd')
    return s + (dayMap[key]?.pnl || 0)
  }, 0)

  return (
    <div
      onClick={() => onClick(monthIdx)}
      style={{ background: '#242424', borderRadius: '10px', border: '1px solid #3A3A3A', padding: '14px', cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#3A3A3A'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ color: '#F5F5F5', fontSize: '0.82rem', fontWeight: 600 }}>{format(date, 'MMMM')}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: monthPnl >= 0 ? '#4CAF7D' : '#E05252', fontWeight: 700 }}>
          {monthPnl !== 0 ? `${monthPnl >= 0 ? '+' : ''}$${monthPnl.toFixed(0)}` : ''}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {Array.from({ length: startDow }).map((_, i) => <div key={'e'+i} />)}
        {days.map(d => {
          const key = format(d, 'yyyy-MM-dd')
          const data = dayMap[key]
          return (
            <div key={key} style={{ aspectRatio: '1', borderRadius: '2px', background: data ? getDayBg(data.pnl) : 'transparent', border: data ? getDayBorder(data.pnl) : 'none' }} />
          )
        })}
      </div>
    </div>
  )
}

/* ── Main calendar ── */
export default function TradeCalendar({ trades }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')
  const dayMap = useMemo(() => buildDayMap(trades), [trades])

  const year = getYear(currentDate)
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  const monthlyStats = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    let pnl = 0, daysTraded = 0
    days.forEach(d => {
      const key = format(d, 'yyyy-MM-dd')
      if (dayMap[key]) { pnl += dayMap[key].pnl; daysTraded++ }
    })
    return { pnl, daysTraded }
  }, [currentDate, dayMap])

  const weeks = useMemo(() => {
    const firstWeekStart = startOfWeek(monthStart)
    const lastWeekEnd = endOfWeek(monthEnd)
    return eachWeekOfInterval({ start: firstWeekStart, end: lastWeekEnd })
  }, [currentDate])

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div style={{ background: '#242424', borderRadius: '14px', border: '1px solid #3A3A3A', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #3A3A3A', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => view === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(new Date(year - 1, 0, 1))}
            style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', color: '#A0A0A0', width: 32, height: 32, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.1rem', minWidth: '140px', textAlign: 'center' }}>
            {view === 'month' ? format(currentDate, 'MMMM yyyy') : year}
          </span>
          <button onClick={() => view === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(new Date(year + 1, 0, 1))}
            style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', color: '#A0A0A0', width: 32, height: 32, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => { setCurrentDate(new Date()); setView('month') }}
            style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', color: '#A0A0A0', padding: '5px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Today
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {view === 'month' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ color: '#555', fontSize: '0.8rem' }}>Monthly P&L:</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.95rem', background: monthlyStats.pnl >= 0 ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.15)', color: monthlyStats.pnl >= 0 ? '#4CAF7D' : '#E05252', padding: '4px 12px', borderRadius: '7px' }}>
                {monthlyStats.pnl >= 0 ? '+' : ''}${monthlyStats.pnl.toFixed(0)}
              </span>
              <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', padding: '4px 12px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 600 }}>
                {monthlyStats.daysTraded} day{monthlyStats.daysTraded !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', background: '#1A1A1A', borderRadius: '9px', padding: '3px', gap: '2px' }}>
            {['month', 'year'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '5px 14px', borderRadius: '7px', border: 'none', fontSize: '0.8rem', cursor: 'pointer', background: view === v ? '#3B82F6' : 'transparent', color: view === v ? '#1A1A1A' : '#666', fontWeight: view === v ? 700 : 400, transition: 'all 0.15s' }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── YEAR VIEW ── */}
      {view === 'year' && (
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <MiniMonth key={i} year={year} monthIdx={i} dayMap={dayMap}
              onClick={(m) => { setCurrentDate(new Date(year, m, 1)); setView('month') }} />
          ))}
        </div>
      )}

      {/* ── MONTH VIEW ── single unified grid so row heights always match */}
      {view === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 120px', overflow: 'hidden' }}>

          {/* Row 0: DOW headers (7 cols) + Week header (1 col) */}
          {DOW.map((d, di) => (
            <div key={d} style={{ padding: '12px', textAlign: 'center', color: '#777', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: '#1E1E1E', borderBottom: '1px solid #3A3A3A', borderRight: di < 6 ? '1px solid #2A2A2A' : 'none' }}>{d}</div>
          ))}
          <div style={{ padding: '12px', background: '#1E1E1E', borderBottom: '1px solid #3A3A3A', borderLeft: '1px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#555', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Week</span>
          </div>

          {/* Rows 1-N: 7 day cells + 1 week summary cell per week */}
          {weeks.map((weekStart, wi) => {
            const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) })
            let weekPnl = 0, daysCount = 0
            weekDays.forEach(d => {
              const key = format(d, 'yyyy-MM-dd')
              if (dayMap[key] && getMonth(d) === getMonth(currentDate)) {
                weekPnl += dayMap[key].pnl
                daysCount++
              }
            })
            const hasData = daysCount > 0
            const isLast = wi === weeks.length - 1

            return (
              <>
                {weekDays.map((day, di) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const data = dayMap[key]
                  const inMonth = getMonth(day) === getMonth(currentDate)
                  const todayDay = isToday(day)
                  const winRate = data?.trades ? ((data.wins / data.trades) * 100).toFixed(0) : null
                  return (
                    <div key={key} style={{
                      borderRight: di < 6 ? '1px solid #2E2E2E' : 'none',
                      borderBottom: !isLast ? '1px solid #2E2E2E' : 'none',
                      background: data && inMonth ? (data.pnl > 0 ? 'rgba(76,175,125,0.12)' : 'rgba(224,82,82,0.12)') : 'transparent',
                      outline: todayDay ? '2px solid #3B82F6' : 'none',
                      outlineOffset: '-2px',
                      padding: '10px 12px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                      opacity: inMonth ? 1 : 0.25,
                      minHeight: '110px',
                      transition: 'background 0.1s',
                    }}>
                      <div style={{
                        textAlign: 'right', color: todayDay ? '#3B82F6' : inMonth ? '#888' : '#444',
                        fontSize: '0.82rem', fontWeight: todayDay ? 800 : 500,
                        background: todayDay ? 'rgba(59,130,246,0.12)' : 'transparent',
                        borderRadius: '50%', width: '26px', height: '26px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto',
                      }}>
                        {format(day, 'd')}
                      </div>
                      {data && inMonth && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'center', marginTop: '2px' }}>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.05rem', color: data.pnl >= 0 ? '#4CAF7D' : '#E05252', letterSpacing: '-0.01em' }}>
                            {data.pnl >= 0 ? '+' : ''}${Math.abs(data.pnl).toFixed(0)}
                          </div>
                          <div style={{ color: '#777', fontSize: '0.72rem' }}>{data.trades} trade{data.trades !== 1 ? 's' : ''}</div>
                          <div style={{ color: parseFloat(winRate) >= 50 ? '#3B82F6' : '#888', fontSize: '0.7rem', fontWeight: 600 }}>{winRate}% WR</div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Week summary — same row as its 7 day cells, heights match automatically */}
                <div key={`w${wi}`} style={{
                  borderLeft: '1px solid #3A3A3A',
                  borderBottom: !isLast ? '1px solid #2E2E2E' : 'none',
                  padding: '12px 16px',
                  display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center',
                  background: hasData ? (weekPnl > 0 ? 'rgba(76,175,125,0.06)' : 'rgba(224,82,82,0.06)') : '#1E1E1E',
                }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '0.95rem', color: hasData ? (weekPnl > 0 ? '#4CAF7D' : weekPnl < 0 ? '#E05252' : '#555') : '#333' }}>
                    {hasData ? `${weekPnl >= 0 ? '+' : ''}$${Math.abs(weekPnl).toFixed(0)}` : '—'}
                  </div>
                  {hasData && <div style={{ color: '#555', fontSize: '0.68rem' }}>{daysCount} day{daysCount !== 1 ? 's' : ''}</div>}
                </div>
              </>
            )
          })}
        </div>
      )}
    </div>
  )
}
