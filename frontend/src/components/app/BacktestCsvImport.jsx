import { useRef, useState } from 'react'
import { Upload, Loader2, AlertTriangle, FlaskConical, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTradeStore } from '../../store/tradeStore'
import { parseTradeCSV, extractCsvData, buildAutoMapping, tradesFromMapping } from '../../lib/csvImport'
import { BACKTEST_TAG } from '../../lib/tradeFilters'

/* Backtest CSV import — deliberately separate from the Log Trade importer.
   Everything imported here is tagged 'Backtest' and stays out of live P&L,
   the Covenant Score and leaderboard rank. */

const PURPLE = '#B98CE0'

export default function BacktestCsvImport({ onDone }) {
  const { addTrade } = useTradeStore()
  const fileRef = useRef(null)
  const [parsed, setParsed]     = useState([])
  const [error, setError]       = useState(null)
  const [busy, setBusy]         = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')

  async function handleFile(file) {
    if (!file) return
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setError('That does not look like a CSV file.')
      return
    }
    setBusy(true); setError(null); setParsed([]); setFileName(file.name)
    try {
      const text = await file.text()

      // Try the smart parser first, then fall back to header auto-mapping
      let trades = []
      const direct = parseTradeCSV(text)
      if (direct?.trades?.length) {
        trades = direct.trades
      } else {
        const raw = extractCsvData(text)
        if (raw) {
          const mapping = buildAutoMapping(raw.normHeaders || [])
          const mapped  = tradesFromMapping(raw.rows, mapping)
          trades = mapped?.trades || []
        }
      }

      if (!trades.length) {
        setError(direct?.error || 'No trades could be read from that file. Check it has date, symbol and P&L columns.')
      } else {
        setParsed(trades)
      }
    } catch {
      setError('Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  function importAll() {
    parsed.forEach(t => addTrade({ ...t, tags: [...(t.tags || []), BACKTEST_TAG] }))
    toast.success(`${parsed.length} backtest trade${parsed.length !== 1 ? 's' : ''} imported.`)
    setParsed([]); setFileName('')
    onDone?.()
  }

  const card = { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 14, padding: '22px 24px' }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...card, borderColor: 'rgba(185,140,224,0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <FlaskConical size={17} color={PURPLE} />
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.02rem', color: '#F5F5F5', margin: 0 }}>
            Import Backtest CSV
          </h2>
        </div>
        <p style={{ color: '#888', fontSize: '0.83rem', margin: '0 0 16px', lineHeight: 1.6 }}>
          These stay separate from your live trades — tagged <strong style={{ color: PURPLE }}>Backtest</strong> and
          reported only on the Backtesting dashboard.
        </p>

        {!parsed.length && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? PURPLE : '#3A3A3A'}`,
              borderRadius: 12, padding: '34px 24px', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(185,140,224,0.05)' : 'transparent', transition: 'all .2s',
            }}
          >
            {busy ? (
              <>
                <Loader2 size={24} color={PURPLE} style={{ display: 'block', margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#A0A0A0', fontSize: '0.87rem', margin: 0 }}>Reading {fileName}…</p>
              </>
            ) : (
              <>
                <Upload size={24} color={dragOver ? PURPLE : '#444'} style={{ display: 'block', margin: '0 auto 10px' }} />
                <p style={{ color: '#A0A0A0', fontSize: '0.88rem', margin: '0 0 4px' }}>
                  Drop your backtest CSV here or <span style={{ color: PURPLE, fontWeight: 700 }}>click to browse</span>
                </p>
                <p style={{ color: '#555', fontSize: '0.76rem', margin: 0 }}>Needs date, symbol and P&amp;L columns</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
              onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 9, padding: '11px 14px', color: '#E05252', fontSize: '0.82rem' }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}
      </div>

      {parsed.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700 }}>
              {parsed.length} trade{parsed.length !== 1 ? 's' : ''} ready
              <span style={{ color: '#666', fontWeight: 500 }}> from {fileName}</span>
            </span>
            <button onClick={() => { setParsed([]); setFileName('') }}
              style={{ background: 'none', border: 'none', color: '#777', fontSize: '0.79rem', fontWeight: 600, cursor: 'pointer' }}>
              Choose a different file
            </button>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  {['Date', 'Symbol', 'Side', 'Result', 'Net P&L'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Net P&L' ? 'right' : 'left', color: '#6A6A6A', fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 10px 9px 0', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 10).map((t, i) => {
                  const pnl = parseFloat(t.netPnl) || 0
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #262626' }}>
                      <td style={{ padding: '9px 10px 9px 0', color: '#A8A8A8' }}>{String(t.date || '').slice(0, 10) || '—'}</td>
                      <td style={{ padding: '9px 10px 9px 0', color: '#E4E4E4', fontWeight: 600 }}>{t.symbol || '—'}</td>
                      <td style={{ padding: '9px 10px 9px 0', color: '#8A8A8A' }}>{t.direction || '—'}</td>
                      <td style={{ padding: '9px 10px 9px 0', color: t.result === 'Win' ? '#4CAF7D' : t.result === 'Loss' ? '#E05252' : '#888', fontWeight: 600 }}>{t.result || '—'}</td>
                      <td style={{ padding: '9px 0', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnl >= 0 ? '#4CAF7D' : '#E05252' }}>
                        {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
                {parsed.length > 10 && (
                  <tr><td colSpan={5} style={{ padding: '9px 0', color: '#555', textAlign: 'center', fontStyle: 'italic' }}>+ {parsed.length - 10} more…</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <button onClick={importAll}
            style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: '#3B82F6', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CheckCircle size={16} /> Import {parsed.length} trade{parsed.length !== 1 ? 's' : ''} as backtest
          </button>
        </div>
      )}
    </div>
  )
}
