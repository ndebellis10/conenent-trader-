import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  CalendarDays, Check, Star, Share2, MoreHorizontal, ChevronDown,
  Sparkles, LayoutTemplate, Plus, X, Trash2,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTradeStore } from '../../store/tradeStore'
import { useAdminStore } from '../../store/adminStore'
import {
  NB_THEME as T, loadNotebook, saveNotebook, newNote, countsByFolder,
  loadTemplates, saveTemplates,
} from '../../lib/notebookStore'
import Sidebar from '../../components/app/notebook/Sidebar'
import SummaryCard from '../../components/app/notebook/SummaryCard'
import TradeRecap from '../../components/app/notebook/TradeRecap'
import EditorToolbar from '../../components/app/notebook/EditorToolbar'
import Editor from '../../components/app/notebook/Editor'

const TEMPLATES = [
  { name: 'Daily Recap', html: '<b>Daily Recap</b><br>How I feel (1–10):<br>Followed my plan?:<br>What went well:<br>What to work on:<br>One thing to do better tomorrow:<br>' },
  { name: 'Pre-Market Plan', html: '<b>Pre-Market Plan</b><br>Bias:<br>Key levels:<br>News today:<br>My A+ setup:<br>Max loss limit:<br>' },
  { name: 'Trade Review', html: '<b>Trade Review</b><br>Symbol:<br>Direction:<br>Why I entered:<br>Result:<br>What I did well:<br>What I would change:<br>' },
  { name: 'Weekly Review', html: '<b>Weekly Review</b><br>P&L:<br>Win rate:<br>What is working:<br>Recurring mistakes:<br>Focus for next week:<br>' },
  { name: 'Mindset Check-in', html: '<b>Mindset Check-in</b><br>Head today (1–10):<br>Discipline or emotion?:<br>Grateful for:<br>Verse:<br>Prayer:<br>' },
]

