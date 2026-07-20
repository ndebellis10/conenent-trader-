import { useEffect, useRef, useState } from 'react'
import { PlusCircle, Trash2, BookOpen, Sparkles, X } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { COVENANT_STRATEGY, hasCovenantStrategy, ensureCovenantSeeded } from '../../lib/covenantPlaybook'
import { useAuth } from '../../contexts/AuthContext'

export default function Playbook() {
  const { playbook, addPlaybookStrategy, deletePlaybookStrategy, trades } = useTradeStore()
  const email = useAuth().user?.email || null
  const [showForm, setShowForm] = useState(false)
  const seededRef = useRef(false)
  const [selected, setSelected] = useState(null)   // strategy shown in the modal

  /* Seeding now happens on app load (see AppLayout) so every account has the
     model whether or not they open this page. This is just a safety net for
     anyone who lands here first. */
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    ensureCovenantSeeded({ email, playbook, addPlaybookStrategy, deletePlaybookStrategy })
  }, [email, playbook, addPlaybookStrategy, deletePlaybookStrategy])

  const needsCovenant = !hasCovenantStrategy(playbook)
  const [form, setForm] = useState({ name: '', description: '', entryRules: '', exitRules: '', riskRules: '' })

  const getStats = (strategyName) => {
    const related = trades.filter(t => t.strategyName === strategyName)
    const wins = related.filter(t => t.result === 'Win').length
    return { count: related.length, winRate: related.length ? ((wins/related.length)*100).toFixed(0) : 0 }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    addPlaybookStrategy(form)
    setForm({ name: '', description: '', entryRules: '', exitRules: '', riskRules: '' })
    setShowForm(false)
  }

  const inputStyle = { width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '8px', padding: '10px 14px', color: '#F5F5F5', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Strategy</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <PlusCircle size={16} /> New Strategy
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#F5F5F5', marginBottom: '20px' }}>Add Strategy</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[['name','Strategy Name','e.g. Bull Flag Breakout'],['description','Description','Describe this strategy...']].map(([k,l,p]) => (
              <div key={k}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>{l}</label>
                {k === 'description' ? (
                  <textarea value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder={p} />
                ) : (
                  <input value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} placeholder={p} style={inputStyle} />
                )}
              </div>
            ))}
            {[['entryRules','Entry Rules'],['exitRules','Exit Rules'],['riskRules','Risk Rules']].map(([k,l]) => (
              <div key={k}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>{l}</label>
                <textarea value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder={`Define your ${l.toLowerCase()}...`} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Save Strategy</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #3A3A3A', background: 'transparent', color: '#A0A0A0', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {needsCovenant && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, flexWrap: 'wrap' }}>
          <Sparkles size={15} color="#3B82F6" />
          <span style={{ color: '#C8C8C8', fontSize: '0.83rem' }}>
            Add the Covenant model to your playbook.
          </span>
          <button onClick={() => addPlaybookStrategy(COVENANT_STRATEGY)}
            style={{ marginLeft: 'auto', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#3B82F6', borderRadius: 8, padding: '7px 14px', fontSize: '0.79rem', fontWeight: 700, cursor: 'pointer' }}>
            Add Covenant model
          </button>
        </div>
      )}

      {!playbook.length ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <BookOpen size={48} color="#3A3A3A" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#A0A0A0' }}>No strategies yet. Add your first one!</p>
        </div>
      ) : (
        /* Cards in a grid; the rules live in a modal so the page stays scannable */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {playbook.map(s => {
            const stats = getStats(s.name)
            return (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6', padding: '18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#3A3A3A'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h3 style={{ fontFamily: 'Poppins, sans-serif', color: '#F5F5F5', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{s.name}</h3>
                  <button
                    onClick={e => { e.stopPropagation(); deletePlaybookStrategy(s.id) }}
                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {s.description && (
                  <p style={{ color: '#888', fontSize: '0.8rem', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</p>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                  <span style={{ color: '#666', fontSize: '0.72rem' }}>Trades <b style={{ color: '#3B82F6' }}>{stats.count}</b></span>
                  <span style={{ color: '#666', fontSize: '0.72rem' }}>Win Rate <b style={{ color: '#4CAF7D' }}>{stats.winRate}%</b></span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#242424', borderRadius: 16, border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6', padding: 28, width: 560, maxWidth: '96vw', maxHeight: '86vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', color: '#F5F5F5', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '20px', margin: '14px 0 18px' }}>
              <div style={{ background: '#1A1A1A', borderRadius: '8px', padding: '10px 16px', flex: 1, textAlign: 'center' }}>
                <div style={{ color: '#A0A0A0', fontSize: '0.72rem', marginBottom: '2px' }}>Trades</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#3B82F6', fontWeight: 700 }}>{getStats(selected.name).count}</div>
              </div>
              <div style={{ background: '#1A1A1A', borderRadius: '8px', padding: '10px 16px', flex: 1, textAlign: 'center' }}>
                <div style={{ color: '#A0A0A0', fontSize: '0.72rem', marginBottom: '2px' }}>Win Rate</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4CAF7D', fontWeight: 700 }}>{getStats(selected.name).winRate}%</div>
              </div>
            </div>

            {selected.description && <p style={{ color: '#A0A0A0', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 18 }}>{selected.description}</p>}

            {[
              ['entryRules', 'Entry Rules'],
              ['exitRules',  'Exit Rules'],
              ['riskRules',  'Risk Rules'],
            ].map(([k, label]) => selected[k] && (
              <div key={k} style={{ marginBottom: '16px' }}>
                <div style={{ color: '#3B82F6', fontSize: '0.74rem', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <p style={{ color: '#C7CBD0', fontSize: '0.87rem', margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{selected[k]}</p>
              </div>
            ))}

            <button
              onClick={() => { deletePlaybookStrategy(selected.id); setSelected(null) }}
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(224,82,82,0.3)', background: 'rgba(224,82,82,0.08)', color: '#E05252', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              <Trash2 size={14} /> Delete Strategy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
