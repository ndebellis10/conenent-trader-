import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { NB_THEME as T } from '../../../lib/notebookStore'

/* P&L summary for the note's day, pulled from the trades store. */
export default function SummaryCard({ pnl, trades, winRate }) {
  const [open, setOpen] = useState(true)
  const pos = pnl >= 0
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, display: 'flex' }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div>
          <div style={{ color: T.textDim, fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net P&L</div>
          {open && (
            <>
              <div style={{ color: pos ? T.green : T.red, fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.7rem', lineHeight: 1.15, marginTop: 2 }}>
                {pos ? '' : '-'}${Math.abs(pnl).toFixed(2)}
              </div>
              <div style={{ color: T.textDim, fontSize: '0.78rem', marginTop: 3 }}>
                {trades} trade{trades !== 1 ? 's' : ''} · {winRate}% win rate
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