export default function Notebook() {
  const { user } = useAuth()
  const email = user?.email || null
  const { trades } = useTradeStore()
  const viewingUser = useAdminStore(s => s.viewingUser)
  const accountLabel = viewingUser?.name || viewingUser?.email || 'All accounts'

  const [data, setData] = useState(() => loadNotebook(email))
  const [activeId, setActiveId] = useState(() => loadNotebook(email).notes[0]?.id || null)
  const [search, setSearch] = useState('')
  const [openFolders, setOpenFolders] = useState(() => new Set(['daily']))
  const [saved, setSaved] = useState(true)
  const [fontSize, setFontSize] = useState(14)
  const [showTemplates, setShowTemplates] = useState(false)
  const [customTemplates, setCustomTemplates] = useState(() => loadTemplates(email))

  const editorElRef = useRef(null)
  const saveTimer = useRef(null)

  const notes = data.notes
  const counts = useMemo(() => countsByFolder(notes), [notes])
  const active = notes.find(n => n.id === activeId) || null

  // Debounced persist — drives the "Saved" pill
  useEffect(() => {
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveNotebook(email, data); setSaved(true) }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [data, email])

  const patchActive = useCallback((patch) => {
    setData(d => ({
      ...d,
      notes: d.notes.map(n => n.id === activeId ? { ...n, ...patch, updated: new Date().toISOString() } : n),
    }))
  }, [activeId])

  const createNote = (folderId) => {
    const n = newNote(folderId)
    setData(d => ({ ...d, notes: [n, ...d.notes] }))
    setActiveId(n.id)
    setOpenFolders(prev => new Set(prev).add(folderId))
  }

  const deleteNote = (id) => {
    const note = notes.find(n => n.id === id)
    if (!note) return
    // Only nag if there's actual writing in it — strip tags to check for text
    const hasWriting = String(note.body || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
    if (hasWriting && !window.confirm('Are you sure you want to delete this note? This can’t be undone.')) return
    const remaining = notes.filter(n => n.id !== id)
    setData(d => ({ ...d, notes: d.notes.filter(n => n.id !== id) }))
    if (activeId === id) setActiveId(remaining[0]?.id || null)
  }

  const toggleFolder = id => setOpenFolders(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  // The day this note belongs to — fall back to the created date so even notes
  // saved before dateKey existed still resolve a day (and thus show P&L).
  const dayKey = active?.dateKey || String(active?.created || '').slice(0, 10) || null

  // Every trade logged on this note's day — powers both the P&L card and the
  // full log-trade recap below it.
  const dayTrades = useMemo(() => {
    if (!dayKey) return []
    return trades.filter(t => String(t.date || t.createdAt || t.created || '').slice(0, 10) === dayKey)
  }, [dayKey, trades])

  const dayStats = useMemo(() => {
    if (!dayKey) return null
    if (!dayTrades.length) return { pnl: 0, trades: 0, winRate: 0 }
    const pnl = dayTrades.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
    const wins = dayTrades.filter(t => t.result === 'Win').length
    return { pnl, trades: dayTrades.length, winRate: Math.round((wins / dayTrades.length) * 100) }
  }, [dayKey, dayTrades])

  // execCommand on the editor selection
  const cmd = useCallback((name, value) => {
    editorElRef.current?.focus()
    try { document.execCommand('styleWithCSS', false, true) } catch { /* older browsers */ }
    document.execCommand(name, false, value)
    if (editorElRef.current) patchActive({ body: editorElRef.current.innerHTML })
  }, [patchActive])

  const insertTemplate = (html) => {
    setShowTemplates(false)
    patchActive({ body: (active?.body || '') + html })
  }

  // Save the current note's content as a reusable template
  const saveAsTemplate = () => {
    const body = active?.body || ''
    if (!body.trim()) return
    const name = window.prompt('Name this template')
    if (!name) return
    const next = [...customTemplates, { id: `${Date.now()}`, name: name.trim(), html: body }]
    setCustomTemplates(next)
    saveTemplates(email, next)
    setShowTemplates(false)
  }

  const deleteTemplate = (id) => {
    const next = customTemplates.filter(t => t.id !== id)
    setCustomTemplates(next)
    saveTemplates(email, next)
  }

  if (!active) {
    return (
      <div style={{ ...shell }}>
        <Sidebar notes={notes} counts={counts} activeId={activeId} onSelect={setActiveId}
          onNewNote={createNote} onDelete={deleteNote} search={search} onSearch={setSearch}
          openFolders={openFolders} onToggleFolder={toggleFolder} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, flexDirection: 'column', gap: 14 }}>
          <p>No note selected.</p>
          <button onClick={() => createNote('daily')} style={primaryBtn}><Plus size={15} /> New note</button>
        </div>
      </div>
    )
  }

  const created = new Date(active.created).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const updated = new Date(active.updated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div style={shell}>
      <Sidebar notes={notes} counts={counts} activeId={activeId} onSelect={setActiveId}
        onNewNote={createNote} onDelete={deleteNote} search={search} onSearch={setSearch}
        openFolders={openFolders} onToggleFolder={toggleFolder} />

      {/* Main pane */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <CalendarDays size={20} color={T.textDim} />
          <input
            value={active.title}
            onChange={e => patchActive({ title: e.target.value })}
            style={{ background: 'none', border: 'none', outline: 'none', color: T.text, fontSize: '1.25rem', fontWeight: 700, minWidth: 0, flex: '0 1 auto', width: `${Math.max(10, active.title.length)}ch` }}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.14)', color: T.green, borderRadius: 999, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}>
            <Check size={12} /> {saved ? 'Saved' : 'Saving…'}
          </span>
          <span style={{ color: T.textDim, fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Created: {created} • Last updated: {updated}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={() => patchActive({ favorite: !active.favorite })} title="Favorite" style={ghostIcon}>
              <Star size={17} color={active.favorite ? '#eab308' : T.textDim} fill={active.favorite ? '#eab308' : 'none'} />
            </button>
            <button style={{ ...ghostBtn }}><Share2 size={14} /> Share</button>
            <button onClick={() => deleteNote(activeId)} title="Delete note" style={ghostIcon}>
              <Trash2 size={16} color={T.red} />
            </button>
            <button title="More" style={ghostIcon}><MoreHorizontal size={17} color={T.textDim} /></button>
            <button style={{ ...ghostBtn, gap: 6 }}>{accountLabel} <ChevronDown size={13} /></button>
          </div>
        </div>

        {/* Editor scroll area */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 26px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            {dayStats && <SummaryCard pnl={dayStats.pnl} trades={dayStats.trades} winRate={dayStats.winRate} />}

            {/* Everything logged on this day — a refresher of the log-trade form */}
            <TradeRecap trades={dayTrades} />

            {/* Control row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative', flexWrap: 'wrap' }}>
              <button onClick={() => setShowTemplates(s => !s)} style={ghostBtn}><LayoutTemplate size={14} /> Templates</button>
              <button onClick={saveAsTemplate} style={ghostBtn}><Plus size={14} /> Save as template</button>
              <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, background: T.accent, border: 'none', borderRadius: 9, color: '#fff', padding: '8px 16px', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer' }}>
                <Sparkles size={15} /> Write with AI
              </button>
              {showTemplates && (
                <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 20, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 6, minWidth: 220, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', maxHeight: 320, overflowY: 'auto' }}>
                  {customTemplates.length > 0 && (
                    <>
                      <div style={{ color: T.textDim, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px 4px' }}>My templates</div>
                      {customTemplates.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center' }}>
                          <button onClick={() => insertTemplate(t.html)}
                            style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: T.text, fontSize: '0.83rem', padding: '8px 10px', borderRadius: 7, cursor: 'pointer' }}>
                            {t.name}
                          </button>
                          <button onClick={() => deleteTemplate(t.id)} title="Delete template"
                            style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', padding: '6px 8px', display: 'flex' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                      <div style={{ height: 1, background: T.border, margin: '5px 0' }} />
                      <div style={{ color: T.textDim, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 10px 4px' }}>Built-in</div>
                    </>
                  )}
                  {TEMPLATES.map(t => (
                    <button key={t.name} onClick={() => insertTemplate(t.html)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: T.text, fontSize: '0.83rem', padding: '8px 10px', borderRadius: 7, cursor: 'pointer' }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <EditorToolbar
              cmd={cmd} fontSize={fontSize} onFontSize={setFontSize}
              onFullscreen={() => editorElRef.current?.requestFullscreen?.()}
              onMic={() => {}} listening={false}
            />

            <Editor html={active.body} onChange={body => patchActive({ body })} fontSize={fontSize}
              bind={el => { editorElRef.current = el }} />
          </div>
        </div>
      </div>

      <style>{`[contenteditable][data-placeholder]:empty:before{content:attr(data-placeholder);color:${T.textDim};}`}</style>
    </div>
  )
}

const shell = { display: 'flex', height: 'calc(100vh - 128px)', minHeight: 460, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }
const ghostBtn = { display: 'flex', alignItems: 'center', gap: 7, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, padding: '8px 14px', fontSize: '0.82rem', cursor: 'pointer' }
const ghostIcon = { background: 'none', border: 'none', cursor: 'pointer', padding: 5, display: 'flex', borderRadius: 7 }
const primaryBtn = { display: 'flex', alignItems: 'center', gap: 7, background: T.accent, border: 'none', borderRadius: 9, color: '#fff', padding: '9px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }
