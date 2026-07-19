import { useEffect, useRef, useState } from 'react'
import { PlusCircle, Trash2, BookOpen, Sparkles } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { COVENANT_SEED_FLAG, COVENANT_STRATEGIES, missingCovenantStrategies } from '../../lib/covenantPlaybook'

export default function Playbook() {
  const { playbook, addPlaybookStrategy, deletePlaybookStrategy, trades } = useTradeStore()
  const [showForm, setShowForm] = useState(false)
  const seededRef = useRef(false)

  /* Seed the Covenant model once so the playbook isn't empty and the rules
     live where trades get logged. Runs a single time per user — deleting a
     strategy afterwards is respected and it won't come back. */
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (localStorage.getItem(COVENANT_SEED_FLAG)) return
    localStorage.setItem(COVENANT_SEED_FLAG, '1')
    // Oldest last so the core PDI strategy ends up on top
    ;[...COVENANT_STRATEGIES].reverse().forEach(addPlaybookStrategy)
  }, [addPlaybookStrategy])

  const missing = missingCovenantStrategies(playbook)
  const restoreCovenant = () => {
    ;[...missing].reverse().forEach(addPlaybookStrategy)
  }
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
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Trade Playbook</h1>
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

      {missing.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, flexWrap: 'wrap' }}>
          <Sparkles size={15} color="#3B82F6" />
          <span style={{ color: '#C8C8C8', fontSize: '0.83rem' }}>
            {missing.length === COVENANT_STRATEGIES.length
              ? 'Add the Covenant model to your playbook — PDI, AMD and the pre-market routine.'
              : `${missing.length} Covenant strateg${missing.length === 1 ? 'y is' : 'ies are'} missing from your playbook.`}
          </span>
          <button onClick={restoreCovenant}
            style={{ marginLeft: 'auto', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#3B82F6', borderRadius: 8, padding: '7px 14px', fontSize: '0.79rem', fontWeight: 700, cursor: 'pointer' }}>
            Add Covenant model
          </button>
        </div>
      )}

      {!playbook.length ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <BookOpen size={48} color="#3A3A3A" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#A0A0A0' }}>Your playbook is empty. Add your first strategy!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {playbook.map(s => {
            const stats = getStats(s.name)
            return (
              <div key={s.id} style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontFamily: 'Poppins, sans-serif', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600, margin: 0 }}>{s.name}</h3>
                  <button onClick={() => deletePlaybookStrategy(s.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '2px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {s.description && <p style={{ color: '#A0A0A0', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.5 }}>{s.description}</p>}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ background: '#1A1A1A', borderRadius: '8px', padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                    <div style={{ color: '#A0A0A0', fontSize: '0.72rem', marginBottom: '2px' }}>Trades</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#3B82F6', fontWeight: 700 }}>{stats.count}</div>
                  </div>
                  <div style={{ background: '#1A1A1A', borderRadius: '8px', padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                    <div style={{ color: '#A0A0A0', fontSize: '0.72rem', marginBottom: '2px' }}>Win Rate</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4CAF7D', fontWeight: 700 }}>{stats.winRate}%</div>
                  </div>
                </div>
                {/* All three rule sets — exit and risk were collected by the form
                    but never rendered, so anything written there was invisible.
                    pre-line keeps multi-line rules readable. */}
                {[
                  ['entryRules', 'Entry Rules', '#3B82F6'],
                  ['exitRules',  'Exit Rules',  '#4CAF7D'],
                  ['riskRules',  'Risk Rules',  '#E0A752'],
                ].map(([key, label, color]) => (
                  s[key] ? (
                    <div key={key} style={{ marginBottom: '10px' }}>
                      <div style={{ color, fontSize: '0.72rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                      <p style={{ color: '#A0A0A0', fontSize: '0.82rem', margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{s[key]}</p>
                    </div>
                  ) : null
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
