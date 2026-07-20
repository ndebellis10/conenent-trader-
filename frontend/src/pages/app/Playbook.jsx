import { useEffect, useRef, useState } from 'react'
import { PlusCircle, Trash2, BookOpen, Sparkles, ChevronRight } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { COVENANT_STRATEGY, hasCovenantStrategy, ensureCovenantSeeded } from '../../lib/covenantPlaybook'
import { useAuth } from '../../contexts/AuthContext'

export default function Playbook() {
  const { playbook, addPlaybookStrategy, deletePlaybookStrategy, trades } = useTradeStore()
  const email = useAuth().user?.email || null
  const [showForm, setShowForm] = useState(false)
  const seededRef = useRef(false)
  const [open, setOpen] = useState(() => new Set())
  const toggleOpen = id => setOpen(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxWidth: 760 }}>
          {playbook.map(s => {
            const stats = getStats(s.name)
            return (
              <div key={s.id} style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6', padding: '14px 16px' }}>
                {/* Collapsed by default — click the header to reveal the rules */}
                <div
                  onClick={() => toggleOpen(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                >
                  <ChevronRight
                    size={15}
                    color="#6A6A6A"
                    style={{ flexShrink: 0, transition: 'transform .18s', transform: open.has(s.id) ? 'rotate(90deg)' : 'none' }}
                  />
                  <h3 style={{ fontFamily: 'Poppins, sans-serif', color: '#F5F5F5', fontSize: '0.92rem', fontWeight: 600, margin: 0, flex: 1, minWidth: 0 }}>{s.name}</h3>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#3B82F6', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>{stats.count}</span>
                  <span style={{ color: '#555', fontSize: '0.72rem', flexShrink: 0 }}>trades</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4CAF7D', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>{stats.winRate}%</span>
                  <button
                    onClick={e => { e.stopPropagation(); deletePlaybookStrategy(s.id) }}
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px', flexShrink: 0, display: 'flex' }}
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {open.has(s.id) && (
                  <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid #303030' }}>
                    {s.description && <p style={{ color: '#9A9A9A', fontSize: '0.83rem', margin: '0 0 14px', lineHeight: 1.6 }}>{s.description}</p>}
                    {[
                      ['entryRules', 'Entry Rules', '#3B82F6'],
                      ['exitRules',  'Exit Rules',  '#4CAF7D'],
                      ['riskRules',  'Risk Rules',  '#E0A752'],
                    ].map(([key, label, color]) => (
                      s[key] ? (
                        <div key={key} style={{ marginBottom: '12px' }}>
                          <div style={{ color, fontSize: '0.7rem', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                          <p style={{ color: '#A0A0A0', fontSize: '0.81rem', margin: 0, whiteSpace: 'pre-line', lineHeight: 1.65 }}>{s[key]}</p>
                        </div>
                      ) : null
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
