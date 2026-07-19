import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useTradeStore } from '../../store/tradeStore'
import { backtestTrades } from '../../lib/tradeFilters'
import BacktestReport from '../../components/app/BacktestReport'
import BacktestCsvImport from '../../components/app/BacktestCsvImport'

/* Backtesting. Sections are driven by ?tab= and rendered in the app sidebar
   while you're on this page — see BACKTEST_NAV in layouts/AppLayout.jsx.
   Keep the two lists in sync. */
const BACKTEST_TABS = ['dashboard', 'import', 'trades']

const card = { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 14 }
const money = v => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`

export default function Backtest() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { trades: allTrades } = useTradeStore()

  const tab = BACKTEST_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'dashboard'
  const bt  = useMemo(() => backtestTrades(allTrades), [allTrades])

  const goImport = () => navigate('/app/backtest?tab=import')

  if (tab === 'dashboard') {
    return <BacktestReport trades={bt} onImport={goImport} />
  }

  if (tab === 'trades') {
    const sorted = [...bt].sort(
      (a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
    )
    return (
      <div style={{ ...card, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ color: '#F5F5F5', fontSize: '0.92rem', fontWeight: 700 }}>
            Backtest Trades <span style={{ color: '#666', fontWeight: 500 }}>({sorted.length})</span>
          </span>
          <button onClick={goImport} style={{ background: 'none', border: 'none', color: '#B98CE0', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
            Import more →
          </button>
        </div>

        {!sorted.length ? (
          <p style={{ color: '#666', fontSize: '0.86rem', padding: '30px 0', textAlign: 'center' }}>
            No backtest trades yet — import a CSV to get started.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr>
                  {['Date', 'Symbol', 'Side', 'Result', 'Net P&L'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Net P&L' ? 'right' : 'left', color: '#6A6A6A', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 10px 10px 0', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => {
                  const pnl = parseFloat(t.netPnl) || 0
                  const rc = t.result === 'Win' ? '#4CAF7D' : t.result === 'Loss' ? '#E05252' : '#888'
                  return (
                    <tr key={t.id || i} style={{ borderTop: '1px solid #262626' }}>
                      <td style={{ padding: '10px 10px 10px 0', color: '#A8A8A8' }}>{String(t.date || '').slice(0, 10) || '—'}</td>
                      <td style={{ padding: '10px 10px 10px 0', color: '#E4E4E4', fontWeight: 600 }}>{t.symbol || '—'}</td>
                      <td style={{ padding: '10px 10px 10px 0', color: '#8A8A8A' }}>{t.direction || '—'}</td>
                      <td style={{ padding: '10px 10px 10px 0', color: rc, fontWeight: 600 }}>{t.result || '—'}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnl >= 0 ? '#4CAF7D' : '#E05252' }}>{money(pnl)}</td>
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

  /* import — its own area, separate from the live Log Trade importer */
  return (
    <BacktestCsvImport onDone={() => navigate('/app/backtest')} />
  )
}
