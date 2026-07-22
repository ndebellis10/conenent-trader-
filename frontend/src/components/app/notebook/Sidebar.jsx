import { useState } from 'react'
import {
  Search, SlidersHorizontal, ChevronDown, ChevronRight, Plus, MoreHorizontal,
  FileText, Star, LineChart, CalendarDays, Clock, NotebookPen, TrendingUp, Tag,
} from 'lucide-react'
import { FOLDERS, NB_THEME as T, relativeTime } from '../../../lib/notebookStore'

const ICONS = { FileText, Star, LineChart, CalendarDays, Clock, NotebookPen, TrendingUp }

/* Left sidebar: wordmark, search, collapsible folders with counts, and the
   nested note list under an expanded folder. */
export default function Sidebar({
  notes, counts, activeId, onSelect, onNewNote,
  search, onSearch, openFolders, onToggleFolder,
}) {
  const [showAll, setShowAll] = useState({})

  const filtered = notes.filter(n =>
    !search.trim() || (n.title + ' ' + (n.body || '')).toLowerCase().includes(search.toLowerCase())
  )

  const notesIn = folderId => {
    if (folderId === 'all') return filtered
    if (folderId === 'favorites') return filtered.filter(n => n.favorite)
    return filtered.filter(n => n.folderId === folderId)
  }

  return (
    <aside style={{
      width: 280, flexShrink: 0, background: T.panel2, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
    }}>
      {/* Wordmark */}
      <div style={{ padding: '18px 18px 12px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <NotebookPen size={18} color={T.accent} />
        <span style={{ color: T.text, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>Notebook</span>
      </div>

      {/* Search + filter */}
      <div style={{ padding: '0 14px 12px', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: '7px 10px' }}>
          <Search size={14} color={T.textDim} />
          <input
            value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Search notes"
            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: T.text, fontSize: '0.83rem' }}
          />
        </div>
        <button title="Filter" style={iconBtn}><SlidersHorizontal size={15} color={T.textDim} /></button>
      </div>

      {/* Folders + notes */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px 16px' }}>
        {FOLDERS.map(f => {
          const Icon = ICONS[f.icon] || FileText
          const open = openFolders.has(f.id)
          const list = notesIn(f.id)
          const shown = showAll[f.id] ? list : list.slice(0, 18)
          return (
            <div key={f.id} style={{ marginBottom: 2 }}>
              <FolderHeader
                Icon={Icon} label={f.label} count={counts[f.id] ?? 0} open={open}
                onToggle={() => onToggleFolder(f.id)}
                onAdd={() => onNewNote(f.id)}
              />
              {open && (
                <div style={{ margin: '2px 0 6px' }}>
                  {list.length === 0 && (
                    <div style={{ color: T.textDim, fontSize: '0.75rem', padding: '4px 12px 6px 34px' }}>No notes yet</div>
                  )}
                  {shown.map(n => (
                    <NoteRow key={n.id} note={n} active={n.id === activeId} onClick={() => onSelect(n.id)} />
                  ))}
                  {list.length > 18 && !showAll[f.id] && (
                    <button onClick={() => setShowAll(s => ({ ...s, [f.id]: true }))}
                      style={{ background: 'none', border: 'none', color: T.accent, fontSize: '0.76rem', cursor: 'pointer', padding: '4px 12px 4px 34px' }}>
                      Show all {list.length}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Tags section */}
        <div style={{ marginTop: 6 }}>
          <FolderHeader Icon={Tag} label="Tags" count={0} open={false} onToggle={() => {}} onAdd={() => {}} />
        </div>
      </div>
    </aside>
  )
}

function FolderHeader({ Icon, label, count, open, onToggle, onAdd }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: hover ? 'rgba(255,255,255,0.03)' : 'transparent' }}
      onClick={onToggle}
    >
      <span style={{ color: T.textDim, display: 'flex', width: 12 }}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
      <Icon size={15} color={T.textDim} />
      <span style={{ flex: 1, color: T.text, fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
      {hover ? (
        <span style={{ display: 'flex', gap: 2 }}>
          <button onClick={e => { e.stopPropagation(); onAdd() }} title="New note" style={miniBtn}><Plus size={13} color={T.textDim} /></button>
          <button onClick={e => e.stopPropagation()} title="More" style={miniBtn}><MoreHorizontal size={13} color={T.textDim} /></button>
        </span>
      ) : (
        <span style={{ color: T.textDim, fontSize: '0.72rem', minWidth: 18, textAlign: 'right' }}>{count}</span>
      )}
    </div>
  )
}

function NoteRow({ note, active, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
        display: 'block', padding: '8px 12px 8px 22px', borderRadius: 8,
        borderLeft: `2px solid ${active ? T.accent : 'transparent'}`,
        background: active ? 'rgba(59,130,246,0.12)' : hover ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
    >
      <div style={{ color: active ? T.text : '#c7c7cc', fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {note.title || 'Untitled'}
      </div>
      <div style={{ color: T.textDim, fontSize: '0.72rem', marginTop: 2 }}>{relativeTime(note.updated)}</div>
    </button>
  )
}

const iconBtn = { width: 34, background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const miniBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', borderRadius: 5 }
