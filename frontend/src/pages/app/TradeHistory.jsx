import { useState, useMemo, Fragment } from 'react'
import { format } from 'date-fns'
import { Search, Trash2, Download, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TradeChartViewer from '../../components/app/TradeChartViewer'
import { toTimeInput } from '../../lib/csvImport'
import { tradeDurationMs, formatDuration } from '../../lib/tradeTime'

// Small colored tag pill
function Tag({ label, value, color }) {
  if (!value) return null
  const c = color || '#3B82F6'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${c}15`, border: `1px solid ${c}40`,
      borderRadius: 6, padding: '3px 9px', fontSize: '0.72rem',
      color: c, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ color: '#555', fontWeight: 400 }}>{label}:</span> {value}
    </span>
  )
}

function tagColor(val) {
  if (!val) return '#666'
  const v = val.toLowerCase()
  if (['yes','win','good','excellent','locked in','focused','low','on plan','high'].some(x => v.includes(x))) return '#4CAF7D'
  if (['no','loss','poor','scattered','high stress','too early','too late','rushed'].some(x => v.includes(x))) return '#E05252'
  if (['partially','average','fair','medium','distracted'].some(x => v.includes(x))) return '#3B82F6'
  return '#3B82F6'
}

// Expanded detail panel shown below a trade row
function TradeDetailRow({ trade, colSpan }) {
  const held = tradeDurationMs(trade)
  const timing = [
    toTimeInput(trade.entryTime) && ['Entry Time', toTimeInput(trade.entryTime)],
    toTimeInput(trade.exitTime)  && ['Exit Time',  toTimeInput(trade.exitTime)],
    held != null && ['Time in Trade', formatDuration(held)],
  ].filter(Boolean)

  const exec = [
    ['Followed Plan',    trade.followedPlan],
    ['Moved Stop',       trade.movedStop],
    ['Over-Risked',      trade.overRisked],
    ['Waited Confirm.',  trade.waitedConfirmation],
    ['Entered at Level', trade.enteredAtLevel],
    ['Rushed Entry',     trade.rushedEntry],
    ['Exit Timing',      trade.exitDecision],
    ['Trade Mgmt',       trade.tradeManagement],
  ].filter(([, v]) => v)

  const qual = [
    trade.entryQuality != null && ['Entry Quality', `${trade.entryQuality}/10`],
    trade.exitQuality  != null && ['Exit Quality',  `${trade.exitQuality}/10`],
    trade.faithRating  != null && trade.faithRating > 0 && ['Faith Rating', `${trade.faithRating}★`],
  ].filter(Boolean)

  const psych = [
    ['Pre-Trade',   trade.preTrade],
    ['Post-Trade',  trade.postTrade],
    ['Sleep',       trade.sleepQuality],
    ['Focus',       trade.focusLevel],
    ['Stress',      trade.stressLevel],
    ['Energy',      trade.energyLevel],
    ['Revenge Trade', trade.revengeTrade],
  ].filter(([, v]) => v)

  const notes = [
    trade.mindsetNotes && ['Mindset', trade.mindsetNotes],
    trade.tradeNotes   && ['Notes',   trade.tradeNotes],
    trade.scripture    && ['Scripture', trade.scripture],
    trade.prayer       && ['Prayer',    trade.prayer],
    trade.gratitude    && ['Gratitude', trade.gratitude],
  ].filter(Boolean)

  const hasData = timing.length || exec.length || qual.length || psych.length || notes.length

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0, background: 'rgba(59,130,246,0.03)', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!hasData && <span style={{ color: '#444', fontSize: '0.8rem' }}>No tags recorded for this trade.</span>}

          {timing.length > 0 && (
            <div>
              <div style={{ color: '#555', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Timing</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {timing.map(([l, v]) => <Tag key={l} label={l} value={v} color="#3B82F6" />)}
              </div>
            </div>
          )}

          {exec.length > 0 && (
            <div>
              <div style={{ color: '#555', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Execution</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {exec.map(([l, v]) => <Tag key={l} label={l} value={v} color={tagColor(v)} />)}
              </div>
            </div>
          )}

          {qual.length > 0 && (
            <div>
              <div style={{ color: '#555', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Quality Scores</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {qual.map(([l, v]) => <Tag key={l} label={l} value={v} color="#3B82F6" />)}
              </div>
            </div>
          )}

          {psych.length > 0 && (
            <div>
              <div style={{ color: '#555', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Psychology</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {psych.map(([l, v]) => <Tag key={l} label={l} value={v} color={tagColor(v)} />)}
              </div>
            </div>
          )}

          {notes.length > 0 && (
            <div>
              <div style={{ color: '#555', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Notes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {notes.map(([l, v]) => (
                  <div key={l} style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: '#555', fontWeight: 600 }}>{l}: </span>
                    <span style={{ color: '#A0A0A0' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function TradeHistory() {
  const { trades, deleteTrade } = useTradeStore()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sideFilter, setSideFilter] = useState('All')
  const [resultFilter, setResultFilter] = useState('All')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewingChart, setViewingChart]   = useState(null)
  const [expandedRow,  setExpandedRow]    = useState(null)

  const filtered = useMemo(() => trades.filter(t => {
    const matchSearch = !search || t.symbol?.toLowerCase().includes(search.toLowerCase())
    const matchSide = sideFilter === 'All' || t.direction === sideFilter
    const matchResult = resultFilter === 'All' || t.result === resultFilter
    return matchSearch && matchSide && matchResult
  }), [trades, search, sideFilter, resultFilter])

  if (!trades.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ color: '#A0A0A0', fontSize: '1.1rem' }}>No trades yet.</p>
      <button onClick={() => navigate('/app/log')} className="btn-gold" style={{ marginTop: '16px', padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Log Your First Trade</button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Trade History</h1>
        <button style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', color: '#A0A0A0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search symbol..." style={{ width: '100%', background: '#242424', border: '1px solid #3A3A3A', borderRadius: '8px', padding: '9px 12px 9px 36px', color: '#F5F5F5', fontSize: '0.85rem', outline: 'none' }} />
        </div>
        {[['Side', ['All','Long','Short'], sideFilter, setSideFilter], ['Result', ['All','Win','Loss','Breakeven'], resultFilter, setResultFilter]].map(([label, opts, val, setter]) => (
          <select key={label} value={val} onChange={e => setter(e.target.value)} style={{ background: '#242424', border: '1px solid #3A3A3A', borderRadius: '8px', padding: '9px 12px', color: '#F5F5F5', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
            {opts.map(o => <option key={o} value={o}>{label}: {o}</option>)}
          </select>
        ))}
      </div>

      <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#2E2E2E', borderBottom: '1px solid #3A3A3A' }}>
                {['#','Date','Time','Symbol','Side','Strategy','Entry','Exit','Net P&L','Result','Execution','Psychology','Chart',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#666', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (<Fragment key={t.id}>
                <tr style={{ borderBottom: expandedRow === t.id ? 'none' : '1px solid rgba(58,58,58,0.5)', background: expandedRow === t.id ? 'rgba(59,130,246,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
                  onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}
                  onMouseEnter={e => { if (expandedRow !== t.id) e.currentTarget.style.background = 'rgba(59,130,246,0.04)' }}
                  onMouseLeave={e => { if (expandedRow !== t.id) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                >
                  <td style={{ padding: '10px 12px', color: '#666' }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', color: '#A0A0A0', whiteSpace: 'nowrap' }}>{format((() => { const dt = new Date(t.createdAt || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt })(), 'MM/dd/yy')}</td>
                  <td style={{ padding: '10px 12px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{
                    (toTimeInput(t.entryTime) || toTimeInput(t.exitTime))
                      ? `${toTimeInput(t.entryTime) || '—'} → ${toTimeInput(t.exitTime) || '—'}`
                      : '—'
                  }</td>
                  <td style={{ padding: '10px 12px', color: '#F5F5F5', fontWeight: 600 }}>{t.symbol}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: t.direction === 'Long' ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.15)', color: t.direction === 'Long' ? '#4CAF7D' : '#E05252', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>{t.direction}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#A0A0A0' }}>{t.strategyName || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>${parseFloat(t.entryPrice||0).toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', color: '#A0A0A0', fontFamily: 'JetBrains Mono, monospace' }}>${parseFloat(t.exitPrice||0).toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', color: parseFloat(t.netPnl) >= 0 ? '#4CAF7D' : '#E05252', fontWeight: 600 }}>
                    {parseFloat(t.netPnl) >= 0 ? '+' : ''}${parseFloat(t.netPnl||0).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#3B82F6', fontFamily: 'JetBrains Mono, monospace', fontWeight: t.riskReward ? 600 : 400 }}>{t.riskReward ? `1:${t.riskReward}` : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: t.result === 'Win' ? 'rgba(76,175,125,0.15)' : t.result === 'Loss' ? 'rgba(224,82,82,0.15)' : 'rgba(160,160,160,0.15)', color: t.result === 'Win' ? '#4CAF7D' : t.result === 'Loss' ? '#E05252' : '#A0A0A0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>{t.result}</span>
                  </td>

                  {/* Execution tags column */}
                  <td style={{ padding: '8px 12px', minWidth: 160 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {t.followedPlan   && <Tag label="Plan"    value={t.followedPlan}   color={tagColor(t.followedPlan)} />}
                      {t.enteredAtLevel && <Tag label="Level"   value={t.enteredAtLevel} color={tagColor(t.enteredAtLevel)} />}
                      {t.exitDecision   && <Tag label="Exit"    value={t.exitDecision}   color={tagColor(t.exitDecision)} />}
                      {t.rushedEntry    && <Tag label="Rushed"  value={t.rushedEntry}    color={tagColor(t.rushedEntry)} />}
                      {t.movedStop      && <Tag label="Stop"    value={t.movedStop}      color={t.movedStop === 'No' ? '#4CAF7D' : '#E05252'} />}
                      {t.tradeManagement && <Tag label="Mgmt"  value={t.tradeManagement} color={tagColor(t.tradeManagement)} />}
                      {t.entryQuality != null && <Tag label="EQ" value={`${t.entryQuality}/10`} color={t.entryQuality >= 7 ? '#4CAF7D' : t.entryQuality >= 5 ? '#3B82F6' : '#E05252'} />}
                      {t.exitQuality  != null && <Tag label="XQ" value={`${t.exitQuality}/10`}  color={t.exitQuality  >= 7 ? '#4CAF7D' : t.exitQuality  >= 5 ? '#3B82F6' : '#E05252'} />}
                      {!t.followedPlan && !t.enteredAtLevel && !t.exitDecision && !t.rushedEntry && !t.entryQuality && <span style={{ color: '#333', fontSize: '0.72rem' }}>—</span>}
                    </div>
                  </td>

                  {/* Psychology tags column */}
                  <td style={{ padding: '8px 12px', minWidth: 160 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {t.preTrade    && <Tag label="Pre"     value={t.preTrade}    color="#3B82F6" />}
                      {t.postTrade   && <Tag label="Post"    value={t.postTrade}   color="#3B82F6" />}
                      {t.sleepQuality && <Tag label="Sleep"  value={t.sleepQuality}  color={tagColor(t.sleepQuality)} />}
                      {t.focusLevel   && <Tag label="Focus"  value={t.focusLevel}    color={tagColor(t.focusLevel)} />}
                      {t.stressLevel  && <Tag label="Stress" value={t.stressLevel}   color={tagColor(t.stressLevel)} />}
                      {t.energyLevel  && <Tag label="Energy" value={t.energyLevel}   color={tagColor(t.energyLevel)} />}
                      {t.revengeTrade && <Tag label="Revenge" value={t.revengeTrade} color={tagColor(t.revengeTrade)} />}
                      {t.faithRating > 0 && <Tag label="Faith" value={`${t.faithRating}★`} color="#3B82F6" />}
                      {!t.preTrade && !t.sleepQuality && !t.focusLevel && !t.stressLevel && !t.revengeTrade && <span style={{ color: '#333', fontSize: '0.72rem' }}>—</span>}
                    </div>
                  </td>

                  <td style={{ padding: '10px 12px' }}>
                    {t.chartImage ? (
                      <button onClick={() => setViewingChart(t)}
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#3B82F6', fontSize: '0.72rem', fontWeight: 600 }}>
                        <ImageIcon size={12} /> View
                      </button>
                    ) : <span style={{ color: '#333', fontSize: '0.72rem' }}>—</span>}
                  </td>
                  {!isAdmin && (
                  <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                    {deleteConfirm === t.id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => { deleteTrade(t.id); setDeleteConfirm(null) }}
                          style={{ background: '#E05252', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                          Yes, Delete
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', color: '#A0A0A0', padding: '4px 8px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(t.id)}
                        style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', color: '#E05252', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600 }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </td>
                  )}
                  {/* Expand toggle */}
                  <td style={{ padding: '10px 8px', color: expandedRow === t.id ? '#3B82F6' : '#444', textAlign: 'center' }}>
                    {expandedRow === t.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </td>
                </tr>
                {expandedRow === t.id && <TradeDetailRow trade={t} colSpan={14} />}
              </Fragment>))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #3A3A3A', color: '#666', fontSize: '0.8rem' }}>
          Showing {filtered.length} of {trades.length} trades
        </div>
      </div>

      {/* Chart lightbox */}
      {viewingChart && (
        <TradeChartViewer trade={viewingChart} onClose={() => setViewingChart(null)} />
      )}
    </div>
  )
}
