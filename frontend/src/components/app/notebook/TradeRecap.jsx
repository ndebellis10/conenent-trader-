import { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, Layers } from 'lucide-react'
import { NB_THEME as T } from '../../../lib/notebookStore'
import { tradeDurationMs, formatDuration } from '../../../lib/tradeTime'

/* A read-only recap of every trade logged on the note's day — a refresher that
   surfaces *everything* the user picked/wrote on the Log Trade form (setup,
   ratings, confluences, execution + psychology answers, review, faith notes),
   so the notebook mirrors the log-trade section. Empty fields are skipped. */

const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n }
const money = v => { const n = num(v); return n == null ? null : `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(2)}` }
const has = v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
const yn = v => (v === true || v === 'yes' || v === 'Yes') ? 'Yes' : (v === false || v === 'no' || v === 'No') ? 'No' : v

// Human labels for the many stored fields
const LABELS = {
  tradingSession: 'Session', htfBias: 'HTF Bias', marketStructure: 'Structure',
  setupType: 'Setup', newsEvent: 'News', timeframe: 'Timeframe', assetClass: 'Asset',
  entryPrice: 'Entry', exitPrice: 'Exit', stopLoss: 'Stop', takeProfit: 'Target',
  riskReward: 'R:R', commission: 'Commission', accountsTraded: 'Accounts',
  faithRating: 'Faith', entryQuality: 'Entry quality', exitQuality: 'Exit quality',
  waitedConfirmation: 'Waited for confirmation', enteredAtLevel: 'Entered at level',
  exitDecision: 'Exit decision', rushedEntry: 'Rushed entry', protectedStop: 'Protected stop',
  targetedLiquidity: 'Targeted liquidity', sleepQuality: 'Sleep', focusLevel: 'Focus',
  revengeTrade: 'Revenge trade', stressLevel: 'Stress', energyLevel: 'Energy',
  movedStopFear: 'Moved stop (fear)', followedPlan: 'Followed plan', movedStop: 'Moved stop',
  overRisked: 'Over-risked', wentWell: 'What went well', toImprove: 'To improve',
  takeAgain: 'Take again', preTrade: 'Pre-trade feeling', postTrade: 'Post-trade feeling',
  mindsetNotes: 'Mindset', tradeNotes: 'Notes', strategyName: 'Strategy',
  scripture: 'Scripture', prayer: 'Prayer', gratitude: 'Gratitude',
}

