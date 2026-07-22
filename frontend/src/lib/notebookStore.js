/**
 * Notebook data — folders + notes, stored per account.
 *
 * Local-first (survives on this browser). Notes carry a folderId, rich-text
 * html body, favorite flag, tags, and an optional dateKey (YYYY-MM-DD) that
 * lets the editor pull that day's P&L from the trades store.
 */
// Matches the rest of Covenant Trader — blue accent, the app's dark panels.
export const NB_THEME = {
  bg:       '#1A1A1A',
  panel:    '#242424',
  panel2:   '#1E1E1E',
  border:   '#3A3A3A',
  text:     '#F5F5F5',
  textDim:  '#8A8A90',
  accent:   '#3B82F6',
  green:    '#4CAF7D',
  red:      '#E05252',
}

/* Fixed folders shown in the sidebar. `system` ones can't be deleted. */
export const FOLDERS = [
  { id: 'all',         label: 'All notes',        icon: 'FileText',  system: true },
  { id: 'favorites',   label: 'Favorites',        icon: 'Star',      system: true },
  { id: 'trade-notes', label: 'Trade Notes',      icon: 'LineChart' },
  { id: 'daily',       label: 'Daily Journal',    icon: 'CalendarDays' },
  { id: 'sessions',    label: 'Sessions Recap',   icon: 'Clock' },
  { id: 'my-notes',    label: 'My notes',         icon: 'NotebookPen' },
  { id: 'pre-week',    label: 'pre week analysis', icon: 'TrendingUp' },
]

const key = email => `ct-notebook-v2__${String(email || 'guest').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`

export function loadNotebook(email) {
  try {
    const raw = JSON.parse(localStorage.getItem(key(email)) || 'null')
    if (raw && Array.isArray(raw.notes)) return raw
  } catch { /* fall through */ }
  return { notes: [] }
}

export function saveNotebook(email, data) {
  try { localStorage.setItem(key(email), JSON.stringify(data)) } catch { /* private mode */ }
}

export function newNote(folderId = 'daily') {
  const now = new Date()
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const title = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    folderId,
    body: '',
    favorite: false,
    tags: [],
    dateKey: folderId === 'daily' ? dateKey : null,
    created: now.toISOString(),
    updated: now.toISOString(),
  }
}

/* "a few seconds ago" / "3 min ago" / "2 h ago" / date */
export function relativeTime(iso) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 45) return 'a few seconds ago'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  if (s < 604800) return `${Math.round(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function countsByFolder(notes) {
  const c = { all: notes.length, favorites: notes.filter(n => n.favorite).length }
  for (const f of FOLDERS) {
    if (f.id === 'all' || f.id === 'favorites') continue
    c[f.id] = notes.filter(n => n.folderId === f.id).length
  }
  return c
}
