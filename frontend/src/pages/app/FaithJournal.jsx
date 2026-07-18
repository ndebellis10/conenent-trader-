import { useState } from 'react'
import { useTradeStore } from '../../store/tradeStore'
import { format } from 'date-fns'
import { PlusCircle, BookOpen } from 'lucide-react'

const DAILY_VERSE = { text: "The plans of the diligent lead to profit as surely as haste leads to poverty.", ref: "Proverbs 21:5" }
const TRADERS_PRAYER = `Lord, as I sit before these markets today, I ask for wisdom over profit and patience over haste. Let me trade with discipline, not fear. With clarity, not confusion. Help me to remember that every gain is a blessing and every loss a lesson. May I honor You with every decision I make today. Amen.`
const moods = [{ label: 'Grateful', icon: '🙏' }, { label: 'Peaceful', icon: '☮' }, { label: 'Hopeful', icon: '✨' }, { label: 'Struggling', icon: '🌧' }, { label: 'Faithful', icon: '✝' }]

export default function FaithJournal() {
  const { journalEntries, addJournalEntry } = useTradeStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', mood: '', tags: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.body.trim()) return
    addJournalEntry({ ...form, date: new Date().toISOString() })
    setForm({ title: '', body: '', mood: '', tags: '' })
    setShowForm(false)
  }

  const inputStyle = { width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '8px', padding: '10px 14px', color: '#F5F5F5', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none' }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Faith Journal</h1>

      {/* Daily Verse */}
      <div style={{ background: 'linear-gradient(135deg, #2A1F0A, #242424)', borderRadius: '12px', border: '1px solid #3B82F6', padding: '24px', textAlign: 'center' }}>
        <div style={{ color: '#3B82F6', fontSize: '1.5rem', marginBottom: '8px' }}>✝</div>
        <div style={{ color: '#A0A0A0', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verse of the Day</div>
        <blockquote style={{ fontFamily: 'Poppins, sans-serif', fontStyle: 'italic', color: '#3B82F6', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '8px' }}>
          "{DAILY_VERSE.text}"
        </blockquote>
        <cite style={{ color: '#2563EB', fontSize: '0.85rem' }}>— {DAILY_VERSE.ref}</cite>
        <p style={{ color: '#666', fontSize: '0.82rem', marginTop: '12px' }}>Reflection: How does this verse speak to your trading today?</p>
      </div>

      {/* Trader's Prayer */}
      <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
        <h3 style={{ fontFamily: 'Poppins, sans-serif', color: '#3B82F6', fontWeight: 600, marginBottom: '16px' }}>The Trader's Prayer</h3>
        <p style={{ fontFamily: 'Poppins, sans-serif', fontStyle: 'italic', color: '#A0A0A0', lineHeight: 1.8, fontSize: '0.9rem' }}>{TRADERS_PRAYER}</p>
      </div>

      {/* New Entry button */}
      <button onClick={() => setShowForm(!showForm)} className="btn-gold" style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', width: 'fit-content' }}>
        <PlusCircle size={16} /> New Journal Entry
      </button>

      {showForm && (
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6', padding: '24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Title (optional)</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Entry title..." style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Journal Entry *</label>
              <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={6} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Pour your heart out..." />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '10px' }}>Spiritual State</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {moods.map(m => (
                  <button key={m.label} type="button" onClick={() => setForm({...form, mood: m.label})}
                    style={{ padding: '8px 14px', borderRadius: '999px', border: `1px solid ${form.mood === m.label ? '#3B82F6' : '#3A3A3A'}`, background: form.mood === m.label ? 'rgba(59,130,246,0.15)' : 'transparent', color: form.mood === m.label ? '#3B82F6' : '#A0A0A0', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Save Entry</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #3A3A3A', background: 'transparent', color: '#A0A0A0', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Past entries */}
      {journalEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <BookOpen size={40} style={{ margin: '0 auto 12px' }} color="#3A3A3A" />
          <p>No journal entries yet. Write your first one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {journalEntries.map(entry => (
            <div key={entry.id} style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', borderLeft: '3px solid #3B82F6', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ color: '#F5F5F5', fontWeight: 600, margin: '0 0 4px', fontSize: '0.95rem' }}>{entry.title || 'Journal Entry'}</h3>
                  <span style={{ color: '#666', fontSize: '0.78rem' }}>{format(new Date(entry.createdAt), 'MMMM d, yyyy')}</span>
                </div>
                {entry.mood && <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem' }}>{entry.mood}</span>}
              </div>
              <p style={{ color: '#A0A0A0', lineHeight: 1.7, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{entry.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