const GROUPS = [
  { title: 'Market context', keys: ['tradingSession', 'htfBias', 'marketStructure', 'setupType', 'newsEvent', 'timeframe', 'assetClass'] },
  { title: 'Prices & risk', keys: ['entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'riskReward', 'commission', 'accountsTraded'] },
  { title: 'Quality ratings', keys: ['faithRating', 'entryQuality', 'exitQuality'] },
  { title: 'Execution', keys: ['waitedConfirmation', 'enteredAtLevel', 'exitDecision', 'rushedEntry', 'protectedStop', 'targetedLiquidity'] },
  { title: 'Psychology', keys: ['sleepQuality', 'focusLevel', 'revengeTrade', 'stressLevel', 'energyLevel', 'movedStopFear'] },
  { title: 'Plan discipline', keys: ['followedPlan', 'movedStop', 'overRisked'] },
]
// Longer free-text fields render full-width below the grid
const TEXT_FIELDS = ['wentWell', 'toImprove', 'takeAgain', 'preTrade', 'postTrade', 'mindsetNotes', 'tradeNotes', 'strategyName', 'scripture', 'prayer', 'gratitude']

function TradeCard({ t }) {
  const [open, setOpen] = useState(false)
  const pnl = num(t.netPnl)
  const pos = (pnl || 0) >= 0
  const dur = tradeDurationMs(t)

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', background: T.panel2 }}>
      {/* Header row — always visible */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        {open ? <ChevronDown size={15} color={T.textDim} /> : <ChevronRight size={15} color={T.textDim} />}
        <span style={{ color: T.text, fontWeight: 700, fontSize: '0.9rem' }}>{t.symbol || '—'}</span>
        {has(t.direction) && (
          <span style={{ color: t.direction === 'Long' ? T.green : T.red, fontSize: '0.78rem', fontWeight: 600 }}>{t.direction}</span>
        )}
        {has(t.setupType) && <span style={{ color: T.textDim, fontSize: '0.76rem' }}>· {t.setupType}</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {dur != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.textDim, fontSize: '0.76rem' }}>
              <Clock size={12} /> {formatDuration(dur)}
            </span>
          )}
          {pnl != null && (
            <span style={{ color: pos ? T.green : T.red, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.9rem' }}>{money(pnl)}</span>
          )}
        </span>
      </button>

      {open && (
        <div style={{ padding: '4px 14px 14px', borderTop: `1px solid ${T.border}` }}>
          {/* time + size line */}
          <div style={{ color: T.textDim, fontSize: '0.76rem', margin: '10px 0 12px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {has(t.entryTime) && has(t.exitTime) && <span>{t.entryTime} → {t.exitTime}</span>}
            {has(t.positionSize) && <span>{t.positionSize} contract{Number(t.positionSize) !== 1 ? 's' : ''}</span>}
            {has(t.result) && <span>{t.result}</span>}
          </div>

          {GROUPS.map(g => {
            const rows = g.keys.filter(k => has(t[k]))
            if (!rows.length) return null
            return (
              <div key={g.title} style={{ marginBottom: 12 }}>
                <div style={{ color: T.accent, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{g.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px 16px' }}>
                  {rows.map(k => (
                    <div key={k} style={{ fontSize: '0.79rem' }}>
                      <span style={{ color: T.textDim }}>{LABELS[k] || k}: </span>
                      <span style={{ color: T.text, fontWeight: 600 }}>
                        {k === 'commission' ? money(t[k]) : String(yn(t[k]))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Confluences as chips */}
          {has(t.confluences) && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: T.accent, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Confluences</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Array.isArray(t.confluences) ? t.confluences : [t.confluences]).map((c, i) => (
                  <span key={i} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 999, padding: '2px 10px', fontSize: '0.74rem', color: T.text }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Custom review answers */}
          {t.customAnswers && Object.keys(t.customAnswers).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: T.accent, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your answers</div>
              {Object.entries(t.customAnswers).filter(([, v]) => has(v)).map(([q, v]) => (
                <div key={q} style={{ fontSize: '0.79rem', marginBottom: 3 }}>
                  <span style={{ color: T.textDim }}>{q}: </span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Free-text fields */}
          {TEXT_FIELDS.filter(k => has(t[k])).map(k => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ color: T.textDim, fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>{LABELS[k] || k}</div>
              <div style={{ color: T.text, fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{String(t[k])}</div>
            </div>
          ))}

          {has(t.chartImage) && (
            <img src={t.chartImage} alt="Chart" style={{ maxWidth: '100%', borderRadius: 8, border: `1px solid ${T.border}`, marginTop: 6 }} />
          )}
        </div>
      )}
    </div>
  )
}

export default function TradeRecap({ trades }) {
  const [open, setOpen] = useState(true)
  if (!trades || !trades.length) return null

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', color: T.text }}>
        {open ? <ChevronDown size={16} color={T.textDim} /> : <ChevronRight size={16} color={T.textDim} />}
        <Layers size={15} color={T.accent} />
        <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.03em' }}>Your log-trade recap</span>
        <span style={{ color: T.textDim, fontSize: '0.74rem', fontWeight: 500 }}>· {trades.length} trade{trades.length !== 1 ? 's' : ''} this day</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {trades.map((t, i) => <TradeCard key={t.id || i} t={t} />)}
        </div>
      )}
    </div>
  )
}
