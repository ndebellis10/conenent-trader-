import { useState, useMemo } from 'react'
import { useGoalStore } from '../../store/goalStore'
import { format, subDays } from 'date-fns'
import { PlusCircle, Trash2, Pencil, Check, X } from 'lucide-react'

const TODAY = format(new Date(), 'yyyy-MM-dd')

/* ── Circular progress ring ── */
function Ring({ pct, size = 96, stroke = 8 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct === 100 ? '#4CAF7D' : pct >= 50 ? '#3B82F6' : '#E05252'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2A2A" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

/* ── Single goal row ── */
function GoalRow({ goal, done, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(goal.text)

  const save = () => {
    if (draft.trim()) onEdit(goal.id, draft.trim())
    setEditing(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 20px',
      background: done ? 'rgba(76,175,125,0.04)' : '#242424',
      borderRadius: '10px',
      border: `1px solid ${done ? 'rgba(76,175,125,0.2)' : '#3A3A3A'}`,
      transition: 'all 0.2s',
    }}>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(goal.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: '6px',
          border: `2px solid ${done ? '#4CAF7D' : '#444'}`,
          background: done ? '#4CAF7D' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {done && <Check size={13} color="#1A1A1A" strokeWidth={3} />}
        </div>
      </button>

      {/* Text or edit input */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          style={{
            flex: 1, background: '#1A1A1A', border: '1px solid #3B82F6',
            borderRadius: '6px', color: '#F5F5F5', fontSize: '0.9rem',
            padding: '6px 10px', outline: 'none',
          }}
        />
      ) : (
        <span style={{
          flex: 1, fontSize: '0.9rem', fontWeight: 500,
          color: done ? '#555' : '#E0E0E0',
          textDecoration: done ? 'line-through' : 'none',
          transition: 'all 0.2s',
        }}>
          {goal.text}
        </span>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {editing ? (
          <>
            <button onClick={save} style={{ background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.3)', borderRadius: '6px', color: '#4CAF7D', cursor: 'pointer', padding: '4px 8px' }}>
              <Check size={13} />
            </button>
            <button onClick={() => setEditing(false)} style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: '6px', color: '#E05252', cursor: 'pointer', padding: '4px 8px' }}>
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setDraft(goal.text); setEditing(true) }}
              style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#3B82F6'}
              onMouseLeave={e => e.currentTarget.style.color = '#444'}
            >
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(goal.id)}
              style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#E05252'}
              onMouseLeave={e => e.currentTarget.style.color = '#444'}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function DailyGoals() {
  const { goals, completions, addGoal, deleteGoal, editGoal, toggleCompletion } = useGoalStore()
  const [newText, setNewText] = useState('')

  const todayDone = completions[TODAY] || []
  const completedCount = goals.filter(g => todayDone.includes(g.id)).length
  const pct = goals.length ? Math.round((completedCount / goals.length) * 100) : 0
  const allDone = goals.length > 0 && completedCount === goals.length

  const handleAdd = () => {
    if (!newText.trim()) return
    addGoal(newText.trim())
    setNewText('')
  }

  // Last 7 days history
  const history = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const key = format(d, 'yyyy-MM-dd')
    const done = (completions[key] || []).filter(id => goals.some(g => g.id === id)).length
    const total = goals.length
    const pct = total ? Math.round((done / total) * 100) : 0
    return { key, label: i === 6 ? 'Today' : format(d, 'EEE'), done, total, pct }
  }), [completions, goals])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>
            Daily Goals
          </h1>
          <p style={{ color: '#666', fontSize: '0.82rem', margin: '4px 0 0' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Progress ring + summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#242424', border: '1px solid #3A3A3A', borderRadius: '14px', padding: '14px 20px' }}>
          <div style={{ position: 'relative' }}>
            <Ring pct={pct} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '0.9rem', color: pct === 100 ? '#4CAF7D' : '#3B82F6' }}>{pct}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.3rem', color: pct === 100 ? '#4CAF7D' : '#F5F5F5' }}>
              {completedCount} <span style={{ color: '#444', fontSize: '1rem' }}>/</span> {goals.length}
            </div>
            <div style={{ color: '#666', fontSize: '0.72rem', marginTop: '2px' }}>goals completed today</div>
            {allDone && (
              <div style={{ color: '#4CAF7D', fontSize: '0.72rem', fontWeight: 600, marginTop: '4px' }}>✝ All done — well done!</div>
            )}
          </div>
        </div>
      </div>

      {/* Add goal */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a new daily goal..."
          style={{
            flex: 1, background: '#242424', border: '1px solid #3A3A3A',
            borderRadius: '10px', color: '#F5F5F5', fontSize: '0.9rem',
            padding: '12px 16px', outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = '#3B82F6'}
          onBlur={e => e.target.style.borderColor = '#3A3A3A'}
        />
        <button
          onClick={handleAdd}
          className="btn-gold"
          style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', flexShrink: 0 }}
        >
          <PlusCircle size={15} /> Add Goal
        </button>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✝</div>
          <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>
            No goals yet. Add something you want to accomplish today.
          </p>
          <p style={{ color: '#444', fontSize: '0.78rem', marginTop: '8px', fontStyle: 'italic' }}>
            "Commit to the LORD whatever you do, and he will establish your plans." — Proverbs 16:3
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Pending */}
          {goals.filter(g => !todayDone.includes(g.id)).map(goal => (
            <GoalRow key={goal.id} goal={goal} done={false}
              onToggle={id => toggleCompletion(id, TODAY)}
              onDelete={deleteGoal} onEdit={editGoal}
            />
          ))}

          {/* Completed section */}
          {goals.filter(g => todayDone.includes(g.id)).length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0 4px' }}>
                <div style={{ height: '1px', flex: 1, background: '#2A2A2A' }} />
                <span style={{ color: '#3A3A3A', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Completed ({goals.filter(g => todayDone.includes(g.id)).length})
                </span>
                <div style={{ height: '1px', flex: 1, background: '#2A2A2A' }} />
              </div>
              {goals.filter(g => todayDone.includes(g.id)).map(goal => (
                <GoalRow key={goal.id} goal={goal} done={true}
                  onToggle={id => toggleCompletion(id, TODAY)}
                  onDelete={deleteGoal} onEdit={editGoal}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* 7-day history */}
      {goals.length > 0 && (
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '20px' }}>
          <h3 style={{ color: '#F5F5F5', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 16px' }}>7-Day Completion</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {history.map(d => {
              const barColor = d.pct === 100 ? '#4CAF7D' : d.pct >= 50 ? '#3B82F6' : d.pct > 0 ? '#E05252' : '#2A2A2A'
              const isToday = d.key === TODAY
              return (
                <div key={d.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '100%', height: '80px', background: '#1A1A1A', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: `${d.pct}%`, background: barColor,
                      borderRadius: '6px 6px 0 0', opacity: 0.85,
                      transition: 'height 0.4s ease',
                    }} />
                  </div>
                  <div style={{ color: isToday ? '#3B82F6' : '#555', fontSize: '0.68rem', fontWeight: isToday ? 700 : 400 }}>{d.label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: d.pct > 0 ? barColor : '#333', fontWeight: 700 }}>
                    {d.total ? `${d.done}/${d.total}` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
