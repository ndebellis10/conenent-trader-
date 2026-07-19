import { useState } from 'react'
import { Plus, Trash2, HelpCircle } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import {
  OPTION_PRESETS, getCustomQuestions, withQuestionAdded, withQuestionRemoved, analyseQuestion,
} from '../../lib/customQuestions'

/* Add-your-own questions for a report tab. Questions added here appear on the
   Log Trade form and are broken down below by answer. */

const card = { background: '#1E1E1E', borderRadius: '12px', border: '1px solid #2A2A2A', padding: '20px 22px' }

export default function CustomQuestions({ category, accent = '#3B82F6', trades = [] }) {
  const { settings, updateSettings } = useTradeStore()
  const questions = getCustomQuestions(settings, category)

  const [adding, setAdding] = useState(false)
  const [label, setLabel]   = useState('')
  const [preset, setPreset] = useState(OPTION_PRESETS[0].id)

  const add = () => {
    const opts = OPTION_PRESETS.find(p => p.id === preset)?.options
    const next = withQuestionAdded(settings, category, label, opts)
    if (!next) return           // blank or duplicate
    updateSettings({ customQuestions: next })
    setLabel(''); setAdding(false)
  }

  const remove = (id) => updateSettings({ customQuestions: withQuestionRemoved(settings, category, id) })

  const title = category === 'psychology' ? 'Your Psychology Questions' : 'Your Execution Questions'
  const input = { background: '#2A2A2A', border: '1px solid #3A3A3A', borderRadius: 8, padding: '9px 12px', color: '#F5F5F5', fontSize: '0.86rem', outline: 'none', fontFamily: 'Inter, sans-serif' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6, flexWrap: 'wrap' }}>
        <HelpCircle size={15} color={accent} />
        <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700 }}>{title}</span>
        {!adding && (
          <button onClick={() => setAdding(true)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: `${accent}1F`, border: `1px solid ${accent}55`, color: accent, borderRadius: 8, padding: '6px 13px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={13} /> Add question
          </button>
        )}
      </div>
      <p style={{ color: '#777', fontSize: '0.8rem', margin: '0 0 16px', lineHeight: 1.6 }}>
        Questions you add here show up on the Log Trade form and are broken down by answer below.
      </p>

      {adding && (
        <div style={{ background: '#191919', border: '1px solid #2E2E2E', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') { setAdding(false); setLabel('') } }}
            placeholder={category === 'psychology' ? 'e.g. Did you trade tired?' : 'e.g. Did you wait for the candle close?'}
            style={{ ...input, width: '100%', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {OPTION_PRESETS.map(p => (
              <button key={p.id} onClick={() => setPreset(p.id)}
                style={{
                  border: `1px solid ${preset === p.id ? accent : '#333'}`,
                  background: preset === p.id ? `${accent}18` : 'transparent',
                  color: preset === p.id ? accent : '#888',
                  borderRadius: 999, padding: '6px 13px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
                }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} disabled={!label.trim()}
              style={{ background: label.trim() ? accent : '#242424', border: 'none', color: label.trim() ? '#0B1220' : '#444', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700, cursor: label.trim() ? 'pointer' : 'not-allowed' }}>
              Add
            </button>
            <button onClick={() => { setAdding(false); setLabel('') }}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!questions.length ? (
        <p style={{ color: '#5A5A5A', fontSize: '0.83rem', margin: 0, padding: '8px 0' }}>
          No custom questions yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {questions.map(q => {
            const a = analyseQuestion(trades, q)
            return (
              <div key={q.id} style={{ background: '#191919', border: '1px solid #2A2A2A', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: a.answered ? 12 : 0 }}>
                  <span style={{ color: '#E4E4E4', fontSize: '0.85rem', fontWeight: 600, flex: 1, minWidth: 0 }}>{q.label}</span>
                  <span style={{ color: '#5E5E5E', fontSize: '0.73rem', flexShrink: 0 }}>
                    {a.answered ? `${a.answered} answered` : 'no answers yet'}
                  </span>
                  <button onClick={() => remove(q.id)} title="Remove question"
                    style={{ background: 'none', border: 'none', color: '#4A4A4A', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#E05252' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#4A4A4A' }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                {a.answered > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {a.buckets.filter(b => b.n > 0).map(b => (
                      <div key={b.option} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ color: '#B0B0B0', fontSize: '0.79rem', width: 84, flexShrink: 0 }}>{b.option}</span>
                        <span style={{ color: '#6E6E6E', fontSize: '0.73rem', width: 54, flexShrink: 0 }}>{b.n} trade{b.n !== 1 ? 's' : ''}</span>
                        <div style={{ flex: 1, minWidth: 40, height: 6, background: '#242424', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${b.winRate}%`, height: '100%', background: b.winRate >= 50 ? '#4CAF7D' : '#E05252', borderRadius: 3 }} />
                        </div>
                        <span style={{ color: '#999', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', width: 40, flexShrink: 0, textAlign: 'right' }}>
                          {b.winRate.toFixed(0)}%
                        </span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.79rem', fontWeight: 700, width: 84, textAlign: 'right', flexShrink: 0, color: b.pnl >= 0 ? '#4CAF7D' : '#E05252' }}>
                          {b.pnl >= 0 ? '+' : '-'}${Math.abs(b.pnl).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
