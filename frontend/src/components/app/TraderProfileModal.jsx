import { useState } from 'react'
import { X } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { visibleFields, profileProgress } from '../../lib/traderProfile'

const BLUE = '#3B82F6'

/* Short background questionnaire. Saves into settings.traderProfile, which
   rides along in Alan's context so his coaching starts informed. */
export default function TraderProfileModal({ open, onClose }) {
  const settings = useTradeStore(s => s.settings)
  const updateSettings = useTradeStore(s => s.updateSettings)
  const [draft, setDraft] = useState(() => ({ ...(settings?.traderProfile || {}) }))

  if (!open) return null

  const fields = visibleFields(draft)
  const { done, total } = profileProgress(draft)

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const save = () => { updateSettings({ traderProfile: draft }); onClose?.() }

  const inputStyle = {
    width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: 8,
    padding: '10px 14px', color: '#F5F5F5', fontSize: '0.88rem',
    fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#242424', borderRadius: 16, border: '1px solid #3A3A3A', borderTop: `3px solid ${BLUE}`, padding: 28, width: 560, maxWidth: '96vw', maxHeight: '86vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', color: '#F5F5F5', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Tell Alan about your trading</h2>
            <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 4 }}>
              He uses this to coach you specifically. Takes about a minute.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ color: BLUE, fontSize: '0.75rem', fontWeight: 700, margin: '14px 0 18px' }}>
          {done} of {total} answered
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: 7 }}>
                {f.label}{f.optional && <span style={{ color: '#5A5A5A' }}> (optional)</span>}
              </label>

              {f.type === 'choice' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {f.options.map(opt => {
                    const active = draft[f.key] === opt
                    return (
                      <button
                        key={opt}
                        onClick={() => set(f.key, active ? '' : opt)}
                        style={{
                          padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontSize: '0.79rem',
                          fontWeight: active ? 700 : 500,
                          border: `1px solid ${active ? BLUE : '#3A3A3A'}`,
                          background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                          color: active ? BLUE : '#A0A0A0',
                          transition: 'all .15s',
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              ) : f.type === 'longtext' ? (
                <textarea
                  value={draft[f.key] || ''} rows={2} placeholder={f.placeholder}
                  onChange={e => set(f.key, e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              ) : (
                <input
                  value={draft[f.key] || ''} placeholder={f.placeholder}
                  onChange={e => set(f.key, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={save} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, background: BLUE, color: '#fff' }}>
            Save
          </button>
          {/* Partial answers are still useful to Alan — never trap them here */}
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #3A3A3A', background: 'transparent', color: '#A0A0A0', cursor: 'pointer', fontSize: '0.88rem' }}>
            Finish later
          </button>
        </div>
      </div>
    </div>
  )
}
